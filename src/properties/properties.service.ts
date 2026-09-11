import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from '../../generated/prisma/client';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePropertyDto): Promise<Property> {
    return this.prisma.property.create({
      data: {
        name: dto.name,
        address: dto.address,
        owner: { connect: { id: dto.ownerId } },
        caretaker: dto.caretakerId
          ? { connect: { id: dto.caretakerId } }
          : undefined,
      },
    });
  }

  async findAll(page?: number, limit?: number): Promise<Property[]> {
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    return this.prisma.property.findMany({
      skip,
      take,
      include: {
        owner: true,
        caretaker: true,
      },
    });
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        caretaker: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }

    return property;
  }

  async update(id: string, dto: UpdatePropertyDto): Promise<Property> {
    await this.ensurePropertyExists(id);

    return this.prisma.property.update({
      where: { id },
      data: {
        name: dto.name,
        address: dto.address,
        owner: dto.ownerId ? { connect: { id: dto.ownerId } } : undefined,
        caretaker: dto.caretakerId
          ? { connect: { id: dto.caretakerId } }
          : dto.caretakerId === null
            ? { disconnect: true }
            : undefined,
      },
    });
  }

  async remove(id: string): Promise<Property> {
    await this.ensurePropertyExists(id);

    return this.prisma.property.delete({
      where: { id },
    });
  }

  private async ensurePropertyExists(id: string): Promise<void> {
    const property = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with id "${id}" not found`);
    }
  }
}
