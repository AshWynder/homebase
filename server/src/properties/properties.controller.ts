import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { AssignCaretakerDto } from './dto/assign-caretaker.dto';
import { Property } from '../../generated/prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ResponseMessage('Property created successfully')
  create(
    @Body() dto: CreatePropertyDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.create(dto, auth?.profile.id);
  }

  @Get()
  @ResponseMessage('Properties fetched successfully')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property[]> {
    // Always scope the list to properties the caller manages (owner or caretaker).
    return this.propertiesService.findAll(page, limit, auth);
  }

  @Get(':id')
  @ResponseMessage('Property fetched successfully')
  findOne(
    @Param('id') id: string,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.findOne(id, auth);
  }

  // `:id/caretaker` routes sit above `PATCH ':id'`/`DELETE ':id'` by segment
  // count rather than declaration order, but keeping them adjacent to the read
  // routes makes the caretaker lifecycle easy to find.

  @Post(':id/caretaker')
  @ResponseMessage('Caretaker assigned successfully')
  assignCaretaker(
    @Param('id') id: string,
    @Body() dto: AssignCaretakerDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.assignCaretaker(id, dto, auth!);
  }

  @Delete(':id/caretaker')
  @ResponseMessage('Caretaker removed successfully')
  removeCaretaker(
    @Param('id') id: string,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.removeCaretaker(id, auth!);
  }

  @Patch(':id')
  @ResponseMessage('Property updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.update(id, dto, auth!);
  }

  @Delete(':id')
  @ResponseMessage('Property deleted successfully')
  remove(
    @Param('id') id: string,
    @CurrentUser() auth?: AuthenticatedUser,
  ): Promise<Property> {
    return this.propertiesService.remove(id, auth!);
  }
}
