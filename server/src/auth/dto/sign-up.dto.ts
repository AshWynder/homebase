import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MinLength,
} from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

export class SignUpDto {
  @IsEmail({}, { message: 'Must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name: string;

  @IsString()
  @Length(3, 30, { message: 'Username must be between 3 and 30 characters' })
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'Username may only contain letters, numbers, dots, and underscores',
  })
  username: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Role must be OWNER, CARETAKER, or TENANT' })
  role?: Role;

  @IsOptional()
  @IsString()
  nationalId?: string;
}
