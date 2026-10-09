import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

import { NoticeAudience } from '../../../generated/prisma/enums';

export class CreateNoticeDto {
  @IsString({ message: 'title must be a string' })
  @IsNotEmpty({ message: 'title is required' })
  @MaxLength(140, { message: 'title cannot exceed 140 characters' })
  title: string;

  @IsString({ message: 'message must be a string' })
  @IsNotEmpty({ message: 'message is required' })
  @MaxLength(4000, { message: 'message cannot exceed 4000 characters' })
  message: string;

  /**
   * Who the notice is addressed to. The audience decides which of the two
   * scoping fields below is required, and the service resolves it to a concrete
   * recipient list before anything is written.
   *
   * ALL_PROPERTIES takes neither field.
   */
  @IsEnum(NoticeAudience, {
    message: 'audience must be one of: ALL_PROPERTIES, PROPERTY, TENANT',
  })
  audience: NoticeAudience;

  /**
   * The property to address. Required when audience is PROPERTY, and rejected
   * otherwise so a notice cannot carry a property it was not scoped to.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  propertyId?: string;

  /**
   * The single tenant to address. Required when audience is TENANT, and
   * rejected otherwise. The target must hold an active tenancy on one of the
   * sender's properties, so an owner cannot reach a tenant on the platform who
   * has never been theirs.
   */
  @IsOptional()
  @IsUUID(undefined, { message: 'tenantId must be a valid UUID' })
  tenantId?: string;
}
