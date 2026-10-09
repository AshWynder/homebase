import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { ChatAuthorizationService } from './chat-authorization.service';
import { ConversationsService } from './conversations.service';
import {
  CreateDirectConversationDto,
  QueryConversationsDto,
  QueryMessagesDto,
} from './dto/query-conversations.dto';

/**
 * Conversation reads and the two ways of opening a thread.
 *
 * Reads only. Sending happens over the websocket gateway — see `chat.gateway.ts`
 * — so there is no `POST /:id/messages` here; that path exists solely as
 * `POST /:id/read` for the read cursor.
 */
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly authorization: ChatAuthorizationService,
  ) {}

  /** The caller's inbox: direct threads plus property groups. */
  @Get()
  @ResponseMessage('Conversations fetched successfully')
  findAll(
    @Query() query: QueryConversationsDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.findAll(query, auth);
  }

  // Declared before ':id' on purpose — Nest matches in declaration order, so a
  // ':id' route above this would capture the literal "count" and fail UUID
  // validation instead of reaching this handler.
  @Get('count')
  @ResponseMessage('Unread conversation count fetched successfully')
  count(@CurrentUser() auth: AuthenticatedUser) {
    return this.conversations.unreadCount(auth);
  }

  /**
   * Everyone this caller may open a direct thread with — the "start a chat"
   * picker.
   *
   * Also declared before ':id' for the same reason as `count`.
   *
   * Flat rather than paginated: the set is bounded by the caller's own
   * relationships (one landlord, one caretaker, the residents of their
   * properties), so it is tens of rows rather than a directory. Paginating it
   * would only add a "load more" to a list that never needs one.
   */
  @Get('people')
  @ResponseMessage('Messageable people fetched successfully')
  people(@CurrentUser() auth: AuthenticatedUser) {
    return this.authorization.messageableProfiles(auth.profile);
  }

  /** Properties whose group thread this caller may open — the other picker list. */
  @Get('groups')
  @ResponseMessage('Available group conversations fetched successfully')
  groups(@CurrentUser() auth: AuthenticatedUser) {
    return this.authorization.messageableGroups(auth.profile);
  }

  /** Opens a direct thread with someone the caller is allowed to message. */
  @Post('direct')
  @ResponseMessage('Conversation opened successfully')
  createDirect(
    @Body() dto: CreateDirectConversationDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.createDirectConversation(dto, auth);
  }

  /** Opens (or returns) a property's standing group thread. */
  @Get('group/:propertyId')
  @ResponseMessage('Group conversation fetched successfully')
  openGroup(
    @Param('propertyId') propertyId: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.openGroupConversation(propertyId, auth);
  }

  /** One page of a thread's history. */
  @Get(':id/messages')
  @ResponseMessage('Messages fetched successfully')
  findMessages(
    @Param('id') id: string,
    @Query() query: QueryMessagesDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.findMessages(id, query, auth);
  }

  /** Thread details, for the header and member list. */
  @Get(':id')
  @ResponseMessage('Conversation fetched successfully')
  findOne(
    @Param('id') id: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.findOne(id, auth);
  }

  /**
   * Moves the caller's read cursor to the newest message.
   *
   * Also emitted as a socket event while the thread is open; this endpoint is
   * what makes marking read survive the socket being down, and it is what the
   * tenant list uses to clear a badge.
   */
  @Post(':id/read')
  @ResponseMessage('Conversation marked as read successfully')
  markRead(
    @Param('id') id: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.conversations.markRead(id, auth);
  }
}