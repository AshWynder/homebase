import { IsOptional, IsUUID } from 'class-validator';

export class QueryInvoiceSummaryDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;
}
