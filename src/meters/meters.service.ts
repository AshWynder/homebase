import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { QueryMetersDto } from './dto/query-meters.dto';
import { RecordReadingDto } from './dto/record-reading.dto';
import { MeterType, UtilityMeter } from '../../generated/prisma/client';

@Injectable()
export class MetersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMeterDto): Promise<UtilityMeter> {
    await this.ensureUnitExists(dto.unitId);

    const meterType = dto.meterType ?? MeterType.WATER;

    const existingMeter = await this.prisma.utilityMeter.findUnique({
      where: {
        unitId_meterType: {
          unitId: dto.unitId,
          meterType,
        },
      },
    });

    if (existingMeter) {
      throw new ConflictException(
        `Unit with id "${dto.unitId}" already has a ${meterType} meter`,
      );
    }

    if (dto.meterNumber) {
      await this.ensureMeterNumberAvailable(dto.meterNumber);
    }

    return this.prisma.utilityMeter.create({
      data: {
        unit: { connect: { id: dto.unitId } },
        meterType,
        meterNumber: dto.meterNumber,
        lastReading: dto.lastReading ?? 0,
        pricePerUnit: dto.pricePerUnit,
      },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            blockName: true,
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

  async findAll(query: QueryMetersDto) {
    const { unitId, propertyId, meterType, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where: any = {};
    if (unitId) where.unitId = unitId;
    if (meterType) where.meterType = meterType;
    if (propertyId) {
      where.unit = { propertyId };
    }

    const [items, total] = await Promise.all([
      this.prisma.utilityMeter.findMany({
        where,
        skip,
        take,
        include: {
          unit: {
            select: {
              id: true,
              unitNumber: true,
              blockName: true,
              property: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                },
              },
            },
          },
          _count: {
            select: {
              readings: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.utilityMeter.count({ where }),
    ]);

    return {
      items,
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  async findOne(id: string): Promise<UtilityMeter> {
    const meter = await this.prisma.utilityMeter.findUnique({
      where: { id },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            blockName: true,
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            readings: true,
          },
        },
      },
    });

    if (!meter) {
      throw new NotFoundException(`Meter with id "${id}" not found`);
    }

    return meter;
  }

  async update(id: string, dto: UpdateMeterDto): Promise<UtilityMeter> {
    const current = await this.prisma.utilityMeter.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException(`Meter with id "${id}" not found`);
    }

    if (dto.lastReading !== undefined && dto.lastReading !== current.lastReading) {
      throw new BadRequestException(
        'lastReading cannot be edited directly; it is updated automatically when a reading is recorded',
      );
    }

    const targetMeterType = dto.meterType ?? current.meterType;
    const targetUnitId = dto.unitId ?? current.unitId;

    if (
      (dto.meterType && dto.meterType !== current.meterType) ||
      (dto.unitId && dto.unitId !== current.unitId)
    ) {
      if (dto.unitId && dto.unitId !== current.unitId) {
        await this.ensureUnitExists(dto.unitId);
      }

      const conflict = await this.prisma.utilityMeter.findFirst({
        where: {
          id: { not: id },
          unitId: targetUnitId,
          meterType: targetMeterType,
        },
      });

      if (conflict) {
        throw new ConflictException(
          `Unit with id "${targetUnitId}" already has a ${targetMeterType} meter`,
        );
      }
    }

    if (dto.meterNumber && dto.meterNumber !== current.meterNumber) {
      await this.ensureMeterNumberAvailable(dto.meterNumber, id);
    }

    return this.prisma.utilityMeter.update({
      where: { id },
      data: {
        unit: dto.unitId ? { connect: { id: dto.unitId } } : undefined,
        meterType: dto.meterType,
        meterNumber: dto.meterNumber,
        pricePerUnit: dto.pricePerUnit,
      },
      include: {
        unit: {
          select: {
            id: true,
            unitNumber: true,
            blockName: true,
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

  async remove(id: string): Promise<UtilityMeter> {
    const meter = await this.prisma.utilityMeter.findUnique({
      where: { id },
    });

    if (!meter) {
      throw new NotFoundException(`Meter with id "${id}" not found`);
    }

    return this.prisma.utilityMeter.delete({
      where: { id },
    });
  }

  async recordReading(meterId: string, dto: RecordReadingDto) {
    const meter = await this.prisma.utilityMeter.findUnique({
      where: { id: meterId },
    });

    if (!meter) {
      throw new NotFoundException(`Meter with id "${meterId}" not found`);
    }

    if (dto.currentReading < meter.lastReading) {
      throw new BadRequestException(
        `currentReading (${dto.currentReading}) cannot be less than the meter's lastReading (${meter.lastReading})`,
      );
    }

    const readingDate = dto.readingDate ? new Date(dto.readingDate) : new Date();
    const unitsConsumed = dto.currentReading - meter.lastReading;
    const pricePerUnit = meter.pricePerUnit;
    const consumptionCost = unitsConsumed * Number(pricePerUnit);

    const [reading] = await this.prisma.$transaction([
      this.prisma.meterReading.create({
        data: {
          meter: { connect: { id: meterId } },
          currentReading: dto.currentReading,
          unitsConsumed,
          pricePerUnit,
          consumptionCost,
          readingDate,
        },
      }),
      this.prisma.utilityMeter.update({
        where: { id: meterId },
        data: {
          lastReading: dto.currentReading,
        },
      }),
    ]);

    return reading;
  }

  async findReadings(meterId: string, query: { page?: number; limit?: number }) {
    const meter = await this.prisma.utilityMeter.findUnique({
      where: { id: meterId },
      select: { id: true },
    });

    if (!meter) {
      throw new NotFoundException(`Meter with id "${meterId}" not found`);
    }

    const { page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where = { meterId };

    const [items, total] = await Promise.all([
      this.prisma.meterReading.findMany({
        where,
        skip,
        take,
        orderBy: { readingDate: 'desc' },
      }),
      this.prisma.meterReading.count({ where }),
    ]);

    return {
      items,
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  private async ensureUnitExists(unitId: string): Promise<void> {
    const unit = await this.prisma.unit.findUnique({
      where: { id: unitId },
      select: { id: true },
    });

    if (!unit) {
      throw new NotFoundException(`Unit with id "${unitId}" not found`);
    }
  }

  private async ensureMeterNumberAvailable(
    meterNumber: string,
    excludeMeterId?: string,
  ): Promise<void> {
    const existing = await this.prisma.utilityMeter.findUnique({
      where: { meterNumber },
    });

    if (existing && existing.id !== excludeMeterId) {
      throw new ConflictException(
        `Meter number "${meterNumber}" is already in use`,
      );
    }
  }
}