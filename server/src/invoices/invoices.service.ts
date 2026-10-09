import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { QueryInvoiceSummaryDto } from './dto/query-invoice-summary.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import {
  Invoice,
  InvoiceLineItemType,
  InvoiceStatus,
  MeterType,
  Prisma,
} from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managedPropertyWhere } from '../common/property-scope';

/** Minimal Prisma surface needed to bill a reading and recalculate totals. */
type InvoiceDb = Pick<Prisma.TransactionClient, 'invoice' | 'invoiceLineItem'>;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(dto: GenerateInvoicesDto) {
    const { periodStart, periodEnd } = this.resolvePeriod(dto);

    const where: Prisma.TenancyWhereInput = {
      isActive: true,
    };
    if (dto.tenancyId) where.id = dto.tenancyId;
    if (dto.propertyId) where.unit = { propertyId: dto.propertyId };

    const tenancies = await this.prisma.tenancy.findMany({
      where,
      include: {
        unit: {
          include: {
            utilityMeters: {
              include: {
                readings: {
                  where: {
                    readingDate: {
                      gte: periodStart,
                      lt: periodEnd,
                    },
                  },
                  orderBy: { readingDate: 'asc' },
                  include: {
                    meter: {
                      select: {
                        id: true,
                        meterType: true,
                        meterNumber: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (tenancies.length === 0) {
      return { items: [], total: 0, skipped: 0 };
    }

    const created: Invoice[] = [];
    const skipped: string[] = [];

    for (const tenancy of tenancies) {
      const existing = await this.prisma.invoice.findUnique({
        where: {
          tenancyId_periodStart: {
            tenancyId: tenancy.id,
            periodStart,
          },
        },
        select: { id: true },
      });

      if (existing) {
        skipped.push(tenancy.id);
        continue;
      }

      const readings = tenancy.unit.utilityMeters.flatMap(
        (meter) => meter.readings,
      );

      const rentAmount = tenancy.rentAmount;
      const consumptionTotal = readings.reduce(
        (sum, reading) => sum + Number(reading.consumptionCost),
        0,
      );
      const amount = Number(rentAmount) + consumptionTotal;

      const lineItems: Prisma.InvoiceLineItemCreateWithoutInvoiceInput[] = [
        {
          type: InvoiceLineItemType.RENT,
          description: `Rent for ${this.formatPeriod(periodStart, periodEnd)}`,
          amount: rentAmount,
        },
        ...readings.map((reading) => ({
          type: InvoiceLineItemType.WATER,
          description: `${reading.meter.meterType} consumption (${reading.unitsConsumed} units @ ${reading.pricePerUnit})`,
          amount: reading.consumptionCost,
          meterReading: { connect: { id: reading.id } },
        })),
      ];

      const invoice = await this.prisma.invoice.create({
        data: {
          unit: { connect: { id: tenancy.unitId } },
          tenancy: { connect: { id: tenancy.id } },
          periodStart,
          periodEnd,
          amount: new Prisma.Decimal(amount.toFixed(2)),
          balanceDue: new Prisma.Decimal(amount.toFixed(2)),
          dueDate: this.computeDueDate(periodStart),
          status: InvoiceStatus.UNPAID,
          lineItems: {
            create: lineItems,
          },
        },
        include: {
          lineItems: true,
          tenancy: {
            include: {
              tenant: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          unit: {
            include: {
              property: {
                select: { id: true, name: true, address: true },
              },
            },
          },
        },
      });

      created.push(invoice);
    }

    return {
      items: created,
      total: created.length,
      skipped: skipped.length,
    };
  }

  async findAll(query: QueryInvoicesDto, auth?: AuthenticatedUser) {
    const { page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;
    const where = this.buildOwnerScopedWhere(query, auth);

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: {
          lineItems: true,
          payments: {
            where: { status: 'SUCCESS' },
            orderBy: { createdAt: 'desc' },
          },
          tenancy: {
            include: {
              tenant: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true },
                  },
                },
              },
            },
          },
          unit: {
            include: {
              property: {
                select: { id: true, name: true, address: true },
              },
            },
          },
        },
        orderBy: { periodStart: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const normalized = items.map((invoice) => ({
      ...invoice,
      status: this.effectiveInvoiceStatus(invoice),
    }));

    return {
      items: normalized,
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          include: {
            meterReading: {
              include: {
                meter: {
                  select: {
                    id: true,
                    meterType: true,
                    meterNumber: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        tenancy: {
          include: {
            tenant: {
              include: {
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              select: { id: true, name: true, address: true },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    return { ...invoice, status: this.effectiveInvoiceStatus(invoice) };
  }

  /**
   * Money totals for the owner's dashboard, split the same way the invoice list
   * groups rows so the summary tiles and the list below them always agree.
   *
   * A stored status cannot simply be grouped on: `generate` writes UNPAID and
   * nothing recalculates it until a payment lands, so every invoice that has
   * gone past its due date is *displayed* as OVERDUE (see
   * `effectiveInvoiceStatus`) while still being *stored* as UNPAID. Grouping on
   * the raw column would therefore report overdue money as unpaid. Each bucket
   * below is instead spelled out as a predicate that reproduces
   * `effectiveInvoiceStatus` exactly, and the four predicates are mutually
   * exclusive and exhaustive.
   */
  async summary(query: QueryInvoiceSummaryDto, auth?: AuthenticatedUser) {
    const scope = this.buildOwnerScopedWhere(query, auth);
    const now = new Date();

    // Mirrors effectiveInvoiceStatus: only an invoice with an open balance past
    // its due date reads as OVERDUE. The UNPAID bucket is the exact complement
    // so the two cannot both claim the same row.
    const overdue: Prisma.InvoiceWhereInput = {
      ...scope,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] },
      balanceDue: { gt: 0 },
      dueDate: { lt: now },
    };
    const unpaid: Prisma.InvoiceWhereInput = {
      ...scope,
      status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE] },
      OR: [{ dueDate: { gte: now } }, { balanceDue: { lte: 0 } }],
    };

    const [unpaidAgg, overdueAgg, partialAgg, paidAgg, totalsAgg] =
      await this.prisma.$transaction([
        this.prisma.invoice.aggregate({
          where: unpaid,
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.invoice.aggregate({
          where: overdue,
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.invoice.aggregate({
          where: { ...scope, status: InvoiceStatus.PARTIALLY_PAID },
          _count: { _all: true },
          _sum: { balanceDue: true },
        }),
        this.prisma.invoice.aggregate({
          where: { ...scope, status: InvoiceStatus.PAID },
          _count: { _all: true },
          // A settled invoice has balanceDue 0, so the collected figure has to
          // come from amount for the PAID bucket to show anything but "0".
          _sum: { amount: true },
        }),
        this.prisma.invoice.aggregate({
          where: scope,
          _sum: { amount: true, balanceDue: true },
        }),
      ]);

    return {
      byStatus: {
        UNPAID: this.toStatusSummary(unpaidAgg._count._all, unpaidAgg._sum.balanceDue),
        OVERDUE: this.toStatusSummary(overdueAgg._count._all, overdueAgg._sum.balanceDue),
        PARTIALLY_PAID: this.toStatusSummary(
          partialAgg._count._all,
          partialAgg._sum.balanceDue,
        ),
        PAID: this.toStatusSummary(paidAgg._count._all, paidAgg._sum.amount),
      },
      totals: {
        billed: this.toAmount(totalsAgg._sum.amount),
        outstanding: this.toAmount(totalsAgg._sum.balanceDue),
      },
    };
  }

  /**
   * Scope shared by the list and the summary, so the two can never disagree
   * about which invoices belong to the caller. Owners see their properties;
   * caretakers see the ones they are assigned to.
   */
  private buildOwnerScopedWhere(
    query: {
      unitId?: string;
      tenancyId?: string;
      propertyId?: string;
      status?: InvoiceStatus;
      periodStart?: Date;
      periodEnd?: Date;
    },
    auth?: AuthenticatedUser,
  ): Prisma.InvoiceWhereInput {
    const { unitId, tenancyId, propertyId, status, periodStart, periodEnd } = query;
    const where: Prisma.InvoiceWhereInput = {};
    if (unitId) where.unitId = unitId;
    if (tenancyId) where.tenancyId = tenancyId;
    if (status) where.status = status;
    if (periodStart || periodEnd) {
      where.periodStart = {
        ...(periodStart ? { gte: periodStart } : {}),
        ...(periodEnd ? { lt: periodEnd } : {}),
      };
    }

    // If tenancyId or unitId is explicitly provided (e.g. from tenant query or owner drilldown),
    // respect it. If auth is provided and tenancyId is NOT provided, scope by property.
    if (auth && !tenancyId) {
      const propertyScope = managedPropertyWhere(auth);
      if (propertyId) {
        where.unit = {
          propertyId,
          property: propertyScope,
        };
      } else {
        where.unit = {
          property: propertyScope,
        };
      }
    } else if (propertyId) {
      where.unit = { propertyId };
    }

    return where;
  }

  /**
   * The status an invoice should be *shown* as. An invoice whose due date has
   * passed with a balance still open reads as OVERDUE even when its stored
   * status has not been recalculated since. Every read path applies this so
   * list, detail and summary agree.
   */
  private effectiveInvoiceStatus(invoice: {
    status: InvoiceStatus;
    dueDate: Date;
    balanceDue: Prisma.Decimal | number;
  }): InvoiceStatus {
    const isOverdue =
      invoice.status === InvoiceStatus.UNPAID &&
      invoice.dueDate < new Date() &&
      Number(invoice.balanceDue) > 0;
    return isOverdue ? InvoiceStatus.OVERDUE : invoice.status;
  }

  private toStatusSummary(count: number, total: Prisma.Decimal | null) {
    return { count, total: this.toAmount(total) };
  }

  /** Money is returned as a string so precision survives JSON, as elsewhere. */
  private toAmount(value: Prisma.Decimal | null): string {
    return value === null ? '0.00' : value.toFixed(2);
  }

  async update(id: string, dto: { dueDate?: Date }) {
    const current = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    const invoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        dueDate: dto.dueDate,
      },
      include: {
        lineItems: true,
        payments: true,
      },
    });

    return this.recomputeStatus(invoice);
  }

  /**
   * Resolves the invoice covering a reading date for a unit and makes sure it
   * can still take utility charges. A reading may only be billed to a month that
   * already has an invoice, and never to an invoice that has been settled.
   */
  async assertInvoiceAcceptsReading(params: { unitId: string; readingDate: Date }) {
    const { unitId, readingDate } = params;
    const period = this.formatMonth(readingDate);

    const [unit, invoice] = await Promise.all([
      this.prisma.unit.findUnique({
        where: { id: unitId },
        select: {
          unitNumber: true,
          blockName: true,
          property: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findFirst({
        where: {
          unitId,
          periodStart: { lte: readingDate },
          periodEnd: { gt: readingDate },
        },
        orderBy: { periodStart: 'desc' },
        select: { id: true, status: true, periodStart: true, periodEnd: true },
      }),
    ]);

    const unitLabel = unit ? this.unitLabel(unit) : `unit "${unitId}"`;

    if (!invoice) {
      throw new ConflictException(
        `No invoice has been generated for ${unitLabel} for ${period}. ` +
          `Generate the ${period} invoice first, then record the meter reading.`,
      );
    }

    const totals = await this.computeInvoiceTotals(this.prisma, invoice.id);
    if (invoice.status === InvoiceStatus.PAID || totals.balanceDue <= 0) {
      throw new ConflictException(
        `The invoice for ${unitLabel} for ${period} has already been paid in full. ` +
          `Record this reading against a later period, or raise a new invoice, before adding utility charges.`,
      );
    }

    return invoice;
  }

  /**
   * Bills a recorded meter reading onto an invoice as a line item and re-derives
   * the invoice totals. Runs on the caller's transaction client so the reading
   * and its invoice line item are always written together. Re-billing a reading
   * is a no-op, which keeps repeated syncs idempotent.
   */
  async applyReadingToInvoice(
    db: InvoiceDb,
    params: {
      invoiceId: string;
      reading: {
        id: string;
        unitsConsumed: number;
        pricePerUnit: Prisma.Decimal | number;
        consumptionCost: Prisma.Decimal | number;
        meter: { id: string; meterType: MeterType; meterNumber: string | null };
      };
    },
  ) {
    const { invoiceId, reading } = params;

    const alreadyBilled = await db.invoiceLineItem.findUnique({
      where: { meterReadingId: reading.id },
      select: { id: true },
    });
    if (alreadyBilled) {
      return;
    }

    await db.invoiceLineItem.create({
      data: {
        invoiceId,
        type: this.lineItemTypeFor(reading.meter.meterType),
        description: `${reading.meter.meterType} consumption (${reading.unitsConsumed} units @ ${reading.pricePerUnit})`,
        amount: new Prisma.Decimal(Number(reading.consumptionCost).toFixed(2)),
        meterReadingId: reading.id,
      },
    });

    await this.recalculateInvoiceTotals(db, invoiceId);
  }

  async refresh(id: string) {
    const current = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true, periodStart: true, periodEnd: true },
    });

    if (!current) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lineItems: {
          where: { meterReadingId: { not: null } },
          select: { id: true, meterReadingId: true },
        },
        unit: {
          select: {
            unitNumber: true,
            blockName: true,
            property: { select: { name: true } },
          },
        },
        tenancy: {
          include: {
            unit: {
              include: {
                utilityMeters: {
                  include: {
                    readings: {
                      where: {
                        readingDate: {
                          gte: current.periodStart,
                          lt: current.periodEnd,
                        },
                      },
                      orderBy: { readingDate: 'asc' },
                      include: {
                        meter: {
                          select: {
                            id: true,
                            meterType: true,
                            meterNumber: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with id "${id}" not found`);
    }

    const existingReadingIds = new Set(
      invoice.lineItems
        .map((li) => li.meterReadingId)
        .filter((rid): rid is string => rid !== null),
    );

    const allReadings = invoice.tenancy.unit.utilityMeters.flatMap(
      (meter) => meter.readings,
    );
    const newReadings = allReadings.filter(
      (reading) => !existingReadingIds.has(reading.id),
    );

    if (newReadings.length === 0) {
      return this.findOne(id);
    }

    if (current.status === InvoiceStatus.PAID) {
      const period = this.formatMonth(current.periodStart);
      throw new ConflictException(
        `The invoice for ${this.unitLabel(invoice.unit)} for ${period} has already been paid in full, ` +
          `so ${newReadings.length} unbilled meter reading(s) cannot be added to it. ` +
          `Record them against a later period instead.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      for (const reading of newReadings) {
        await this.applyReadingToInvoice(tx, {
          invoiceId: id,
          reading: {
            id: reading.id,
            unitsConsumed: reading.unitsConsumed,
            pricePerUnit: reading.pricePerUnit,
            consumptionCost: reading.consumptionCost,
            meter: reading.meter,
          },
        });
      }
    });

    return this.findOne(id);
  }

  private resolvePeriod(dto: GenerateInvoicesDto): {
    periodStart: Date;
    periodEnd: Date;
  } {
    if (dto.periodStart) {
      const start = new Date(dto.periodStart);
      if (isNaN(start.getTime())) {
        throw new BadRequestException('periodStart must be a valid date');
      }
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      return { periodStart: start, periodEnd: end };
    }

    const now = new Date();
    const year = dto.year ?? now.getFullYear();
    const month = dto.month ?? now.getMonth() + 1;

    if (month < 1 || month > 12) {
      throw new BadRequestException('month must be between 1 and 12');
    }

    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 1);
    return { periodStart, periodEnd };
  }

  private computeDueDate(periodStart: Date): Date {
    const due = new Date(periodStart);
    due.setDate(5);
    return due;
  }

  private formatPeriod(start: Date, end: Date): string {
    const month = start.toLocaleString('en', { month: 'long' });
    const year = start.getFullYear();
    return `${month} ${year}`;
  }

  private formatMonth(date: Date): string {
    return date.toLocaleString('en', { month: 'long', year: 'numeric' });
  }

  private unitLabel(unit: {
    unitNumber: string;
    blockName: string | null;
    property: { name: string };
  }): string {
    const rawBlock = unit.blockName?.trim();
    // blockName may be stored as "Block A" or simply "A".
    const block = rawBlock
      ? `, ${/^block\b/i.test(rawBlock) ? rawBlock : `Block ${rawBlock}`}`
      : '';
    return `Unit ${unit.unitNumber}${block} (${unit.property.name})`;
  }

  private lineItemTypeFor(meterType: MeterType): InvoiceLineItemType {
    return meterType === MeterType.ELECTRICITY
      ? InvoiceLineItemType.ELECTRICITY
      : InvoiceLineItemType.WATER;
  }

  /**
   * Derives the money on an invoice from its line items and successful payments,
   * so previously applied payments are never lost when charges are added.
   */
  private async computeInvoiceTotals(
    db: Pick<Prisma.TransactionClient, 'invoice'>,
    invoiceId: string,
  ) {
    const invoice = await db.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: {
        dueDate: true,
        lineItems: { select: { amount: true } },
        payments: { where: { status: 'SUCCESS' }, select: { amount: true } },
      },
    });

    const amount = invoice.lineItems.reduce(
      (sum, line) => sum + Number(line.amount),
      0,
    );
    const paid = invoice.payments.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    const balanceDue = Math.max(Number((amount - paid).toFixed(2)), 0);

    let status: InvoiceStatus;
    if (balanceDue <= 0) {
      status = InvoiceStatus.PAID;
    } else if (paid > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    } else if (invoice.dueDate < new Date()) {
      status = InvoiceStatus.OVERDUE;
    } else {
      status = InvoiceStatus.UNPAID;
    }

    return { amount, paid, balanceDue, status };
  }

  private async recalculateInvoiceTotals(
    db: Pick<Prisma.TransactionClient, 'invoice'>,
    invoiceId: string,
  ) {
    const totals = await this.computeInvoiceTotals(db, invoiceId);

    return db.invoice.update({
      where: { id: invoiceId },
      data: {
        amount: new Prisma.Decimal(totals.amount.toFixed(2)),
        balanceDue: new Prisma.Decimal(totals.balanceDue.toFixed(2)),
        status: totals.status,
      },
    });
  }

  /**
   * Applies a successful payment to an invoice within a single transaction:
   * records the decrement of balanceDue and recomputes the invoice status.
   * Called by PaymentsService when a provider confirms a payment.
   */
  async applySuccessfulPayment(payment: {
    id: string;
    invoiceId: string;
    amount: Prisma.Decimal;
  }) {
    await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: payment.invoiceId },
      });

      if (!invoice) {
        throw new NotFoundException(
          `Invoice with id "${payment.invoiceId}" not found`,
        );
      }

      const newBalance = Number(invoice.balanceDue) - Number(payment.amount);

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          balanceDue: new Prisma.Decimal(Math.max(newBalance, 0).toFixed(2)),
        },
      });

      const status: InvoiceStatus =
        newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      if (status !== updated.status) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status },
        });
      }
    });
  }

  private async recomputeStatus(invoice: {
    id: string;
    amount: Prisma.Decimal;
    balanceDue: Prisma.Decimal;
    dueDate: Date;
    status: InvoiceStatus;
    payments?: { status: string; amount: Prisma.Decimal }[];
  }) {
    const paidTotal = (invoice.payments ?? [])
      .filter((p) => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const amount = Number(invoice.amount);
    const balanceDue = Number(invoice.balanceDue);
    const now = new Date();

    let status: InvoiceStatus;
    if (balanceDue <= 0) {
      status = InvoiceStatus.PAID;
    } else if (paidTotal > 0) {
      status = InvoiceStatus.PARTIALLY_PAID;
    } else if (invoice.dueDate < now) {
      status = InvoiceStatus.OVERDUE;
    } else {
      status = InvoiceStatus.UNPAID;
    }

    if (status !== invoice.status) {
      return this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status },
        include: {
          lineItems: true,
          payments: true,
        },
      });
    }

    return invoice;
  }
}