import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { Subject } from 'rxjs';

/**
 * In-process bus for "something about this thread changed" notifications.
 *
 * Why this exists rather than having `TenanciesService` reach for the gateway
 * directly: the gateway is only instantiated once something injects it, so
 * injecting it into `TenanciesService` would work but couples a tenancy write to a
 * transport. This keeps the membership service unaware of websockets, and the
 * gateway subscribes to the events it cares about.
 *
 * Scope is deliberate: a `Subject` is per-process, so this only reaches sockets
 * attached to *this* instance. That is correct for the single-server deployment
 * this app runs. Scaling out later means replacing this with a Redis adapter or a
 * NATS subject — the publish sites stay exactly as they are, because they already
 * only know the conversation id.
 */
export type ChatDomainEvent =
  | {
      type: 'participants:changed';
      conversationId: string;
      reason: 'tenancy-started' | 'tenancy-terminated' | 'reconciled';
    }
  | {
      type: 'conversation:created';
      conversationId: string;
      propertyId: string;
    };

@Injectable()
export class ChatEventsService implements OnModuleInit {
  private readonly logger = new Logger('ChatEventsService');

  /**
   * Deliberately not `share()`d. Subscribers unsubscribe on module teardown, and
   * leaving a live subscriber attached to a subject that outlives the process
   * keeps a reference chain alive that shows up as a slow leak under test.
   */
  private readonly events = new Subject<ChatDomainEvent>();

  /** Events worth an operator log line, for diagnosing "the badge did not move". */
  publish(event: ChatDomainEvent) {
    this.logger.log(
      `${event.type} conversation=${event.conversationId}` +
        ('reason' in event ? ` reason=${event.reason}` : ''),
    );
    this.events.next(event);
  }

  subscribe() {
    return this.events.asObservable();
  }

  onModuleInit() {
    this.logger.log('chat domain events ready');
  }
}
