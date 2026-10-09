import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsPositive, IsUUID } from 'class-validator';

import { TicketStatus } from '../../../generated/prisma/enums';

export class QueryMaintenanceTicketsDto {
  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  /**
   * Reporter filter. Only meaningful for owner-side callers; a tenant's
   * results are always narrowed to their own profile id regardless.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'tenantId must be a valid UUID' })
  tenantId?: string;

  @IsOptional()
  @IsEnum(TicketStatus, {
    message: 'status must be one of: OPEN, IN_PROGRESS, RESOLVED',
  })
  status?: TicketStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}
