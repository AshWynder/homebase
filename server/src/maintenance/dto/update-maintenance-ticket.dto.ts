import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { TicketStatus } from '../../../generated/prisma/enums';

export class UpdateMaintenanceTicketDto {
  @IsOptional()
  @IsString({ message: 'description must be a string' })
  @MaxLength(2000, { message: 'description cannot exceed 2000 characters' })
  description?: string;

  @IsOptional()
  @IsEnum(TicketStatus, { message: 'status must be OPEN, IN_PROGRESS, or RESOLVED' })
  status?: TicketStatus;

  // Required in practice when status moves to IN_PROGRESS or RESOLVED — the
  // service enforces that so a caretaker cannot close a repair silently.
  @IsOptional()
  @IsString({ message: 'remarks must be a string' })
  @MaxLength(2000, { message: 'remarks cannot exceed 2000 characters' })
  remarks?: string;
}
