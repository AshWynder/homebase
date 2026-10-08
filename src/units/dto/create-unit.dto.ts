import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUnitDto {
  @IsString()
  @IsNotEmpty({ message: 'Unit number is required' })
  unitNumber: string;

  @IsString()
  @IsOptional()
  blockName?: string;

  @IsUUID(undefined, { message: 'propertyId must be a valid UUID' })
  @IsNotEmpty({ message: 'propertyId is required' })
  propertyId: string;
}
