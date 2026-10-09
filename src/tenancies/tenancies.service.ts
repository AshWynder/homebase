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

@Injectable()
export class TenanciesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.tenancy.create({
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
  }

  async findAll(query: QueryTenanciesDto) {
    const { tenantId, unitId, propertyId, isActive, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (unitId) where.unitId = unitId;
    if (isActive !== undefined) where.isActive = isActive;
    if (propertyId) {
      where.unit = { propertyId };
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
      items,
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

    return this.prisma.tenancy.update({
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
