import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

/**
 * Filters for GET /api/auth/users.
 *
 * Every property must be declared here: the global ValidationPipe runs with
 * `whitelist: true`, so an undeclared query param is silently dropped before it
 * reaches the service rather than rejected.
 */
export class QueryUsersDto {
  /** Defaults to TENANT — the only role the assignment flow needs. */
  @IsOptional()
  @IsEnum(Role, { message: 'role must be OWNER, CARETAKER, or TENANT' })
  role?: Role;

  /** Free text matched against name, email, phone and national ID. */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120, { message: 'search must be 120 characters or fewer' })
  search?: string;

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
