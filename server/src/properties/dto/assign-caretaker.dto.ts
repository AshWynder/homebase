import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

/**
 * Assigning a caretaker is one round trip that either creates the account and
 * attaches it, or attaches one that already exists — the client never has to
 * orchestrate register-then-patch and risk an orphaned login if step two fails.
 *
 * Which fields are required depends on `mode`, so the presence checks live in
 * the service (one error message per mode rather than class-validator's
 * "field required" noise when the wrong shape arrives). The decorators below
 * only constrain the shape of what is sent.
 */
export class AssignCaretakerDto {
  @IsIn(['create', 'existing'], {
    message: "mode must be 'create' or 'existing'",
  })
  mode: 'create' | 'existing';

  // mode: 'create'
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Must be a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password?: string;

  // mode: 'existing'
  @IsOptional()
  @IsUUID()
  profileId?: string;
}
