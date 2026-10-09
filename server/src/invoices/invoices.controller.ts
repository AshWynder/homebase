import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { QueryInvoicesDto } from './dto/query-invoices.dto';
import { QueryInvoiceSummaryDto } from './dto/query-invoice-summary.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('generate')
  @ResponseMessage('Invoices generated successfully')
  generate(@Body() dto: GenerateInvoicesDto) {
    return this.invoicesService.generate(dto);
  }

  @Get()
  @ResponseMessage('Invoices fetched successfully')
  findAll(
    @Query() query: QueryInvoicesDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    // Always scope the list to properties the caller manages (owner or caretaker).
    return this.invoicesService.findAll(query, auth);
  }

  // Declared before ':id' on purpose — Nest matches in declaration order, so a
  // ':id' route above this would capture the literal "summary" and fail UUID
  // validation instead of reaching the summary handler.
  @Get('summary')
  @ResponseMessage('Invoice summary fetched successfully')
  summary(
    @Query() query: QueryInvoiceSummaryDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.invoicesService.summary(query, auth);
  }

  @Get(':id')
  @ResponseMessage('Invoice details fetched successfully')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Invoice updated successfully')
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.invoicesService.update(id, dto);
  }

  @Post(':id/refresh')
  @ResponseMessage('Invoice refreshed successfully')
  refresh(@Param('id') id: string) {
    return this.invoicesService.refresh(id);
  }
}