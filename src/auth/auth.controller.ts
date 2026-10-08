import {
  Controller,
  Post,
  Body,
  All,
  Req,
  Res,
  Next,
} from '@nestjs/common';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { ResponseMessage } from '../common/decorators/response-message.decorator';

const authHandler = toNodeHandler(auth);

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('User registered successfully')
  async register(@Body() dto: SignUpDto) {
    return this.authService.register(dto);
  }

  @All('{*path}')
  async handleAuth(@Req() req: any, @Res() res: any, @Next() next: any) {
    await authHandler(req, res);
  }
}
