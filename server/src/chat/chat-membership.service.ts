import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatAuthorizationService } from './chat-authorization.service';
import { ChatEventsService } from './chat-events.service';

/** Everyone who belongs in a property's standing group thread. */
interface PropertyMembers {
  propertyId: string;
  ownerId: string;
  caretakerId: string | null;
  tenantIds: string[];
}

/**
 * Membership lifecycle for conversations.
 *
 * Split from the REST surface and the gateway on purpose: tenancy creation and
 * termination both need to keep group membership correct, and neither of those
 * services should have to know what a websocket is.
 */
@Injectable()
export class ChatMembershipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: ChatAuthorizationService,
    private readonly events: ChatEventsService,
  ) {}

  /**
   * Finds or creates a property's group thread and seats its current members.
   *
   * Idempotent and safe to call concurrently: the unique index on
   * `conversation.property_id` is what actually guarantees one group per
   * property, so a race between two callers resolves to the same row (the loser
   * gets `P2002` and re-reads) rather than a duplicate thread.
   *
   * Also *reconciles* rather than only creating, so a caller can repair drift —
   * after a backfill, or if a tenancy ended while the process was down.
   */
  async ensureGroupConversation(propertyId: string) {
    const existed = await this.prisma.conversation.findUnique({
      where: { propertyId },
      select: { id: true },
    });

    const conversation = await this.findOrCreateGroup(propertyId);
    if (!conversation) return null;

    // Created lazily on first open, which can be long after the property existed —
    // so the creation itself has to reach the people who belong in it, or their
    // inbox never learns a thread is waiting.
    if (!existed) {
      this.events.publish({
        type: 'conversation:created',
        conversationId: conversation.id,
        propertyId,
      });
    }

    const members = await this.resolvePropertyMembers(propertyId);
    await this.reconcileGroupMembers(conversation.id, members);

    if (existed) {
      this.events.publish({
        type: 'participants:changed',
        conversationId: conversation.id,
        reason: 'reconciled',
      });
    }

    return conversation;
  }

  /**
   * Seats everyone who should be in the property's group.
   *
   * Called when a tenancy starts. Uses a create-if-missing upsert rather than an
   * update so an existing seat's `lastReadAt` — and therefore the person's unread
   * badge — survives someone re-joining a thread they were already in.
   */
  async addTenantToPropertyGroup(tenantId: string, propertyId: string) {
    const conversation = await this.findOrCreateGroup(propertyId);
    if (!conversation) return null;

    await this.prisma.conversationParticipant.upsert({
      where: {
        conversationId_profileId: {
          conversationId: conversation.id,
          profileId: tenantId,
        },
      },
      update: {},
      create: { conversationId: conversation.id, profileId: tenantId },
    });

    // An open thread on somebody's phone has a participant list and an unread
    // count cached in it. Without this the new resident sees a stale roster until
    // they pull to refresh.
    this.events.publish({
      type: 'participants:changed',
      conversationId: conversation.id,
      reason: 'tenancy-started',
    });

    return conversation;
  }

  /**
   * Removes a person from a property's group.
   *
   * Called when a tenancy terminates. They lose access to the thread entirely,
   * including its history — the product decision that a former resident's access
   * to the building's conversation ends with the tenancy, rather than persisting
   * as a standing invitation.
   *
   * Direct threads are left alone: a thread with a landlord is a conversation
   * between two specific people and survives either of them moving house.
   */
  async removeFromPropertyGroup(profileId: string, propertyId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { propertyId },
      select: { id: true },
    });
    if (!conversation) return null;

    const { count } = await this.prisma.conversationParticipant.deleteMany({
      where: { conversationId: conversation.id, profileId },
    });

    // Only announce a real removal. `deleteMany` reports 0 when the person was
    // never seated, and a broadcast that says nothing happened still costs every
    // open thread a refetch.
    if (count > 0) {
      this.events.publish({
        type: 'participants:changed',
        conversationId: conversation.id,
        reason: 'tenancy-terminated',
      });
    }

    return conversation;
  }

  /**
   * Finds or creates the group row, tolerating the concurrent-create race.
   *
   * `findOrCreateGroup` is the only place `conversation.create` is called, which
   * is what keeps the P2002 handling from becoming a scattered special case.
   */
  private async findOrCreateGroup(propertyId: string) {
    const existing = await this.prisma.conversation.findUnique({
      where: { propertyId },
    });
    if (existing) return existing;

    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, name: true },
    });
    if (!property) return null;

    try {
      return await this.prisma.conversation.create({
        data: {
          type: ConversationType.GROUP,
          propertyId,
          // The property name is the group's display label. Copying it at
          // creation time keeps the inbox readable without a join, at the cost
          // of a rename not propagating — acceptable for a label, and the same
          // trade the notices module already makes.
          name: property.name,
        },
      });
    } catch (error) {
      // Another caller created it between our read and write. The unique index
      // did its job; re-read the winner's row and carry on. Throwing rather than
      // returning null if the winner's row somehow is not there, because every
      // caller of this method dereferences the result.
      if (this.isUniqueViolation(error)) {
        const winner =
          await this.prisma.conversation.findUnique({ where: { propertyId } });
        if (!winner) {
          throw new NotFoundException('Property group conversation vanished');
        }
        return winner;
      }
      throw error;
    }
  }

  /**
   * Brings the group seats in line with who currently lives there.
   *
   * Adds anyone newly entitled (a tenancy that started while the service was
   * down) and removes anyone no longer entitled. Only ever touches the group
   * row — never direct threads.
   */
  private async reconcileGroupMembers(
    conversationId: string,
    members: PropertyMembers,
  ) {
    const expected = new Set<string>([
      members.ownerId,
      ...(members.caretakerId ? [members.caretakerId] : []),
      ...members.tenantIds,
    ]);

    const current = await this.prisma.conversationParticipant.findMany({
      where: { conversationId },
      select: { profileId: true },
    });
    const actual = new Set(current.map((c) => c.profileId));

    const toAdd = [...expected].filter((id) => !actual.has(id));
    const toRemove = [...actual].filter((id) => !expected.has(id));

    if (toAdd.length) {
      await this.prisma.conversationParticipant.createMany({
        data: toAdd.map((profileId) => ({ conversationId, profileId })),
        skipDuplicates: true,
      });
    }
    if (toRemove.length) {
      await this.prisma.conversationParticipant.deleteMany({
        where: { conversationId, profileId: { in: toRemove } },
      });
    }
  }

  /**
   * Resolves a property's owner, caretaker and active tenants.
   *
   * Only *active* tenancies contribute a tenant, matching the authorization
   * rules: a terminated tenancy should not leave someone reachable.
   */
  private async resolvePropertyMembers(
    propertyId: string,
  ): Promise<PropertyMembers> {
    const property = await this.prisma.property.findUniqueOrThrow({
      where: { id: propertyId },
      select: {
        id: true,
        ownerId: true,
        caretakerId: true,
        units: {
          select: {
            tenancies: {
              where: { isActive: true },
              select: { tenantId: true },
            },
          },
        },
      },
    });

    return {
      propertyId: property.id,
      ownerId: property.ownerId,
      caretakerId: property.caretakerId,
      tenantIds: property.units.flatMap((u) => u.tenancies.map((t) => t.tenantId)),
    };
  }

  /**
   * Creates or returns a direct thread between two profiles.
   *
   * `directKey` is the dedupe mechanism, not a lookup nicety — it is what makes
   * two simultaneous "message this person" taps land on one thread.
   */
  async findOrCreateDirectConversation(
    auth: AuthenticatedUser,
    otherProfileId: string,
  ) {
    if (auth.profile.id === otherProfileId) {
      throw new ForbiddenException('You cannot message yourself');
    }

    const other = await this.prisma.userProfile.findUnique({
      where: { id: otherProfileId },
    });
    if (!other) {
      throw new ForbiddenException('That person cannot be messaged');
    }

    const verdict = await this.authorization.canMessage(auth.profile, other);
    if (!verdict.allowed) {
      throw new ForbiddenException(verdict.reason ?? 'You cannot message them');
    }

    const directKey = ChatAuthorizationService.directKeyFor(
      auth.profile.id,
      otherProfileId,
    );

    const existing = await this.prisma.conversation.findUnique({
      where: { directKey },
    });
    if (existing) return existing;

    try {
      return await this.prisma.conversation.create({
        data: {
          type: ConversationType.DIRECT,
          directKey,
          participants: {
            create: [
              { profileId: auth.profile.id },
              { profileId: otherProfileId },
            ],
          },
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const winner =
          await this.prisma.conversation.findUnique({ where: { directKey } });
        if (!winner) {
          throw new NotFoundException('Conversation vanished');
        }
        return winner;
      }
      throw error;
    }
  }

  /** Prisma's unique-constraint error code. */
  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: string }).code === 'P2002'
    );
  }
}