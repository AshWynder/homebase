import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  // Optional: the global AuthGuard supplies the ownerId from the
  // authenticated user's profile; clients may still send it explicitly.
  @IsUUID()
  @IsOptional()
  ownerId?: string;

  @IsUUID()
  @IsOptional()
  caretakerId?: string;
}
