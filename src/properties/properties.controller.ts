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
import { Property } from '../../generated/prisma/client';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @ResponseMessage('Property created successfully')
  create(@Body() dto: CreatePropertyDto): Promise<Property> {
    return this.propertiesService.create(dto);
  }

  @Get()
  @ResponseMessage('Properties fetched successfully')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<Property[]> {
    return this.propertiesService.findAll(page, limit);
  }

  @Get(':id')
  @ResponseMessage('Property fetched successfully')
  findOne(@Param('id') id: string): Promise<Property> {
    return this.propertiesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Property updated successfully')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePropertyDto,
  ): Promise<Property> {
    return this.propertiesService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Property deleted successfully')
  remove(@Param('id') id: string): Promise<Property> {
    return this.propertiesService.remove(id);
  }
}
