import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMaintenanceTicketDto {
  @IsString({ message: 'description must be a string' })
  @IsNotEmpty({ message: 'description is required' })
  @MaxLength(2000, { message: 'description cannot exceed 2000 characters' })
  description: string;

  /**
   * Unit the fault is in.
   *
   * Ignored for TENANT callers — a tenant's unit is resolved from their own
   * active tenancy so a ticket cannot be filed against someone else's unit.
   * Required for OWNER callers filing on a tenant's behalf.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'unitId must be a valid UUID' })
  unitId?: string;

  /**
   * Profile the ticket is attributed to. Same rule as `unitId`: derived for
   * tenants, required from owners, and validated against the unit either way.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'tenantId must be a valid UUID' })
  tenantId?: string;
}
