import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { ConversationType, Role } from '../../generated/prisma/enums';
import type { Prisma } from '../../generated/prisma/client';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatAuthorizationService } from './chat-authorization.service';
import { ChatMembershipService } from './chat-membership.service';
import type {
  CreateDirectConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/query-conversations.dto';

/** One row of the inbox, with everything the list needs to render. */
export interface ConversationSummary {
  id: string;
  type: ConversationType;
  name: string;
  propertyId: string | null;
  lastMessageAt: Date | null;
  unreadCount: number;
  /** The other person, for a direct thread. Null for a group. */
  counterpart: { id: string; name: string; role: Role } | null;
  /** Everyone in the thread, for the member list and avatars. */
  participants: { id: string; name: string; role: Role }[];
  /**
   * The newest message, for the inbox preview line.
   *
   * An inbox row without it renders as a name and a timestamp, which reads as a
   * blank screen — the thing a person opens the app to find out is what the last
   * thing said. Null only for a thread nobody has posted in.
   */
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
    sender: { id: string; name: string };
  } | null;
}

/** One chat message, as sent over both transports. */
/**
 * One page of the inbox.
 *
 * `page` and `limit` are echoed rather than left implicit so the client can tell
 * whether another page exists without comparing counts itself. That is the same
 * contract `findMessages` offers through `nextCursor`, and history already needed
 * it: a full page is ambiguous when the server clamps `limit` to `MAX_PAGE_SIZE`,
 * because the last page can be full and still be the last one.
 */
export interface ConversationPage {
  items: ConversationSummary[];
  /** Every thread matching the search, not just this page, for "1-20 of 63". */
  total: number;
  page: number;
  /** The page size actually applied, after clamping. */
  limit: number;
}

export interface ChatMessageView {
  id: string;
  conversationId: string;
  content: string;
  createdAt: Date;
  sender: { id: string; name: string; role: Role };
}

/**
 * The participant projection every inbox/detail read needs.
 *
 * Declared once so `toSummary` and the four call sites cannot drift: they all
 * need the other person's display name, which lives on `profile.user`, and
 * forgetting that include is the easy mistake here.
 */
const conversationWithParticipants = {
  participants: {
    include: {
      profile: { include: { user: { select: { name: true } } } },
    },
  },
  messages: {
    // Newest-first, and only one: the inbox needs a preview line, not a page of
    // history. Folding it into the shared projection means the preview costs no
    // extra round trip and cannot be forgotten at a call site.
    take: 1,
    orderBy: { id: 'desc' },
    include: { sender: { include: { user: { select: { name: true } } } } },
  },
} satisfies Prisma.ConversationInclude;

/** A conversation with the participants the client needs to label it. */
type ConversationWithParticipants = Prisma.ConversationGetPayload<{
  include: typeof conversationWithParticipants;
}>;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const HISTORY_PAGE_SIZE = 30;
const MAX_HISTORY_PAGE_SIZE = 100;

/**
 * Conversation reads: the inbox, history, and the small amount of state the
 * client needs to render them.
 *
 * All message *writes* go through the websocket gateway, so this service has no
 * create-send path. History deliberately stays on HTTP: it is paginated, and it
 * has to work on a cold start before a socket exists, neither of which a socket
 * event is a good fit for.
 */
@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: ChatAuthorizationService,
    private readonly membership: ChatMembershipService,
  ) {}

  /**
   * The caller's inbox, newest activity first.
   *
   * Every row is already scoped by membership — the query starts from
   * `conversation_participant`, so a thread the caller is not in cannot appear at
   * all rather than being filtered out afterwards.
   */
  async findAll(
    query: QueryConversationsDto,
    auth: AuthenticatedUser,
  ): Promise<ConversationPage> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const seats = await this.prisma.conversationParticipant.findMany({
      where: {
        profileId: auth.profile.id,
        ...(query.search
          ? {
              conversation: {
                OR: [
                  { name: { contains: query.search, mode: 'insensitive' } },
                  {
                    participants: {
                      some: {
                        profileId: { not: auth.profile.id },
                        profile: {
                          user: {
                            name: { contains: query.search, mode: 'insensitive' },
                          },
                        },
                      },
                    },
                  },
                ],
              },
            }
          : {}),
      },
      select: { conversationId: true, lastReadAt: true },
    });

    const conversationIds = seats.map((s) => s.conversationId);

    // A search that matches nothing must not fall through to the full inbox.
    if (conversationIds.length === 0) {
      return { items: [], total: 0, page, limit };
    }

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { id: { in: conversationIds } },
        include: conversationWithParticipants,
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.conversation.count({ where: { id: { in: conversationIds } } }),
    ]);

    const items = await Promise.all(
      conversations.map((conversation) =>
        this.toSummary(
          conversation,
          seats.find((s) => s.conversationId === conversation.id)?.lastReadAt ?? null,
          auth.profile.id,
        ),
      ),
    );

    return { items, total, page, limit };
  }

  /**
   * One page of a thread's history, oldest-first for display.
   *
   * The database returns the newest rows first (that is the only order an index
   * can walk backwards through efficiently), so the page is reversed before it is
   * returned to match how a message list is drawn top-to-bottom.
   */
  async findMessages(
    conversationId: string,
    query: QueryMessagesDto,
    auth: AuthenticatedUser,
  ): Promise<{ items: ChatMessageView[]; nextCursor: string | null }> {
    await this.authorization.assertParticipant(conversationId, auth.profile.id);

    const limit = Math.min(
      query.limit ?? HISTORY_PAGE_SIZE,
      MAX_HISTORY_PAGE_SIZE,
    );

    const rows = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(query.before ? { id: { lt: query.before } } : {}),
      },
      include: { sender: { include: { user: { select: { name: true } } } } },
      orderBy: { id: 'desc' },
      // One row beyond the page. Whether it comes back is the only way to tell
      // "there is more history" from "this is the end" without a second COUNT
      // query — asking for exactly `limit` rows makes the two indistinguishable.
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;

    // Captured *before* reversing, and from a copy: `reverse()` mutates in place,
    // so reading `page` afterwards would yield the newest id in the page. The
    // cursor has to be the oldest, because `before` is a strict upper bound — point
    // it at the newest and every "load older" call re-fetches the same rows and
    // history never scrolls.
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return {
      items: [...page].reverse().map((row) => this.toMessageView(row)),
      nextCursor,
    };
  }

  /** A single conversation's details, for the thread header. */
  async findOne(conversationId: string, auth: AuthenticatedUser) {
    await this.authorization.assertParticipant(conversationId, auth.profile.id);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationWithParticipants,
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const seat = conversation.participants.find(
      (p) => p.profileId === auth.profile.id,
    );

    return this.toSummary(conversation, seat?.lastReadAt ?? null, auth.profile.id);
  }

  /**
   * Total unread across every thread.
   *
   * The activity hub badge. Sums per-conversation unread counts rather than
   * counting messages in one query because "newer than *my* cursor" is a
   * per-thread comparison — a single `count` cannot express it without losing the
   * group boundaries.
   */
  async unreadCount(auth: AuthenticatedUser): Promise<{ unread: number }> {
    const seats = await this.prisma.conversationParticipant.findMany({
      where: { profileId: auth.profile.id },
      select: {
        lastReadAt: true,
        conversationId: true,
      },
    });

    if (seats.length === 0) return { unread: 0 };

    const counts = await Promise.all(
      seats.map((seat) =>
        this.prisma.message.count({
          where: {
            conversationId: seat.conversationId,
            // Their own messages are not unread to them.
            senderId: { not: auth.profile.id },
            ...(seat.lastReadAt
              ? { createdAt: { gt: seat.lastReadAt } }
              : {}),
          },
        }),
      ),
    );

    return { unread: counts.reduce((sum, n) => sum + n, 0) };
  }

  /** Moves a seat's read cursor forward. */
  async markRead(conversationId: string, auth: AuthenticatedUser) {
    await this.authorization.assertParticipant(conversationId, auth.profile.id);

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { lastMessageAt: true },
    });

    // Read up to the newest message that exists, not `now`: advancing past it
    // would hide messages that arrive between this read and the next one.
    const readAt = conversation?.lastMessageAt ?? new Date();

    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_profileId: {
          conversationId,
          profileId: auth.profile.id,
        },
      },
      data: { lastReadAt: readAt },
    });

    return { conversationId, lastReadAt: readAt };
  }

  /** Open (or re-open) a direct thread with someone. */
  async createDirectConversation(
    dto: CreateDirectConversationDto,
    auth: AuthenticatedUser,
  ) {
    const conversation = await this.membership.findOrCreateDirectConversation(
      auth,
      dto.profileId,
    );
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const full = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: conversationWithParticipants,
    });

    const seat = full.participants.find((p) => p.profileId === auth.profile.id);
    return this.toSummary(full, seat?.lastReadAt ?? null, auth.profile.id);
  }

  /** Open (or re-open) a property's group thread. */
  async openGroupConversation(
    propertyId: string,
    auth: AuthenticatedUser,
  ) {
    const conversation = await this.membership.ensureGroupConversation(propertyId);
    if (!conversation) {
      throw new NotFoundException('Property not found');
    }

    // Reachability, not the pair rules: `canMessage` returns false for two
    // tenants of the same property, which is correct for a *direct* thread and
    // wrong here — a tenant absolutely may open their own property's group.
    const reachable = await this.authorization.canReachProperty(
      propertyId,
      auth.profile,
    );
    if (!reachable) {
      throw new NotFoundException('Conversation not found');
    }

    const full = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversation.id },
      include: conversationWithParticipants,
    });

    const seat = full.participants.find((p) => p.profileId === auth.profile.id);
    return this.toSummary(full, seat?.lastReadAt ?? null, auth.profile.id);
  }

  /**
   * Shapes a conversation for the client.
   *
   * A direct thread has no stored name — its label is the other person, which is
   * what makes it readable without a lookup — so that is resolved here rather
   * than persisted.
   */
  private async toSummary(
    conversation: ConversationWithParticipants,
    lastReadAt: Date | null,
    viewerId: string,
  ): Promise<ConversationSummary> {
    const participants = conversation.participants.map((p) => ({
      id: p.profileId,
      name: p.profile.user.name,
      role: p.profile.role,
    }));

    const counterpart =
      conversation.type === ConversationType.DIRECT
        ? participants.find((p) => p.id !== viewerId) ?? null
        : null;

    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: viewerId },
        ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
      },
    });

    return {
      id: conversation.id,
      type: conversation.type,
      name:
        conversation.type === ConversationType.GROUP
          ? (conversation.name ?? 'Property group')
          : (counterpart?.name ?? 'Direct message'),
      propertyId: conversation.propertyId,
      lastMessageAt: conversation.lastMessageAt,
      unreadCount,
      counterpart,
      participants,
      lastMessage: conversation.messages[0]
        ? {
            id: conversation.messages[0].id,
            content: conversation.messages[0].content,
            createdAt: conversation.messages[0].createdAt,
            sender: {
              id: conversation.messages[0].senderId,
              name: conversation.messages[0].sender.user.name,
            },
          }
        : null,
    };
  }

  private toMessageView(row: {
    id: string;
    conversationId: string;
    content: string;
    createdAt: Date;
    sender: { id: string; role: Role; user: { name: string } };
  }): ChatMessageView {
    return {
      id: row.id,
      conversationId: row.conversationId,
      content: row.content,
      createdAt: row.createdAt,
      sender: { id: row.sender.id, name: row.sender.user.name, role: row.sender.role },
    };
  }
}
