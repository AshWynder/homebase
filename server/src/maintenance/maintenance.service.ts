import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ALLOWED_IMAGE_TYPES, R2Service } from '../common/storage/r2.service';
import { Role, TicketStatus } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managedPropertyWhere } from '../common/property-scope';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { QueryMaintenanceTicketsDto } from './dto/query-maintenance-tickets.dto';
import { UpdateMaintenanceTicketDto } from './dto/update-maintenance-ticket.dto';
import {
  MAX_TICKET_PHOTOS,
  ticketPhotoPrefix,
} from './maintenance.constants';

/**
 * A multer memory-storage file, narrowed to the fields this service uses.
 * Declared here rather than using `Express.Multer.File` so neither side of the
 * upload boundary depends on the global Express type augmentation.
 */
export interface UploadedPhoto {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

const ticketInclude = {
  unit: {
    include: {
      property: {
        select: {
          id: true,
          name: true,
          address: true,
          ownerId: true,
          caretakerId: true,
        },
      },
    },
  },
  tenant: {
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  },
} as const;

@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
  ) {}

  /**
   * The row is written first so uploads land under the ticket's real id, which
   * Prisma assigns on insert. That makes the key prefix a plain `deletePrefix`
   * target. The failure direction is chosen deliberately: a ticket row that
   * exists with no photos is recoverable and leaves no garbage, whereas a row
   * pointing at files that were never stored is not. So an upload failure rolls
   * the row back rather than leaving it half-built.
   */
  async create(
    dto: CreateMaintenanceTicketDto,
    files: UploadedPhoto[],
    auth: AuthenticatedUser,
  ) {
    const { unitId, tenantId } = await this.resolveParties(dto, auth);
    const photos = this.assertPhotosAcceptable(files);

    // Only a request that actually carries a photo needs object storage. Photos
    // are optional, so a storage outage must not take the whole feature down with
    // it — a tenant reporting a dripping tap can still file that report. The
    // check stays ahead of the insert so a failed upload never leaves an orphan
    // ticket behind.
    if (photos.length > 0 && !this.r2.isConfigured) {
      // A missing storage key is this server's fault, not the caller's, so it
      // must not surface as a 400 — that would point the tenant at a request
      // they cannot fix. The keys are named in the log so the cause is
      // actionable; the response stays generic because env names in an API
      // error are useful to nobody but an operator reading the logs.
      this.logger.error(
        `Maintenance upload rejected — R2 not configured (${this.r2.describeConfiguration()})`,
      );
      throw new ServiceUnavailableException(
        'Photo uploads are temporarily unavailable. Please try again shortly.',
      );
    }

    const ticket = await this.prisma.maintenanceTicket.create({
      data: {
        unitId,
        tenantId,
        description: dto.description,
        status: TicketStatus.OPEN,
      },
      include: ticketInclude,
    });

    if (photos.length === 0) {
      return this.decorate(ticket);
    }

    const prefix = ticketPhotoPrefix(ticket.id);
    const uploadedKeys: string[] = [];

    try {
      for (const photo of photos) {
        const key = this.r2.buildKey(prefix, photo.originalname);
        await this.r2.upload(key, photo.buffer, photo.mimetype);
        uploadedKeys.push(key);
      }

      const saved = await this.prisma.maintenanceTicket.update({
        where: { id: ticket.id },
        data: { photoUrls: uploadedKeys },
        include: ticketInclude,
      });

      return this.decorate(saved);
    } catch (error) {
      try {
        await this.prisma.maintenanceTicket.delete({ where: { id: ticket.id } });
      } catch (rollbackError) {
        this.logger.error(
          `Could not roll back ticket ${ticket.id} after an upload failure: ${String(rollbackError)}`,
        );
      }

      if (uploadedKeys.length > 0) {
        try {
          await this.r2.deleteKeys(uploadedKeys);
        } catch (cleanupError) {
          this.logger.error(
            `Could not remove ${uploadedKeys.length} orphaned object(s) for ticket ${ticket.id}: ${String(cleanupError)}`,
          );
        }
      }

      throw error;
    }
  }

  async findAll(query: QueryMaintenanceTicketsDto, auth: AuthenticatedUser) {
    const { unitId, propertyId, status, tenantId, page, limit } = query;
    const take = limit && limit > 0 ? limit : undefined;
    const skip = page && page > 0 && take ? (page - 1) * take : undefined;

    const where = this.scopedWhere(auth, { unitId, propertyId, status, tenantId });

    const [items, total] = await Promise.all([
      this.prisma.maintenanceTicket.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: ticketInclude,
      }),
      this.prisma.maintenanceTicket.count({ where }),
    ]);

    return {
      items: items.map((ticket) => this.decorate(ticket)),
      total,
      page: page ?? 1,
      limit: take ?? total,
    };
  }

  /**
   * A ticket the caller may not see is reported as missing rather than
   * forbidden: returning 403 would confirm the id exists, which leaks the
   * presence of another landlord's maintenance history.
   */
  async findOne(id: string, auth: AuthenticatedUser) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException(`Maintenance ticket with id "${id}" not found`);
    }

    this.assertCanView(ticket, auth);
    return this.decorate(ticket);
  }

  async update(
    id: string,
    dto: UpdateMaintenanceTicketDto,
    auth: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException(`Maintenance ticket with id "${id}" not found`);
    }

    // Status is a work item on the owner/caretaker side; a tenant reporting a
    // fault does not get to close their own ticket. Tenants are read-only here.
    this.assertCanManage(ticket, auth);

    // Moving into IN_PROGRESS or RESOLVED means work was triaged or finished —
    // the caretaker must say what happened, so a silent status bump is refused.
    const statusChanging = dto.status !== undefined && dto.status !== ticket.status;
    if (
      statusChanging &&
      (dto.status === TicketStatus.IN_PROGRESS ||
        dto.status === TicketStatus.RESOLVED) &&
      !dto.remarks?.trim()
    ) {
      throw new BadRequestException(
        'remarks are required when marking a ticket in progress or resolved',
      );
    }

    // Stamped when the status *changes* to RESOLVED, cleared when it changes
    // away from it. A patch that omits `status` entirely — editing only the
    // description — must leave the timestamp alone, so this is driven by
    // `dto.status` being present rather than by the comparison alone.
    let resolvedAt: Date | null | undefined;
    if (dto.status === TicketStatus.RESOLVED) {
      resolvedAt = ticket.resolvedAt ?? new Date();
    } else if (dto.status && ticket.status === TicketStatus.RESOLVED) {
      resolvedAt = null;
    }

    const updated = await this.prisma.maintenanceTicket.update({
      where: { id },
      data: {
        description: dto.description,
        status: dto.status,
        resolvedAt,
        // Only touched when supplied — a description-only edit leaves the
        // existing note alone.
        remarks: dto.remarks !== undefined ? dto.remarks.trim() || null : undefined,
      },
      include: ticketInclude,
    });

    return this.decorate(updated);
  }

  /**
   * Removes the row and its photos.
   *
   * The row goes first: if the object sweep then fails, the ticket is already
   * gone from the app and the leftover objects are unreachable but harmless,
   * which is the safer failure direction. The reverse order would leave a live
   * ticket whose photos have been deleted.
   */
  async remove(id: string, auth: AuthenticatedUser) {
    const ticket = await this.prisma.maintenanceTicket.findUnique({
      where: { id },
      include: ticketInclude,
    });

    if (!ticket) {
      throw new NotFoundException(`Maintenance ticket with id "${id}" not found`);
    }

    this.assertCanManage(ticket, auth);

    await this.prisma.maintenanceTicket.delete({ where: { id } });

    try {
      const removed = await this.r2.deletePrefix(ticketPhotoPrefix(id));
      return { id, deletedPhotos: removed };
    } catch (error) {
      this.logger.error(
        `Ticket ${id} deleted but its objects could not be removed: ${String(error)}`,
      );
      return { id, deletedPhotos: 0, orphanedObjects: true };
    }
  }

  /**
   * Turns stored keys into absolute URLs on the way out, so the client never
   * has to know the storage host and a host change needs no client release.
   */
  private decorate<
    T extends { id: string; photoUrls: string[] },
  >(ticket: T): Omit<T, 'photoUrls'> & { photoUrls: string[] } {
    const { photoUrls, ...rest } = ticket;
    return {
      ...rest,
      photoUrls: photoUrls.map((key) => this.r2.urlFor(key)),
    };
  }

  /**
   * Decides who is filing and against which unit, and refuses anything the
   * caller is not entitled to.
   */
  private async resolveParties(
    dto: CreateMaintenanceTicketDto,
    auth: AuthenticatedUser,
  ): Promise<{ unitId: string; tenantId: string }> {
    if (auth.profile.role === Role.TENANT) {
      // A tenant can only ever report against their own active tenancy. Any
      // unitId/tenantId in the body is ignored rather than trusted.
      const tenancy = await this.prisma.tenancy.findFirst({
        where: { tenantId: auth.profile.id, isActive: true },
        select: { unitId: true },
      });

      if (!tenancy) {
        throw new BadRequestException(
          'You need an active tenancy to report a maintenance issue',
        );
      }

      return { unitId: tenancy.unitId, tenantId: auth.profile.id };
    }

    // Owner or caretaker filing on a tenant's behalf.
    if (!dto.unitId) {
      throw new BadRequestException('unitId is required when filing for a tenant');
    }
    if (!dto.tenantId) {
      throw new BadRequestException('tenantId is required when filing for a tenant');
    }

    const unit = await this.prisma.unit.findFirst({
      where: { id: dto.unitId, property: managedPropertyWhere(auth) },
      select: { id: true },
    });

    if (!unit) {
      throw new ForbiddenException('You do not have access to that unit');
    }

    const tenancy = await this.prisma.tenancy.findFirst({
      where: { tenantId: dto.tenantId, unitId: dto.unitId },
      select: { id: true },
    });

    if (!tenancy) {
      throw new BadRequestException(
        'That tenant does not occupy the given unit',
      );
    }

    return { unitId: dto.unitId, tenantId: dto.tenantId };
  }

  private assertPhotosAcceptable(files: UploadedPhoto[]): UploadedPhoto[] {
    if (files.length > MAX_TICKET_PHOTOS) {
      throw new BadRequestException(
        `A ticket can have at most ${MAX_TICKET_PHOTOS} photos`,
      );
    }

    for (const file of files) {
      if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) {
        throw new BadRequestException(
          `"${file.originalname}" is not a supported image. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        );
      }
    }

    return files;
  }

  /**
   * Read/write scope for list queries. Every path is intersected with the
   * caller's role, so no combination of filters can widen access.
   */
  private scopedWhere(
    auth: AuthenticatedUser,
    filters: {
      unitId?: string;
      propertyId?: string;
      status?: TicketStatus;
      tenantId?: string;
    },
  ) {
    const { unitId, propertyId, status, tenantId } = filters;

    if (auth.profile.role === Role.TENANT) {
      return {
        tenantId: auth.profile.id,
        ...(unitId ? { unitId } : {}),
        ...(propertyId ? { unit: { propertyId } } : {}),
        ...(status ? { status } : {}),
      };
    }

    // Owner scoping mirrors invoices: unit -> property -> ownerId; caretakers
    // are scoped by their assignment instead.
    const propertyScope = managedPropertyWhere(auth);

    return {
      ...(unitId || propertyId
        ? {
            unit: {
              ...(unitId ? { id: unitId } : {}),
              property: {
                ...(propertyId ? { id: propertyId } : {}),
                ...propertyScope,
              },
            },
          }
        : { unit: { property: propertyScope } }),
      ...(tenantId ? { tenantId } : {}),
      ...(status ? { status } : {}),
    };
  }

  private assertCanView(
    ticket: {
      tenantId: string;
      unit: { property: { ownerId: string; caretakerId: string | null } };
    },
    auth: AuthenticatedUser,
  ): void {
    if (auth.profile.role === Role.TENANT) {
      if (ticket.tenantId !== auth.profile.id) {
        throw new NotFoundException('Maintenance ticket not found');
      }
      return;
    }

    const { ownerId, caretakerId } = ticket.unit.property;
    if (ownerId !== auth.profile.id && caretakerId !== auth.profile.id) {
      throw new NotFoundException('Maintenance ticket not found');
    }
  }

  /**
   * Owners may act on tickets for their properties, caretakers on the
   * properties they are assigned to. Tenants are refused with 403 — the
   * operation is not theirs at all. A caller in the right role reaching a
   * foreign ticket is reported as missing, so the id cannot be probed.
   */
  private assertCanManage(
    ticket: { unit: { property: { ownerId: string; caretakerId: string | null } } },
    auth: AuthenticatedUser,
  ): void {
    if (auth.profile.role !== Role.OWNER && auth.profile.role !== Role.CARETAKER) {
      throw new ForbiddenException(
        'Only the property owner or caretaker can change a ticket',
      );
    }

    const { ownerId, caretakerId } = ticket.unit.property;
    if (ownerId !== auth.profile.id && caretakerId !== auth.profile.id) {
      throw new NotFoundException('Maintenance ticket not found');
    }
  }
}
