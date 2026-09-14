import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class TerminateTenancyDto {
  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'endDate must be a valid ISO date' })
  endDate?: Date;
}
