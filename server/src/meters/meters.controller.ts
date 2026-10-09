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
import { MetersService } from './meters.service';
import { CreateMeterDto } from './dto/create-meter.dto';
import { UpdateMeterDto } from './dto/update-meter.dto';
import { QueryMetersDto } from './dto/query-meters.dto';
import { RecordReadingDto } from './dto/record-reading.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Post()
  @ResponseMessage('Meter created successfully')
  create(@Body() dto: CreateMeterDto) {
    return this.metersService.create(dto);
  }

  @Get()
  @ResponseMessage('Meters fetched successfully')
  findAll(
    @Query() query: QueryMetersDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    // Scoped to the properties the caller manages (owner or caretaker).
    return this.metersService.findAll(query, auth);
  }

  @Get(':id')
  @ResponseMessage('Meter details fetched successfully')
  findOne(@Param('id') id: string) {
    return this.metersService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Meter updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateMeterDto) {
    return this.metersService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Meter deleted successfully')
  remove(@Param('id') id: string) {
    return this.metersService.remove(id);
  }

  @Post(':id/readings')
  @ResponseMessage('Meter reading recorded successfully')
  recordReading(@Param('id') id: string, @Body() dto: RecordReadingDto) {
    return this.metersService.recordReading(id, dto);
  }

  @Get(':id/readings')
  @ResponseMessage('Meter readings fetched successfully')
  findReadings(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.metersService.findReadings(id, { page, limit });
  }
}