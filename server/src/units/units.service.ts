import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitsDto } from './dto/query-units.dto';
import { Unit } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managesProperty, managedPropertyWhere } from '../common/property-scope';

@Injectable()
export class UnitsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUnitDto): Promise<Unit> {
    await this.ensurePropertyExists(dto.propertyId);

    const existingUnit = await this.prisma.unit.findFirst({
      where: {
        propertyId: dto.propertyId,
        unitNumber: dto.unitNumber,
      },
    });

    if (existingUnit) {
      throw new ConflictException(
        `Unit \"${dto.unitNumber}\" already exists in this property`,
      );
    }

    return this.prisma.unit.create({
      data: {
        unitNumber: dto.unitNumber,
        blockName: dto.blockName,
        property: { connect: { id: dto.propertyId } },
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async findAll(query: QueryUnitsDto, auth?: AuthenticatedUser) {
    const { propertyId, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where: any = {};
    if (propertyId) where.propertyId = propertyId;
    if (auth) {
      // Intersect with the properties the caller manages so a propertyId
      // filter can never widen access.
      where.property = managedPropertyWhere(auth);
    }

    const [items, total] = await Promise.all([
      this.prisma.unit.findMany({
        where,
        skip,
        take,
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
          tenancies: {
            where: { isActive: true },
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
            },
          },
          _count: {
            select: {
              utilityMeters: true,
              maintenanceTickets: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.unit.count({ where }),
    ]);

    return {
      items,
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  async findOne(id: string, auth?: AuthenticatedUser): Promise<Unit> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
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
        tenancies: {
          orderBy: { startDate: 'desc' },
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
          },
        },
        utilityMeters: {
          include: {
            readings: {
              orderBy: { readingDate: 'desc' },
              take: 5,
            },
          },
        },
        maintenanceTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // A unit outside the caller's properties is reported as missing rather
    // than forbidden, so the id cannot be probed for existence.
    if (
      !unit ||
      (auth && !managesProperty(auth, unit.property))
    ) {
      throw new NotFoundException(`Unit with id \"${id}\" not found`);
    }

    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<Unit> {
    const currentUnit = await this.prisma.unit.findUnique({
      where: { id },
    });

    if (!currentUnit) {
      throw new NotFoundException(`Unit with id \"${id}\" not found`);
    }

    const targetPropertyId = dto.propertyId ?? currentUnit.propertyId;
    const targetUnitNumber = dto.unitNumber ?? currentUnit.unitNumber;

    if (dto.propertyId && dto.propertyId !== currentUnit.propertyId) {
      await this.ensurePropertyExists(dto.propertyId);
    }

    if (
      targetPropertyId !== currentUnit.propertyId ||
      targetUnitNumber !== currentUnit.unitNumber
    ) {
      const duplicate = await this.prisma.unit.findFirst({
        where: {
          id: { not: id },
          propertyId: targetPropertyId,
          unitNumber: targetUnitNumber,
        },
      });

      if (duplicate) {
        throw new ConflictException(
          `Unit \"${targetUnitNumber}\" already exists in property with id \"${targetPropertyId}\"`,
        );
      }
    }

    return this.prisma.unit.update({
      where: { id },
      data: {
        unitNumber: dto.unitNumber,
        blockName: dto.blockName,
        property: dto.propertyId
          ? { connect: { id: dto.propertyId } }
          : undefined,
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
  }

  async remove(id: string): Promise<Unit> {
    const unit = await this.prisma.unit.findUnique({
      where: { id },
      include: {
        tenancies: {
          where: { isActive: true },
        },
      },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id \"${id}\" not found`);
    }

    if (unit.tenancies.length > 0) {
      throw new ConflictException(
        `Cannot delete unit \"${unit.unitNumber}\" because it currently has an active tenancy`,
      );
    }

    return this.prisma.unit.delete({
      where: { id },
    });
  }

  async findByPropertyId(
    propertyId: string,
    auth?: AuthenticatedUser,
  ): Promise<Unit[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerId: true, caretakerId: true },
    });

    if (!property || (auth && !managesProperty(auth, property))) {
      throw new NotFoundException(
        `Property with id \"${propertyId}\" not found`,
      );
    }

    return this.prisma.unit.findMany({
      where: { propertyId },
      include: {
        tenancies: {
          where: { isActive: true },
        },
        utilityMeters: true,
      },
      orderBy: { unitNumber: 'asc' },
    });
  }

  private async ensurePropertyExists(propertyId: string): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException(
        `Property with id \"${propertyId}\" not found`,
      );
    }
  }
}
