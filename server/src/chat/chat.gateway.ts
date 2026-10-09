import {
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import {
  ForbiddenException,
  HttpException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { Subscription } from 'rxjs';
import { Server, Socket } from 'socket.io';

/**
 * Loose event map for the directions the gateway does not type.
 *
 * Socket.IO's generics are `Socket<ListenEvents, EmitEvents, ServerSideEvents,
 * SocketData>`. `EventsMap` is not exported by the package, so `Record<string,
 * never>` stands in for the inbound directions Nest handles: they are typed by
 * the `@SubscribeMessage` DTOs instead.
 */
type EventsMap = Record<string, never>;

import { AuthSessionService } from '../auth/auth-session.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ChatAuthorizationService } from './chat-authorization.service';
import {
  MarkReadDto,
  SendMessageDto,
  SubscribeConversationDto,
  TypingDto,
} from './dto/send-message.dto';
import { ChatEventsService } from './chat-events.service';
import {
  isWsValidationFailure,
  WsValidationPipe,
} from './ws-validation.pipe';
import type { ChatMessageView } from './conversations.service';

/**
 * What the gateway parks on every connection.
 *
 * `socket.data` is untyped by default, so without this the whole
 * authenticated-identity story would rest on nothing. Applied through
 * `Socket`'s fourth type argument below — the type parameter on
 * `@WebSocketGateway` is for *gateway options*, not connection data, which the
 * typings do not make obvious.
 */
interface ChatSocketData {
  user?: AuthenticatedUser;
  /** Set once the handshake is authenticated. */
  authenticatedAt?: Date;
}

/** Acknowledgement of a `message:send` that was persisted. */
export interface SendAck {
  ok: true;
  /** Echoed so the sender can match this to its optimistic bubble. */
  clientId: string;
  conversationId: string;
  message: ChatMessageView;
}

/** Acknowledgement of any chat event that failed. */
export interface ChatErrorAck {
  ok: false;
  code: number;
  message: string;
}

/** Events the server pushes to a client. */
interface ServerToClientEvents {
  'connection:ready': (payload: { profileId: string; role: string }) => void;
  'connection:error': (payload: ChatErrorAck) => void;
  /** A new message in a thread this device has open. */
  'message:new': (payload: {
    conversationId: string;
    /**
     * The id the *sender* generated, so a client can recognise its own message.
     *
     * Broadcast to the whole room rather than only to the sender: it is a random
     * uuid with no meaning to anyone else, and a uniform payload means the client
     * has one code path instead of "match if present, otherwise always append".
     * Receivers simply ignore it.
     */
    clientId: string;
    message: ChatMessageView;
  }) => void;
  /**
   * The viewer sent something, from any device. Separate from `message:new` so a
   * thread that is not open still learns its unread count moved.
   */
  'conversation:touched': (payload: {
    conversationId: string;
    clientId: string;
    message: ChatMessageView;
  }) => void;
  /**
   * The thread's participant list or existence changed — a tenancy started or
   * ended. Carries no payload beyond the id because a client that needs the new
   * roster has to fetch it anyway; sending a stale-in-a-second roster would be
   * worse than signalling that it is out of date.
   */
  'conversation:updated': (payload: {
    conversationId: string;
    reason: string;
  }) => void;
  /**
   * Somebody else in an open thread started, or stopped, typing.
   *
   * Sent to the conversation room minus the socket that raised it: the sender's
   * own device never sees its echo, while the sender's *other* devices — same
   * room, different socket — do, and are expected to filter on `profileId` so
   * they do not show "You" as a participant typing.
   */
  'typing:state': (payload: {
    conversationId: string;
    profileId: string;
    /** Display name, resolved once at handshake — typing must not query per keystroke. */
    name: string;
    typing: boolean;
  }) => void;
}

/** A connection whose `data` is known to carry an authenticated user. */
type ChatSocket = Socket<
  EventsMap,
  ServerToClientEvents,
  EventsMap,
  ChatSocketData
>;

type ChatServer = Server<EventsMap, ServerToClientEvents, EventsMap, ChatSocketData>;

/** Room name for every socket a given person has open. */
const userRoom = (profileId: string) => `user:${profileId}`;

/**
 * Room naming.
 *
 * Two shapes, and the difference matters:
 *
 * - `user:<profileId>` — joined by every socket a person has open, in
 *   `handleConnection`. This is how the server reaches one specific person
 *   without keeping its own map of profile → sockets: "notify this user" becomes
 *   an emit to a room whose membership the server already knows.
 * - `conversation:<id>` — joined only while a thread is open on that device.
 *
 * Rooms are a delivery optimisation, never an authorization boundary. See
 * `assertParticipant` below.
 */
const conversationRoom = (conversationId: string) =>
  `conversation:${conversationId}`;

/**
 * Pulls the human-readable reason out of an `HttpException`.
 *
 * `getResponse()` is `string` or an object with `message` as `string | string[]`,
 * so a rejected field can arrive as an array that has to be joined before it is
 * worth showing to a person.
 */
function extractMessage(exception: HttpException): string {
  const response = exception.getResponse();

  const message =
    typeof response === 'string'
      ? response
      : (response as { message?: string | string[] }).message;

  if (Array.isArray(message)) return message.join('; ');
  return message ?? exception.message;
}

/**
 * Chat over websockets.
 *
 * Responsibilities, in the order they happen:
 *
 *  1. `handleConnection` — authenticate once, then park the resolved profile on
 *     `socket.data` and join the personal room. This is the only database hit a
 *     connection costs.
 *  2. `conversation:subscribe` — authorize, then join the thread's room so
 *     messages are pushed to this device.
 *  3. `message:send` — re-authorize, persist, bump the thread's timestamp, then
 *     broadcast to the room.
 *  4. `message:read` — move the sender's read cursor.
 *
 * Every handler answers with an acknowledgement (`{ ok: true, ... }` or
 * `{ ok: false, code, message }`) because the alternative is a client that waits
 * forever for a reply that was never sent.
 *
 * That last point drives a structural decision here. Socket.IO acks are function
 * callbacks, and Nest fills one in from the handler's **return value**. An
 * exception thrown inside a handler travels somewhere else entirely — to the
 * exception filter, which is handed the socket but never the callback. So
 * `handleSend` could reject correctly, get logged correctly, and still leave the
 * sender staring at a spinner.
 *
 * Hence two rules in this gateway:
 *
 *  - Body validation uses `WsValidationPipe`, which returns a failure value
 *    instead of throwing, so even a malformed payload comes back as an ack.
 *  - Every handler body runs through `this.ack()`, which converts a thrown
 *    `HttpException` into `{ ok: false, code, message }`.
 *
 * Exceptions are still the right way to *express* a rejection inside the
 * handlers — `assertParticipant` throwing `ForbiddenException` reads better than
 * threading a result union through four call frames. They are just caught at the
 * edge and turned back into a reply.
 */
@WebSocketGateway({
  // Same origins as the REST API. Without this the client is refused during the
  // handshake with an error that looks like a network fault rather than a CORS
  // one. `origin: true` reflects the request origin; tighten this to the same
  // CORS_ORIGINS allowlist the HTTP server uses when chat goes to production.
  cors: { origin: true, credentials: true },
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('ChatGateway');

  @WebSocketServer()
  private server!: ChatServer;

  private readonly subscription = new Subscription();

  constructor(
    private readonly sessions: AuthSessionService,
    private readonly prisma: PrismaService,
    private readonly authorization: ChatAuthorizationService,
    private readonly events: ChatEventsService,
  ) {}

  /**
   * Bridges domain changes (a tenancy starting or ending) onto open threads.
   *
   * Two things are deliberately *not* done here:
   *
   *  - The removed person is not force-disconnected. Their seat is already gone,
   *    so the next send or subscribe they attempt fails authorization, and their
   *    in-flight subscriptions simply stop receiving. Killing the socket would be
   *    heavier and would lose their draft.
   *  - The new roster is not included. Whoever this reaches will fetch it, which
   *    is one request, rather than trusting a payload that is stale on arrival if
   *    two tenancies change at once.
   */
  onModuleInit() {
    this.subscription.add(
      this.events.subscribe().subscribe((event) => {
        switch (event.type) {
          case 'participants:changed':
            this.server
              .to(conversationRoom(event.conversationId))
              .emit('conversation:updated', {
                conversationId: event.conversationId,
                reason: event.reason,
              });
            break;

          case 'conversation:created': {
            // Nobody is in the room yet, so this goes to the staff who own the
            // property — otherwise the thread's first notification has no audience.
            void this.notifyPropertyStaff(
              event.propertyId,
              event.conversationId,
            );
            break;
          }
        }
      }),
    );
  }

  onModuleDestroy() {
    this.subscription.unsubscribe();
  }

  /**
   * Tells the owner and caretaker of a property that its group thread now exists.
   *
   * Resolved from the property row rather than tracked in memory: this runs on a
   * lazy create that can happen on any request, so there is no earlier moment at
   * which a map could have been populated.
   */
  private async notifyPropertyStaff(
    propertyId: string,
    conversationId: string,
  ) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { ownerId: true, caretakerId: true },
    });
    if (!property) return;

    // `caretakerId` is nullable — a property can be listed with nobody assigned
    // yet, and there is no room to emit to for a person who does not exist.
    for (const profileId of [property.ownerId, property.caretakerId]) {
      if (!profileId) continue;

      this.server.to(userRoom(profileId)).emit('conversation:updated', {
        conversationId,
        reason: 'created',
      });
    }
  }

  /**
   * Runs once per connection, before any event can be handled.
   *
   * The bearer token arrives in the handshake `auth` block. It is resolved to a
   * session *once*, here, and the result is parked on `socket.data.user`. Every
   * later event reads that field instead of re-verifying — which matters because
   * this app's token is a database-backed Better Auth session, not a stateless
   * JWT, so re-verifying per message would mean a query per keystroke.
   *
   * A failed handshake is closed immediately and never announced as connected, so
   * an unauthenticated client has no channel to emit on at all.
   */
  async handleConnection(client: ChatSocket) {
    try {
      const user = await this.resolveHandshake(client);

      client.data.user = user;
      client.data.authenticatedAt = new Date();

      // Every socket this person has open joins their personal room. Emitting to
      // it reaches all their devices at once, which is what makes a message sent
      // from a phone appear on a tablet with no extra bookkeeping.
      await client.join(userRoom(user.profile.id));

      this.logger.log(
        `connected ${user.profile.id} (${user.profile.role}) socket=${client.id}`,
      );
      client.emit('connection:ready', {
        profileId: user.profile.id,
        role: user.profile.role,
      });
    } catch (error) {
      // Do not echo the underlying reason to a client that has not proven who it
      // is; the log line is for the operator.
      this.logger.warn(
        `rejected connection socket=${client.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      client.emit('connection:error', {
        ok: false,
        code: 401,
        message: 'Your session has expired. Please sign in again.',
      });
      client.disconnect(true);
    }
  }

  /**
   * Socket teardown. Rooms are cleaned up by Socket.IO itself — no bookkeeping
   * here, because membership lives in the database, not in memory.
   */
  handleDisconnect(client: ChatSocket) {
    const user = client.data.user;
    if (!user) return;
    this.logger.log(
      `disconnected ${user.profile.id} socket=${client.id} ` +
        `(rooms: ${client.rooms.size})`,
    );
  }

  /**
   * Joins this device to a thread's room so its messages arrive.
   *
   * Subscribing is authorized, then the room is joined. A client that is not in
   * the thread is refused rather than silently ignored, so a stale id surfaces as
   * a readable error instead of a thread that mysteriously never updates.
   */
  @SubscribeMessage('conversation:subscribe')
  async handleSubscribe(
    @MessageBody(WsValidationPipe) dto: SubscribeConversationDto,
    @ConnectedSocket() client: ChatSocket,
  ) {
    return this.ack('conversation:subscribe', async () => {
      if (isWsValidationFailure(dto)) return dto.__wsInvalidPayload;

      const user = this.requireUser(client);

      // Membership, not "am I allowed to know this id exists" — the row is the
      // authority, so there is one answer for every entry point.
      await this.authorization.assertParticipant(
        dto.conversationId,
        user.profile.id,
      );

      await client.join(conversationRoom(dto.conversationId));

      return { ok: true as const, conversationId: dto.conversationId };
    });
  }

  /** Leaves a thread's room without ending the connection. */
  @SubscribeMessage('conversation:unsubscribe')
  async handleUnsubscribe(
    @MessageBody(WsValidationPipe) dto: SubscribeConversationDto,
    @ConnectedSocket() client: ChatSocket,
  ) {
    return this.ack('conversation:unsubscribe', async () => {
      if (isWsValidationFailure(dto)) return dto.__wsInvalidPayload;

      this.requireUser(client);
      await client.leave(conversationRoom(dto.conversationId));
      return { ok: true as const, conversationId: dto.conversationId };
    });
  }

  /**
   * Relays "this person is typing" to the rest of the open thread.
   *
   * Authorized by room membership rather than a database read. Typing carries no
   * state worth persisting, the sender can only ever name a thread they have
   * already subscribed to, and a membership query per keystroke would put the
   * database on the typing path for nothing. A socket outside the room has
   * nobody to relay to — that is an ignored keystroke, not a failure worth
   * returning, so the ack still reports ok: the client has nothing to retry.
   */
  @SubscribeMessage('typing:state')
  async handleTyping(
    @MessageBody(WsValidationPipe) dto: TypingDto,
    @ConnectedSocket() client: ChatSocket,
  ) {
    return this.ack('typing:state', async () => {
      if (isWsValidationFailure(dto)) return dto.__wsInvalidPayload;

      const user = this.requireUser(client);
      const room = conversationRoom(dto.conversationId);

      if (!client.rooms.has(room)) {
        return { ok: true as const, conversationId: dto.conversationId };
      }

      // `client.to(room)` excludes this socket but not the sender's other
      // devices — which is why the payload carries the sender's `profileId`
      // and receivers ignore their own.
      client.to(room).emit('typing:state', {
        conversationId: dto.conversationId,
        profileId: user.profile.id,
        name: user.user.name,
        typing: dto.typing,
      });

      return { ok: true as const, conversationId: dto.conversationId };
    });
  }

  /**
   * Persists a message and pushes it to everyone in the thread.
   *
   * The write and the thread's `lastMessageAt` bump are one transaction. If they
   * were not, a crash between them would leave a sent message missing from the
   * sender's own inbox ordering — a bug that looks like data loss to the person
   * who typed it.
   *
   * The broadcast deliberately includes the sender. The sender's device needs the
   * confirmation to resolve its optimistic bubble, and any *other* device they
   * have open needs the message to appear; filtering the sender out would need a
   * second emit and would still miss their second device.
   */
  @SubscribeMessage('message:send')
  async handleSend(
    @MessageBody(WsValidationPipe) dto: SendMessageDto,
    @ConnectedSocket() client: ChatSocket,
  ): Promise<SendAck | ChatErrorAck> {
    return this.ack<SendAck>('message:send', async () => {
      if (isWsValidationFailure(dto)) return dto.__wsInvalidPayload;

      const user = this.requireUser(client);

      // Re-checked on every send, never inferred from the room. Rooms say where to
      // deliver; they do not say who is allowed to write, and a client can emit
      // this event with any conversation id it likes.
      await this.authorization.assertParticipant(
        dto.conversationId,
        user.profile.id,
      );

      const content = dto.content.trim();
      if (!content) {
        // `@IsNotEmpty()` only rules out `''`, so `"   "` still reaches here.
        throw new ForbiddenException('Message cannot be empty');
      }

      const message = await this.persistMessage(
        dto.conversationId,
        user,
        content,
      );

      const view = await this.toMessageView(message);

      // `clientId` rides along on the broadcast as well as the ack because the
      // sender cannot know which arrives first. The ack is guaranteed for its own
      // send, but the broadcast may well land first — and without the id, a client
      // would append the real row and *then* try to replace its optimistic bubble,
      // showing the message twice.
      this.server.to(conversationRoom(dto.conversationId)).emit('message:new', {
        conversationId: dto.conversationId,
        clientId: dto.clientId,
        message: view,
      });

      // The sender is also notified through the `user:` room, so a message sent
      // into a thread they have not opened still moves their unread count.
      this.server.to(userRoom(user.profile.id)).emit('conversation:touched', {
        conversationId: dto.conversationId,
        clientId: dto.clientId,
        message: view,
      });

      // Echoed so the sender can replace its optimistic bubble with the real row.
      return {
        ok: true as const,
        clientId: dto.clientId,
        conversationId: dto.conversationId,
        message: view,
      };
    });
  }

  /**
   * Moves the caller's read cursor forward.
   *
   * Capped at the thread's newest message rather than `now()`: advancing past a
   * message that has not arrived yet would mark unread messages as read.
   */
  @SubscribeMessage('message:read')
  async handleRead(
    @MessageBody(WsValidationPipe) dto: MarkReadDto,
    @ConnectedSocket() client: ChatSocket,
  ) {
    return this.ack('message:read', async () => {
      if (isWsValidationFailure(dto)) return dto.__wsInvalidPayload;

      const user = this.requireUser(client);
      await this.authorization.assertParticipant(
        dto.conversationId,
        user.profile.id,
      );

      const conversation = await this.prisma.conversation.findUnique({
        where: { id: dto.conversationId },
        select: { lastMessageAt: true },
      });
      const readAt = conversation?.lastMessageAt ?? new Date();

      await this.prisma.conversationParticipant.update({
        where: {
          conversationId_profileId: {
            conversationId: dto.conversationId,
            profileId: user.profile.id,
          },
        },
        data: { lastReadAt: readAt },
      });

      return {
        ok: true as const,
        conversationId: dto.conversationId,
        lastReadAt: readAt,
      };
    });
  }

  /**
   * Runs a handler body and turns anything it throws into a failure ack.
   *
   * The event name is passed only so the log line names the same thing the client
   * is waiting on; the ack itself travels as the return value, which is what Nest
   * hands to Socket.IO's callback.
   *
   * A 5xx is logged with its stack and answered with a generic message — the real
   * reason is in the operator's log, not echoed to whoever is on the other end of
   * the socket.
   */
  private async ack<T>(
    event: string,
    work: () => Promise<T | ChatErrorAck>,
  ): Promise<T | ChatErrorAck> {
    try {
      return await work();
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const message =
          status >= 500 ? 'Something went wrong. Please try again.' : extractMessage(error);

        if (status >= 500) {
          this.logger.error(
            `${event} ${status} ${extractMessage(error)}`,
            error.stack,
          );
        } else {
          this.logger.warn(`${event} ${status} ${extractMessage(error)}`);
        }

        return { ok: false, code: status, message };
      }

      // Not an expected rejection: a null dereference, a constraint violation.
      // Unclear to the caller, so logged loudly and reported vaguely.
      this.logger.error(
        `${event} failed unexpectedly`,
        error instanceof Error ? error.stack : String(error),
      );
      return {
        ok: false,
        code: 500,
        message: 'Something went wrong. Please try again.',
      };
    }
  }

  /** Inserts the message and bumps the thread's ordering key atomically. */
  private async persistMessage(
    conversationId: string,
    user: AuthenticatedUser,
    content: string,
  ) {
    const createdAt = new Date();

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: user.profile.id,
          content,
          createdAt,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: createdAt },
      }),
    ]);

    return message;
  }

  private async toMessageView(message: {
    id: string;
    conversationId: string;
    content: string;
    createdAt: Date;
    senderId: string;
  }): Promise<ChatMessageView> {
    const sender = await this.prisma.userProfile.findUniqueOrThrow({
      where: { id: message.senderId },
      select: { id: true, role: true, user: { select: { name: true } } },
    });

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      createdAt: message.createdAt,
      sender: { id: sender.id, name: sender.user.name, role: sender.role },
    };
  }

  /**
   * Reads the authenticated profile off the socket.
   *
   * Throws rather than returning null: every handler needs it, and a missing
   * value means the connection was never authenticated, which is a fault worth
   * surfacing as a 401 rather than a crash further down.
   */
  private requireUser(client: ChatSocket): AuthenticatedUser {
    const user = client.data?.user;
    if (!user) {
      throw new UnauthorizedException('Socket is not authenticated');
    }
    return user;
  }

  /**
   * Resolves the handshake token to a session.
   *
   * Accepts the token from `auth.token` (Socket.IO's own header bag, what the
   * client sets) and falls back to a bearer `Authorization` header for tooling
   * that cannot set `auth` — Node test harnesses do not always pass it through.
   */
  private async resolveHandshake(
    client: ChatSocket,
  ): Promise<AuthenticatedUser> {
    const handshake = client.handshake as unknown as {
      auth?: Record<string, unknown>;
      headers?: Record<string, unknown>;
    };

    const fromAuth = handshake.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth) {
      return this.sessions.authenticateToken(fromAuth);
    }

    const header = handshake.headers?.['authorization'];
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return this.sessions.authenticateToken(
        header.slice('Bearer '.length).trim(),
      );
    }

    throw new UnauthorizedException('Missing handshake token');
  }
}