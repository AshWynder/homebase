import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { NoticeAudience, Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { managedPropertyWhere } from '../common/property-scope';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { QueryNoticesDto } from './dto/query-notices.dto';

/** `{ ownerId }` for an owner, `{ caretakerId }` for a caretaker. */
type PropertyScope = { ownerId: string } | { caretakerId: string };

/**
 * The relations both caller types need in order to render a notice. `property`
 * is null for a portfolio-wide notice.
 */
const noticeInclude = {
  property: { select: { id: true, name: true, address: true } },
  author: {
    include: { user: { select: { id: true, name: true, email: true } } },
  },
} as const;

/**
 * A notice body is long, so the owner list defaults to a smaller page than the
 * user directory does.
 */
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

@Injectable()
export class NoticesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the audience to concrete recipients, then writes the notice and its
   * recipients in a single nested create.
   *
   * A notice is a point-in-time announcement rather than a standing mailing
   * list: the recipient rows are resolved here and never recomputed, so a tenant
   * who moves into a property after a notice was sent does not receive it. That
   * is what keeps `isRead` unambiguous — it means "read this notice", not "read
   * the notices that currently apply to you".
   *
   * The nested create is used instead of a transaction because the notice and
   * its delivery list must never be partially written: Prisma issues it as a
   * single statement, so a notice can never exist with nobody addressed.
   */
  async create(dto: CreateNoticeDto, auth: AuthenticatedUser) {
    // Checked before the audience is resolved so a tenant's request never
    // reaches the tenancy scan.
    if (
      auth.profile.role !== Role.OWNER &&
      auth.profile.role !== Role.CARETAKER
    ) {
      throw new ForbiddenException(
        'Only property owners and caretakers can send notices',
      );
    }

    const recipientIds = await this.resolveRecipients(dto, auth);

    const notice = await this.prisma.notice.create({
      data: {
        title: dto.title,
        message: dto.message,
        audience: dto.audience,
        propertyId:
          dto.audience === NoticeAudience.PROPERTY ? dto.propertyId! : null,
        authorId: auth.profile.id,
        recipients: {
          create: recipientIds.map((tenantId) => ({ tenantId })),
        },
      },
      include: {
        ...noticeInclude,
        recipients: { select: { id: true, tenantId: true, isRead: true } },
      },
    });

    return {
      ...this.withoutRecipients(notice),
      recipientCount: notice.recipients.length,
      readCount: notice.recipients.filter((recipient) => recipient.isRead)
        .length,
      // The sender already knows who they addressed, so nothing is withheld
      // from them beyond the identities the roster already shows.
      recipients: notice.recipients,
    };
  }

  /**
   * The list means two different things depending on who is asking: the notices
   * an owner sent, or the notices a tenant received. Both are returned in the
   * envelope the client's Paginated<T> expects.
   */
  async findAll(query: QueryNoticesDto, auth: AuthenticatedUser) {
    const { propertyId, audience, unreadOnly, page, limit } = query;
    const take = Math.min(limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const skip = (Math.max(page ?? 1, 1) - 1) * take;
    const currentPage = Math.max(page ?? 1, 1);

    if (auth.profile.role === Role.TENANT) {
      return this.findReceived(query, skip, take, currentPage, auth);
    }

    const where = {
      authorId: auth.profile.id,
      // A property filter matches notices addressed to that specific property. A
      // portfolio-wide notice has no property, so it is left out rather than
      // being presented as though it belonged to the selected property.
      ...(propertyId ? { propertyId } : {}),
      ...(audience ? { audience } : {}),
    };

    const [notices, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          ...noticeInclude,
          // Read totals for the owner's per-row summary. Filtered here rather
          // than assembled client-side, so the numbers stay honest no matter
          // how large the audience was.
          recipients: { select: { id: true, tenantId: true, isRead: true } },
        },
      }),
      this.prisma.notice.count({ where }),
    ]);

    return {
      items: notices.map((notice) => ({
        ...this.withoutRecipients(notice),
        recipientCount: notice.recipients.length,
        readCount: notice.recipients.filter((recipient) => recipient.isRead)
          .length,
      })),
      total,
      page: currentPage,
      limit: take,
    };
  }

  /**
   * A tenant's inbox, scoped to their own recipient rows. The tenant id is never
   * accepted as input, mirroring how the maintenance list derives the unit from
   * the authenticated profile — there is no query param that could widen this.
   */
  private async findReceived(
    query: QueryNoticesDto,
    skip: number,
    take: number,
    page: number,
    auth: AuthenticatedUser,
  ) {
    const me = auth.profile.id;
    const readFilter = query.unreadOnly ? { isRead: false } : {};

    const where = { recipients: { some: { tenantId: me, ...readFilter } } };

    const [notices, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          ...noticeInclude,
          // Only the caller's own receipt, so their read state can be flattened
          // and nobody else's is ever loaded into the response.
          recipients: {
            where: { tenantId: me },
            select: { id: true, isRead: true, readAt: true },
          },
        },
      }),
      this.prisma.noticeRecipient.count({
        where: { tenantId: me, ...readFilter },
      }),
    ]);

    return {
      items: notices.map((notice) => {
        const receipt = notice.recipients[0];
        return {
          ...this.withoutRecipients(notice),
          isRead: receipt?.isRead ?? false,
          readAt: receipt?.readAt ?? null,
        };
      }),
      total,
      page,
      limit: take,
    };
  }

  /**
   * A single number for the tenant's home bell dot and the activity badge. The
   * unread receipt is counted directly rather than derived from a page of
   * notices, which would under-report anything not yet fetched.
   */
  async countUnread(auth: AuthenticatedUser) {
    if (auth.profile.role !== Role.TENANT) {
      throw new ForbiddenException('Only tenants have an unread notice count');
    }

    return this.prisma.noticeRecipient.count({
      where: { tenantId: auth.profile.id, isRead: false },
    });
  }

  async findOne(id: string, auth: AuthenticatedUser) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      include: {
        ...noticeInclude,
        recipients: {
          select: { id: true, tenantId: true, isRead: true, readAt: true },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with id "${id}" not found`);
    }

    if (auth.profile.role === Role.TENANT) {
      const receipt = notice.recipients.find(
        (entry) => entry.tenantId === auth.profile.id,
      );

      // A notice the caller was not addressed is reported as missing rather
      // than forbidden, so the id cannot be used to confirm that a notice they
      // were not sent exists.
      if (!receipt) {
        throw new NotFoundException(`Notice with id "${id}" not found`);
      }

      // The recipient list is dropped here: who else a notice went to is not
      // the tenant's to see.
      return {
        ...this.withoutRecipients(notice),
        isRead: receipt.isRead,
        readAt: receipt.readAt,
      };
    }

    this.assertAuthor(notice, auth);

    return notice;
  }

  /**
   * Records that the tenant has opened the notice.
   *
   * The write targets the caller's own receipt row rather than the notice, so
   * marking one notice read cannot alter anyone else's read state. Idempotent:
   * re-opening a notice keeps the first read timestamp instead of resetting it,
   * so the time reflects when the tenant actually first saw it.
   */
  async markRead(id: string, auth: AuthenticatedUser) {
    if (auth.profile.role !== Role.TENANT) {
      throw new ForbiddenException(
        'Only the recipient can mark a notice as read',
      );
    }

    const receipt = await this.prisma.noticeRecipient.findFirst({
      where: { noticeId: id, tenantId: auth.profile.id },
      select: { id: true, isRead: true, readAt: true },
    });

    if (!receipt) {
      throw new NotFoundException(`Notice with id "${id}" not found`);
    }

    if (receipt.isRead) {
      return receipt;
    }

    return this.prisma.noticeRecipient.update({
      where: { id: receipt.id },
      data: { isRead: true, readAt: new Date() },
      select: { id: true, isRead: true, readAt: true },
    });
  }

  /**
   * Hard delete, matching the rest of the codebase — there is no soft-delete
   * pattern here. The receipt rows go with it via the schema's onDelete: Cascade,
   * so there is no separate sweep to get wrong.
   */
  async remove(id: string, auth: AuthenticatedUser) {
    const notice = await this.prisma.notice.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with id "${id}" not found`);
    }

    this.assertAuthor(notice, auth);

    await this.prisma.notice.delete({ where: { id } });

    return { id };
  }

  /**
   * Turns the audience into the set of tenant profiles to deliver to.
   *
   * Only ACTIVE tenancies qualify, so a tenant whose lease has been terminated is
   * not sent a notice about a property they no longer live in — the same rule
   * the maintenance ticket and tenant-directory paths use.
   *
   * Every audience is bounded by the caller's ownership before it is resolved,
   * so a notice can never be aimed at another owner's property, or at a tenant
   * the sender has no tenancy with.
   */
  private async resolveRecipients(
    dto: CreateNoticeDto,
    auth: AuthenticatedUser,
  ): Promise<string[]> {
    const { audience, propertyId, tenantId } = dto;

    if (audience === NoticeAudience.PROPERTY) {
      if (!propertyId) {
        throw new BadRequestException(
          'propertyId is required when audience is PROPERTY',
        );
      }

      if (dto.tenantId) {
        throw new BadRequestException(
          'tenantId cannot be set when audience is PROPERTY',
        );
      }

      // Proves the property exists AND belongs to the sender before it is used
      // to resolve anyone. Reported as missing rather than forbidden so a
      // foreign property id cannot be probed for existence.
      const property = await this.prisma.property.findFirst({
        where: { id: propertyId, ...managedPropertyWhere(auth) },
        select: { id: true },
      });

      if (!property) {
        throw new NotFoundException(
          `Property with id "${propertyId}" not found`,
        );
      }

      return this.tenantIdsForProperty(propertyId);
    }

    if (audience === NoticeAudience.TENANT) {
      if (!tenantId) {
        throw new BadRequestException(
          'tenantId is required when audience is TENANT',
        );
      }

      if (dto.propertyId) {
        throw new BadRequestException(
          'propertyId cannot be set when audience is TENANT',
        );
      }

      // The target must currently be one of the caller's tenants. This is what
      // stops a sender reaching any registered tenant on the platform through
      // the directory, mirroring the check on GET /api/auth/users.
      const tenancy = await this.prisma.tenancy.findFirst({
        where: {
          tenantId,
          isActive: true,
          unit: { property: managedPropertyWhere(auth) },
        },
        select: { tenantId: true },
      });

      if (!tenancy) {
        throw new NotFoundException(
          'That tenant does not hold a tenancy with you',
        );
      }

      return [tenancy.tenantId];
    }

    if (dto.propertyId || dto.tenantId) {
      throw new BadRequestException(
        'propertyId and tenantId must not be set when audience is ALL_PROPERTIES',
      );
    }

    // Portfolio-wide: every tenant with an active tenancy anywhere across the
    // sender's properties.
    return this.tenantIdsForProperties(managedPropertyWhere(auth));
  }

  /**
   * Distinct tenant profiles holding an active tenancy on one property.
   *
   * A profile can hold more than one tenancy across a portfolio, so the ids are
   * de-duplicated. Without that, a tenant with two units in the property would
   * receive the same notice twice and be counted twice in the owner's read
   * totals.
   */
  private async tenantIdsForProperty(propertyId: string): Promise<string[]> {
    const tenancies = await this.prisma.tenancy.findMany({
      where: { isActive: true, unit: { propertyId } },
      select: { tenantId: true },
    });

    return [...new Set(tenancies.map((tenancy) => tenancy.tenantId))];
  }

  /** The same rule applied across every property the sender manages. */
  private async tenantIdsForProperties(
    propertyScope: PropertyScope,
  ): Promise<string[]> {
    const tenancies = await this.prisma.tenancy.findMany({
      where: { isActive: true, unit: { property: propertyScope } },
      select: { tenantId: true },
    });

    return [...new Set(tenancies.map((tenancy) => tenancy.tenantId))];
  }

  /**
   * A sender may only act on notices they sent.
   *
   * The two rejections are deliberately different. A caller in the wrong role is
   * refused with 403, because the operation is not theirs to perform at all and
   * saying so leaks nothing: the caller can already see the ids in their own
   * inbox. A caller in the right role reaching someone else's row is reported as
   * missing, because a 403 there would confirm the id exists, leaking the
   * presence of another landlord's announcements. This mirrors
   * assertCanManage in the maintenance module.
   */
  private assertAuthor(
    notice: { id: string; authorId: string },
    auth: AuthenticatedUser,
  ): void {
    if (
      auth.profile.role !== Role.OWNER &&
      auth.profile.role !== Role.CARETAKER
    ) {
      throw new ForbiddenException(
        'Only property owners and caretakers can manage notices',
      );
    }

    if (notice.authorId !== auth.profile.id) {
      throw new NotFoundException(`Notice with id "${notice.id}" not found`);
    }
  }

  /**
   * Drops the delivery list from a notice. Applied on the tenant path, where who
   * else a notice went to is not theirs to see; the owner path replaces it with
   * counts rather than the identities.
   */
  private withoutRecipients<T extends { recipients: unknown[] }>(
    notice: T,
  ): Omit<T, 'recipients'> {
    const { recipients, ...rest } = notice;
    return rest;
  }
}
