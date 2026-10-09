import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatAuthorizationService } from './chat-authorization.service';
import { ChatMembershipService } from './chat-membership.service';
import { ChatEventsService } from './chat-events.service';
import { ChatGateway } from './chat.gateway';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ChatAuthorizationService,
    ChatMembershipService,
    ChatEventsService,
    // Registered as a provider rather than attached to a controller: Nest only
    // instantiates a gateway once something injects it, and a gateway nobody
    // injects never connects to the websocket server.
    ChatGateway,
  ],
  // TenanciesModule needs ChatMembershipService to keep group membership in step
  // with tenancy start and termination. The membership and authorization rules
  // are exported so the gateway (same module) and tenancies (other module) share
  // one implementation.
  exports: [
    ChatMembershipService,
    ChatAuthorizationService,
    ConversationsService,
    ChatEventsService,
  ],
})
export class ChatModule {}