import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';

import { ResponseMessage } from '../common/decorators/response-message.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';
import { CreateMaintenanceTicketDto } from './dto/create-maintenance-ticket.dto';
import { QueryMaintenanceTicketsDto } from './dto/query-maintenance-tickets.dto';
import { UpdateMaintenanceTicketDto } from './dto/update-maintenance-ticket.dto';
import { MaintenanceService, type UploadedPhoto } from './maintenance.service';
import {
  MAX_TICKET_PHOTOS,
  MAX_TICKET_PHOTO_BYTES,
} from './maintenance.constants';

/** Memory storage: files are buffered, uploaded to R2, then discarded. */
const photoUploadOptions = {
  limits: { files: MAX_TICKET_PHOTOS, fileSize: MAX_TICKET_PHOTO_BYTES },
};

@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Post()
  @UseInterceptors(FilesInterceptor('photos', MAX_TICKET_PHOTOS, photoUploadOptions))
  @ResponseMessage('Maintenance ticket created successfully')
  create(
    @Body() dto: CreateMaintenanceTicketDto,
    @UploadedFiles() files: UploadedPhoto[] | undefined,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.maintenanceService.create(dto, files ?? [], auth);
  }

  @Get()
  @ResponseMessage('Maintenance tickets fetched successfully')
  findAll(
    @Query() query: QueryMaintenanceTicketsDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.maintenanceService.findAll(query, auth);
  }

  @Get(':id')
  @ResponseMessage('Maintenance ticket details fetched successfully')
  findOne(
    @Param('id') id: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.maintenanceService.findOne(id, auth);
  }

  @Patch(':id')
  @ResponseMessage('Maintenance ticket updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceTicketDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.maintenanceService.update(id, dto, auth);
  }

  @Delete(':id')
  @ResponseMessage('Maintenance ticket deleted successfully')
  remove(
    @Param('id') id: string,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.maintenanceService.remove(id, auth);
  }
}
