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
import { TenanciesService } from './tenancies.service';
import { CreateTenancyDto } from './dto/create-tenancy.dto';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { QueryTenanciesDto } from './dto/query-tenancies.dto';
import { TerminateTenancyDto } from './dto/terminate-tenancy.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('tenancies')
export class TenanciesController {
  constructor(private readonly tenanciesService: TenanciesService) {}

  @Post()
  @ResponseMessage('Tenancy created successfully')
  create(@Body() dto: CreateTenancyDto) {
    return this.tenanciesService.create(dto);
  }

  @Get()
  @ResponseMessage('Tenancies fetched successfully')
  findAll(
    @Query() query: QueryTenanciesDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    // Always scope the list to properties the caller manages (owner or caretaker).
    return this.tenanciesService.findAll(query, auth);
  }

  @Get('active')
  @ResponseMessage('Active tenancies fetched successfully')
  findActive(
    @Query() query: QueryTenanciesDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.tenanciesService.findAll({ ...query, isActive: true }, auth);
  }

  @Get(':id')
  @ResponseMessage('Tenancy details fetched successfully')
  findOne(@Param('id') id: string) {
    return this.tenanciesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Tenancy updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateTenancyDto) {
    return this.tenanciesService.update(id, dto);
  }

  @Post(':id/terminate')
  @ResponseMessage('Tenancy terminated successfully')
  terminate(@Param('id') id: string, @Body() dto: TerminateTenancyDto) {
    return this.tenanciesService.terminate(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Tenancy deleted successfully')
  remove(@Param('id') id: string) {
    return this.tenanciesService.remove(id);
  }
}
