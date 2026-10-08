import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'dueDate must be a valid ISO date' })
  dueDate?: Date;
}