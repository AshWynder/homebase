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
import { UnitsService } from './units.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { QueryUnitsDto } from './dto/query-units.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

@Controller('units')
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post()
  @ResponseMessage('Unit created successfully')
  create(@Body() dto: CreateUnitDto) {
    return this.unitsService.create(dto);
  }

  @Get()
  @ResponseMessage('Units fetched successfully')
  findAll(@Query() query: QueryUnitsDto) {
    return this.unitsService.findAll(query);
  }

  @Get('property/:propertyId')
  @ResponseMessage('Property units fetched successfully')
  findByProperty(@Param('propertyId') propertyId: string) {
    return this.unitsService.findByPropertyId(propertyId);
  }

  @Get(':id')
  @ResponseMessage('Unit details fetched successfully')
  findOne(@Param('id') id: string) {
    return this.unitsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Unit updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Unit deleted successfully')
  remove(@Param('id') id: string) {
    return this.unitsService.remove(id);
  }
}
