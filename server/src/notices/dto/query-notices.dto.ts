import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsUUID,
} from 'class-validator';

import { NoticeAudience } from '../../../generated/prisma/enums';

/**
 * Filters for GET /notices.
 *
 * The list means two different things depending on the caller: the notices a
 * tenant received, or the notices an owner sent. Only the filters that make
 * sense for the calling side are honoured, so `audience` narrows an owner's
 * sent list and `unreadOnly` narrows a tenant's inbox.
 *
 * Every property is declared here because the global ValidationPipe runs with
 * `whitelist: true`, so an undeclared query param is silently dropped before it
 * reaches the service rather than rejected.
 */
export class QueryNoticesDto {
  /**
   * Owner-side filter, driven by the shared property filter bar. Matches
   * notices addressed to this specific property, so a portfolio-wide notice
   * (propertyId null) is not returned under a property filter.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  @IsOptional()
  @IsEnum(NoticeAudience, {
    message: 'audience must be one of: ALL_PROPERTIES, PROPERTY, TENANT',
  })
  audience?: NoticeAudience;

  /**
   * Tenant-side filter for the unread badge. Only unread notices are returned;
   * a tenant's read state is per-recipient, so this cannot be evaluated for an
   * owner whose notices have no read state of their own.
   */
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean({ message: 'unreadOnly must be a boolean' })
  unreadOnly?: boolean;

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
