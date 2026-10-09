import {
  Body,
  Controller,
  Get,
  All,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { toNodeHandler } from 'better-auth/node';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { auth } from './auth';
import { AuthService, type UploadedAvatar } from './auth.service';
import { QueryUsersDto } from './dto/query-users.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const authHandler = toNodeHandler(auth);

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ResponseMessage('User registered successfully')
  async register(@Body() dto: SignUpDto) {
    return this.authService.register(dto);
  }

  /**
   * Returns the better-auth user plus the linked UserProfile (id, role, phone).
   */
  @Get('me')
  @ResponseMessage('Current user fetched successfully')
  me(@CurrentUser() auth?: AuthenticatedUser) {
    return { user: auth!.user, profile: auth!.profile };
  }

  /**
   * Updates user name, phone, email, and/or nationalId.
   */
  @Patch('profile')
  @ResponseMessage('Profile updated successfully')
  updateProfile(
    @Body() dto: UpdateProfileDto,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.authService.updateProfile(dto, auth);
  }

  /**
   * Uploads and updates the user's avatar image.
   */
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB ceiling
    }),
  )
  @ResponseMessage('Avatar uploaded successfully')
  uploadAvatar(
    @UploadedFile() file: UploadedAvatar,
    @CurrentUser() auth: AuthenticatedUser,
  ) {
    return this.authService.uploadAvatar(file, auth);
  }

  /**
   * Changes the authenticated user's password.
   */
  @Post('change-password')
  @ResponseMessage('Password changed successfully')
  changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() auth: AuthenticatedUser,
    @Req() req: any,
  ) {
    return this.authService.changePassword(dto, auth, req.headers);
  }

  /**
   * User profiles for the owner-side pickers (assign tenant, etc.).
   * MUST stay above the Better Auth catch-all below.
   */
  @Get('users')
  @ResponseMessage('Users fetched successfully')
  findUsers(
    @Query() query: QueryUsersDto,
    @CurrentUser() auth?: AuthenticatedUser,
  ) {
    return this.authService.findUsers(query, auth!);
  }

  // NOTE: must stay last — it is the Better Auth catch-all passthrough.
  @Public()
  @All('{*path}')
  async handleAuth(@Req() req: any, @Res() res: any) {
    await authHandler(req, res);
  }
}
