import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import {
  Invoice,
  InvoiceStatus,
  Prisma,
} from '../../generated/prisma/client';

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
          description: `Rent for ${this.formatPeriod(periodStart, periodEnd)}`,
          amount: rentAmount,
        },
        ...readings.map((reading) => ({
          description: `${reading.meter.meterType} consumption (${reading.unitsConsumed} units @ ${reading.pricePerUnit})`,
          amount: reading.consumptionCost,
          meterReading: { connect: { id: reading.id } },
        })),
      ];

      const invoice = await this.prisma.invoice.create({
        data: {
          unit: { connect: { id: tenancy.unitId } },
          tenancy: { connect: { id: tenancy.id } },
          type: 'RENT',
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

  async findAll(query: QueryInvoicesDto) {
    const {
      unitId,
      tenancyId,
      propertyId,
      status,
      periodStart,
      periodEnd,
      page,
      limit,
    } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where: Prisma.InvoiceWhereInput = {};
    if (unitId) where.unitId = unitId;
    if (tenancyId) where.tenancyId = tenancyId;
    if (propertyId) where.unit = { propertyId };
    if (status) where.status = status;
    if (periodStart || periodEnd) {
      where.periodStart = {
        ...(periodStart ? { gte: periodStart } : {}),
        ...(periodEnd ? { lt: periodEnd } : {}),
      };
    }

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

    const now = new Date();
    const normalized = items.map((invoice) => {
      const effectiveStatus =
        invoice.status === InvoiceStatus.UNPAID &&
        invoice.dueDate < now &&
        Number(invoice.balanceDue) > 0
          ? InvoiceStatus.OVERDUE
          : invoice.status;
      return { ...invoice, status: effectiveStatus };
    });

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

    const now = new Date();
    const effectiveStatus =
      invoice.status === InvoiceStatus.UNPAID &&
      invoice.dueDate < now &&
      Number(invoice.balanceDue) > 0
        ? InvoiceStatus.OVERDUE
        : invoice.status;

    return { ...invoice, status: effectiveStatus };
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

  async refresh(id: string) {
    const current = await this.prisma.invoice.findUnique({
      where: { id },
      select: { id: true, periodStart: true, periodEnd: true },
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

    const rentLineItem = await this.prisma.invoiceLineItem.findFirst({
      where: { invoiceId: id, meterReadingId: null },
    });

    const rentAmount = rentLineItem ? Number(rentLineItem.amount) : 0;
    const consumptionTotal = allReadings.reduce(
      (sum, reading) => sum + Number(reading.consumptionCost),
      0,
    );
    const amount = rentAmount + consumptionTotal;

    await this.prisma.$transaction([
      this.prisma.invoiceLineItem.createMany({
        data: newReadings.map((reading) => ({
          invoiceId: id,
          description: `${reading.meter.meterType} consumption (${reading.unitsConsumed} units @ ${reading.pricePerUnit})`,
          amount: reading.consumptionCost,
          meterReadingId: reading.id,
        })),
      }),
      this.prisma.invoice.update({
        where: { id },
        data: {
          amount: new Prisma.Decimal(amount.toFixed(2)),
          balanceDue: new Prisma.Decimal(amount.toFixed(2)),
        },
      }),
    ]);

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