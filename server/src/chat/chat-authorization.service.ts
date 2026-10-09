import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '../../generated/prisma/enums';
import type { UserProfile } from '../../generated/prisma/client';

type Verdict = { allowed: boolean; reason?: string };

/** Removes duplicates and drops nulls — a caretaker can also be the owner. */
function unique(ids: (string | null)[]): string[] {
  return [...new Set(ids.filter((id): id is string => !!id))];
}

const ALLOW: Verdict = { allowed: true };

/**
 * The chat authorization rules, kept apart from anything transport-specific.
 *
 * This service is the only place that decides "may these two people talk, and is
 * this person in this thread". Nothing here knows about HTTP or websockets, so
 * the gateway and the REST controller provably agree — there is exactly one
 * answer to the question regardless of which door the request came through.
 */
@Injectable()
export class ChatAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic key identifying a direct thread between two profiles.
   *
   * Sorted so both sides compute the same string, which is what makes the
   * `directKey` unique index meaningful: without the sort, two people who open a
   * chat at the same moment produce two different keys, two rows, and two
   * threads that each look half-empty.
   */
  static directKeyFor(a: string, b: string): string {
    return [a, b].sort().join(':');
  }

  /**
   * Whether two profiles are allowed a direct thread.
   *
   * The three allowed pairs, each justified by a relationship in the database
   * rather than by role alone:
   *
   * | pair                 | justified by                                         |
   * | -------------------- | ---------------------------------------------------- |
   * | tenant ↔ landlord    | an active tenancy on a property they own              |
   * | tenant ↔ caretaker   | an active tenancy on a property they are caretaker of |
   * | landlord ↔ caretaker | a property they own where they are the caretaker       |
   *
   * Everything else is refused, and that includes **tenant ↔ tenant** — the
   * product decision that residents share a landlord's thread rather than
   * having private rooms with each other. Housemates in the same unit are
   * refused here even though every database row linking them exists.
   *
   * Symmetric by construction: role comparison is unordered and each pair rule
   * below names both ids, so no ordering of the arguments can change the answer.
   */
  async canMessage(a: UserProfile, b: UserProfile): Promise<Verdict> {
    if (a.id === b.id) {
      return { allowed: false, reason: 'You cannot message yourself' };
    }

    if (a.role === Role.TENANT && b.role === Role.TENANT) {
      return { allowed: false, reason: 'Tenants cannot message each other directly' };
    }

    // Only two same-role pairs are expressible, and each has its own rule.
    if (a.role === Role.OWNER && b.role === Role.OWNER) {
      return { allowed: false, reason: 'Landlords cannot message each other directly' };
    }
    if (a.role === Role.CARETAKER && b.role === Role.CARETAKER) {
      return { allowed: false, reason: 'Caretakers cannot message each other directly' };
    }

    if (a.role === Role.TENANT && b.role === Role.OWNER) {
      return this.tenantAndOwner(a, b);
    }
    if (a.role === Role.OWNER && b.role === Role.TENANT) {
      return this.tenantAndOwner(b, a);
    }

    if (a.role === Role.TENANT && b.role === Role.CARETAKER) {
      return this.tenantAndCaretaker(a, b);
    }
    if (a.role === Role.CARETAKER && b.role === Role.TENANT) {
      return this.tenantAndCaretaker(b, a);
    }

    if (a.role === Role.OWNER && b.role === Role.CARETAKER) {
      return this.ownerAndCaretaker(a, b);
    }
    if (a.role === Role.CARETAKER && b.role === Role.OWNER) {
      return this.ownerAndCaretaker(b, a);
    }

    return { allowed: false, reason: 'Unsupported role combination' };
  }

  /**
   * Tenant ↔ landlord: an **active** tenancy ties them together.
   *
   * Active-only matters. A terminated tenancy leaves its rows behind, so without
   * the filter a landlord could start a thread with whoever used to live there.
   */
  private async tenantAndOwner(
    tenant: UserProfile,
    owner: UserProfile,
  ): Promise<Verdict> {
    const count = await this.prisma.tenancy.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        unit: { property: { ownerId: owner.id } },
      },
    });

    if (count > 0) return ALLOW;
    return {
      allowed: false,
      reason: 'That landlord does not own your home',
    };
  }

  /** Tenant ↔ caretaker: an active tenancy on a property they manage. */
  private async tenantAndCaretaker(
    tenant: UserProfile,
    caretaker: UserProfile,
  ): Promise<Verdict> {
    const count = await this.prisma.tenancy.count({
      where: {
        tenantId: tenant.id,
        isActive: true,
        unit: { property: { caretakerId: caretaker.id } },
      },
    });

    if (count > 0) return ALLOW;
    return {
      allowed: false,
      reason: 'That caretaker does not manage your home',
    };
  }

  /**
   * Landlord ↔ caretaker: the caretaker is assigned to one of the owner's
   * properties.
   *
   * A single `count` over the property row, which is the same row that encodes
   * the arrangement — no tenancy involved, since a property can have no tenants
   * and the two still work together.
   */
  private async ownerAndCaretaker(
    owner: UserProfile,
    caretaker: UserProfile,
  ): Promise<Verdict> {
    const count = await this.prisma.property.count({
      where: { ownerId: owner.id, caretakerId: caretaker.id },
    });

    if (count > 0) return ALLOW;
    return {
      allowed: false,
      reason: 'That caretaker does not manage any of your properties',
    };
  }

  /**
   * Everyone this profile is allowed to open a direct thread with.
   *
   * Derived from the same rows `canMessage` checks, and that is the entire point:
   * a picker that offers somebody the server would then refuse is worse than no
   * picker, because it makes the product look broken instead of the rule look
   * like a rule.
   *
   * Every branch is a query rather than a filter over the whole directory, so the
   * caller can never learn a name they were not entitled to. `/api/auth/users`
   * could not be reused for this — it is forbidden to tenants outright, and for
   * `role: 'TENANT'` it returns precisely the tenants with *no* active tenancy,
   * which is the opposite of the list somebody wants to message.
   *
   * Deduplicated by profile id: a tenant with a caretaker who is also the owner,
   * or two properties with the same caretaker, would otherwise appear twice.
   */
  async messageableProfiles(
    caller: UserProfile,
  ): Promise<{ id: string; role: Role; name: string | null }[]> {
    const rows = await this.messageableWhere(caller).then((ids) =>
      // An owner who is also their own caretaker is a legal row but not a legal
      // conversation, and `canMessage` refuses it as self-messaging.
      ids.filter((id) => id !== caller.id),
    );

    if (rows.length === 0) return [];

    const profiles = await this.prisma.userProfile.findMany({
      where: { id: { in: rows } },
      select: { id: true, role: true, user: { select: { name: true } } },
    });

    return profiles
      .map((profile) => ({
        id: profile.id,
        role: profile.role,
        name: profile.user.name,
      }))
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  /**
   * Properties whose group thread this caller may open.
   *
   * The group counterpart of `messageableProfiles`, and entitled the same way: the
   * set is derived from the caller's own rows, so a tenant cannot enumerate the
   * properties they do not live in and an owner cannot open another landlord's
   * building.
   *
   * A tenant normally gets exactly one entry, and that is correct rather than
   * limited — they are seated in their own property's thread by the tenancy, not
   * in any other.
   */
  async messageableGroups(
    caller: UserProfile,
  ): Promise<{ id: string; name: string; address: string | null; memberCount: number }[]> {
    const where =
      caller.role === Role.TENANT
        ? { units: { some: { tenancies: { some: { tenantId: caller.id, isActive: true } } } } }
        : caller.role === Role.OWNER
          ? { ownerId: caller.id }
          : { caretakerId: caller.id };

    const properties = await this.prisma.property.findMany({
      where,
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        _count: { select: { units: true } },
      },
    });

    return properties.map((property) => ({
      id: property.id,
      name: property.name,
      address: property.address,
      memberCount: property._count.units,
    }));
  }

  /** Profile ids of this caller's legal counterparts, one query per role pair. */
  private async messageableWhere(caller: UserProfile): Promise<string[]> {
    if (caller.role === Role.TENANT) {
      // A tenant's world is the properties they currently live on.
      const homes = await this.prisma.property.findMany({
        where: { units: { some: { tenancies: { some: { tenantId: caller.id, isActive: true } } } } },
        select: { ownerId: true, caretakerId: true },
      });

      return unique([
        ...homes.map((home) => home.ownerId),
        ...homes.map((home) => home.caretakerId),
      ]);
    }

    if (caller.role === Role.OWNER) {
      // Residents of their properties, plus the caretakers they appointed.
      const [residents, caretakers] = await Promise.all([
        this.prisma.userProfile.findMany({
          where: { tenancies: { some: { isActive: true, unit: { property: { ownerId: caller.id } } } } },
          select: { id: true },
        }),
        this.prisma.userProfile.findMany({
          where: { managedProperties: { some: { ownerId: caller.id } } },
          select: { id: true },
        }),
      ]);

      return unique([
        ...residents.map((r) => r.id),
        ...caretakers.map((c) => c.id),
      ]);
    }

    // Caretaker: residents of the properties they manage, and those properties'
    // owners. Both follow from the same property set, so it is fetched once.
    const managed = await this.prisma.property.findMany({
      where: { caretakerId: caller.id },
      select: {
        ownerId: true,
        units: {
          select: {
            tenancies: { where: { isActive: true }, select: { tenantId: true } },
          },
        },
      },
    });

    return unique([
      ...managed.map((property) => property.ownerId),
      ...managed.flatMap((property) =>
        property.units.flatMap((unit) => unit.tenancies.map((t) => t.tenantId)),
      ),
    ]);
  }

  /**
   * Confirms a profile is seated in a conversation, or throws.
   *
   * Called by *every* read and write path, on purpose. Membership is materialised
   * in `conversation_participant`, so this is a single indexed lookup rather than
   * a walk through units, tenancies and properties — cheap enough to repeat
   * rather than trust.
   *
   * It must be repeated rather than inferred from socket rooms. Rooms are a
   * delivery optimisation: they say who should receive an emit, nothing more. A
   * client can emit `message:send` with any conversation id it likes, and the
   * only thing standing between that and a stranger's thread is this check.
   */
  async assertParticipant(
    conversationId: string,
    profileId: string,
  ): Promise<void> {
    const seat = await this.prisma.conversationParticipant.findUnique({
      where: { conversationId_profileId: { conversationId, profileId } },
      select: { id: true },
    });

    if (!seat) {
      throw new ForbiddenException('You are not in this conversation');
    }
  }

  /** Whether a profile is entitled to a property at all. */
  async canReachProperty(propertyId: string, profile: UserProfile): Promise<boolean> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        ownerId: true,
        caretakerId: true,
        units: {
          select: {
            tenancies: {
              where: { tenantId: profile.id, isActive: true },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    return (
      property.ownerId === profile.id ||
      property.caretakerId === profile.id ||
      property.units.some((unit) => unit.tenancies.length > 0)
    );
  }
}