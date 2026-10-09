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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

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
  findAll(
    @Query() query: QueryUnitsDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.unitsService.findAll(query, auth);
  }

  @Get('property/:propertyId')
  @ResponseMessage('Property units fetched successfully')
  findByProperty(
    @Param('propertyId') propertyId: string,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.unitsService.findByPropertyId(propertyId, auth);
  }

  @Get(':id')
  @ResponseMessage('Unit details fetched successfully')
  findOne(
    @Param('id') id: string,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.unitsService.findOne(id, auth);
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
