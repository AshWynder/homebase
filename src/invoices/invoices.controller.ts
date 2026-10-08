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
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

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
  findAll(@Query() query: QueryInvoicesDto) {
    return this.invoicesService.findAll(query);
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