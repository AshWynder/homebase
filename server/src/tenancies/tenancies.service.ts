import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { QueryTenanciesDto } from './dto/query-tenancies.dto';
import { TerminateTenancyDto } from './dto/terminate-tenancy.dto';
import { Tenancy } from '../../generated/prisma/client';
import { ChatMembershipService } from '../chat/chat-membership.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managedPropertyWhere } from '../common/property-scope';
import { Role } from '../../generated/prisma/enums';

@Injectable()
export class TenanciesService {
  constructor(
    private readonly prisma: PrismaService,
    // Chat group membership follows the tenancy lifecycle, so tenancy writes
    // reach into the chat module rather than duplicating the rule. ChatModule
    // imports only PrismaModule, so this is a one-way dependency — no cycle.
    private readonly membership: ChatMembershipService,
  ) {}

  async create(dto: CreateTenancyDto): Promise<Tenancy> {
    await this.ensureTenantExists(dto.tenantId);
    await this.ensureUnitExists(dto.unitId);

    if (dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    const isActive = dto.isActive ?? true;

    if (isActive) {
      const activeTenancy = await this.prisma.tenancy.findFirst({
        where: {
          unitId: dto.unitId,
          isActive: true,
        },
      });

      if (activeTenancy) {
        throw new ConflictException(
          `Unit with id \"${dto.unitId}\" is already occupied by an active tenancy`,
        );
      }
    }

    const tenancy = await this.prisma.tenancy.create({
      data: {
        tenant: { connect: { id: dto.tenantId } },
        unit: { connect: { id: dto.unitId } },
        rentAmount: dto.rentAmount,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive,
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    // A new resident joins their property's standing group thread. Done after
    // the tenancy is written rather than inside the same transaction so a chat
    // failure cannot roll back a tenancy the owner just created; the group is
    // reconciled on the next open anyway.
    if (tenancy.isActive) {
      await this.membership.addTenantToPropertyGroup(
        tenancy.tenantId,
        tenancy.unit.propertyId,
      );
    }

    return tenancy;
  }

  async findAll(query: QueryTenanciesDto, auth?: AuthenticatedUser) {
    const { tenantId, unitId, propertyId, isActive, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (unitId) where.unitId = unitId;
    if (isActive !== undefined) where.isActive = isActive;
    if (auth?.profile.role === Role.TENANT) {
      where.tenantId = auth.profile.id;
      if (propertyId) {
        where.unit = { propertyId };
      }
    } else if (propertyId || auth) {
      // Scope to the properties the caller manages (owner or caretaker),
      // optionally narrowed to a single property via the propertyId filter.
      where.unit = {
        ...(propertyId ? { propertyId } : {}),
        ...(auth ? { property: managedPropertyWhere(auth) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.tenancy.findMany({
        where,
        skip,
        take,
        include: {
          tenant: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          unit: {
            include: {
              property: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
              // Each unit's meters with only their newest reading date, so the
              // tenants list can show how stale the unit's readings are without
              // a per-row fetch.
              utilityMeters: {
                select: {
                  id: true,
                  meterType: true,
                  meterNumber: true,
                  readings: {
                    orderBy: { readingDate: 'desc' },
                    take: 1,
                    select: { readingDate: true },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.tenancy.count({ where }),
    ]);

    return {
      items: items.map(({ unit, ...tenancy }) => ({
        ...tenancy,
        unit:
          unit == null
            ? unit
            : {
                ...unit,
                utilityMeters: unit.utilityMeters.map(
                  ({ readings, ...meter }) => ({
                    ...meter,
                    lastReadingAt: readings[0]?.readingDate ?? null,
                  }),
                ),
              },
      })),
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  async findOne(id: string): Promise<Tenancy> {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              include: {
                owner: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
                caretaker: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
            },
            utilityMeters: true,
          },
        },
      },
    });

    if (!tenancy) {
      throw new NotFoundException(`Tenancy with id \"${id}\" not found`);
    }

    return tenancy;
  }

  async update(id: string, dto: UpdateTenancyDto): Promise<Tenancy> {
    const current = await this.prisma.tenancy.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException(`Tenancy with id \"${id}\" not found`);
    }

    if (dto.tenantId && dto.tenantId !== current.tenantId) {
      await this.ensureTenantExists(dto.tenantId);
    }

    const targetUnitId = dto.unitId ?? current.unitId;
    if (dto.unitId && dto.unitId !== current.unitId) {
      await this.ensureUnitExists(dto.unitId);
    }

    const targetIsActive =
      dto.isActive !== undefined ? dto.isActive : current.isActive;

    if (targetIsActive) {
      const activeConflict = await this.prisma.tenancy.findFirst({
        where: {
          id: { not: id },
          unitId: targetUnitId,
          isActive: true,
        },
      });

      if (activeConflict) {
        throw new ConflictException(
          `Unit \"${targetUnitId}\" is already occupied by another active tenancy`,
        );
      }
    }

    const targetStartDate = dto.startDate
      ? new Date(dto.startDate)
      : current.startDate;
    const targetEndDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : current.endDate;

    if (targetEndDate && targetEndDate < targetStartDate) {
      throw new BadRequestException('endDate cannot be earlier than startDate');
    }

    return this.prisma.tenancy.update({
      where: { id },
      data: {
        tenant: dto.tenantId ? { connect: { id: dto.tenantId } } : undefined,
        unit: dto.unitId ? { connect: { id: dto.unitId } } : undefined,
        rentAmount: dto.rentAmount,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate:
          dto.endDate !== undefined
            ? dto.endDate
              ? new Date(dto.endDate)
              : null
            : undefined,
        isActive: dto.isActive,
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });
  }

  async terminate(id: string, dto: TerminateTenancyDto): Promise<Tenancy> {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
    });

    if (!tenancy) {
      throw new NotFoundException(`Tenancy with id \"${id}\" not found`);
    }

    const endDate = dto.endDate ? new Date(dto.endDate) : new Date();

    const propertyId = tenancy.unitId
      ? (
          await this.prisma.tenancy.findUniqueOrThrow({
            where: { id },
            select: { unit: { select: { propertyId: true } } },
          })
        ).unit.propertyId
      : null;

    const terminated = await this.prisma.tenancy.update({
      where: { id },
      data: {
        isActive: false,
        endDate,
        terminationReason: dto.reason?.trim() || null,
        terminationNotes: dto.notes?.trim() || null,
        terminationRequestedAt: new Date(),
      },
      include: {
        tenant: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
      },
    });

    // A former resident loses access to the property's group thread. Their
    // direct threads with the landlord and caretaker survive — those are
    // between two people, not with the building.
    if (propertyId) {
      await this.membership.removeFromPropertyGroup(tenancy.tenantId, propertyId);
    }

    return terminated;
  }

  async remove(id: string): Promise<Tenancy> {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
    });

    if (!tenancy) {
      throw new NotFoundException(`Tenancy with id \"${id}\" not found`);
    }

    return this.prisma.tenancy.delete({
      where: { id },
    });
  }

  private async ensureTenantExists(tenantId: string): Promise<void> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { id: tenantId },
      select: { id: true, role: true },
    });

    if (!profile) {
      throw new NotFoundException(
        `Tenant profile with id \"${tenantId}\" not found`,
      );
    }
  }

  private async ensureUnitExists(unitId: string): Promise<void> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id \"${unitId}\" not found`);
    }
  }
}
