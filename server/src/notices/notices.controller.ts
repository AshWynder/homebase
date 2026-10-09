import {
  Body,
  Controller,
  Delete,
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
import { CreateNoticeDto } from './dto/create-notice.dto';
import { QueryNoticesDto } from './dto/query-notices.dto';
import { NoticesService } from './notices.service';

@Controller('notices')
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  @ResponseMessage('Notice sent successfully')
  create(@Body() dto: CreateNoticeDto, @CurrentUser() auth: AuthenticatedUser) {
    return this.noticesService.create(dto, auth);
  }

  /**
   * Owner: the notices they sent. Tenant: the notices they received.
   */
  @Get()
  @ResponseMessage('Notices fetched successfully')
  findAll(
    @Query() query: QueryNoticesDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.noticesService.findAll(query, auth);
  }

  // Declared before ':id' on purpose — Nest matches in declaration order, so a
  // ':id' route above this would capture the literal "count" and fail UUID
  // validation instead of reaching this handler.
  @Get('count')
  @ResponseMessage('Unread notice count fetched successfully')
  count(@CurrentUser() auth: AuthenticatedUser) {
    return this.noticesService.countUnread(auth);
  }

  @Get(':id')
  @ResponseMessage('Notice details fetched successfully')
  findOne(@Param('id') id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.noticesService.findOne(id, auth);
  }

  @Post(':id/read')
  @ResponseMessage('Notice marked as read successfully')
  markRead(@Param('id') id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.noticesService.markRead(id, auth);
  }

  @Delete(':id')
  @ResponseMessage('Notice deleted successfully')
  remove(@Param('id') id: string, @CurrentUser() auth: AuthenticatedUser) {
    return this.noticesService.remove(id, auth);
  }
}
