import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthSessionService } from './auth-session.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [AuthService, AuthSessionService],
  // AuthSessionService is exported for the chat gateway: the websocket handshake
  // authenticates with exactly the same session lookup the HTTP guard uses, so
  // there is one place that knows how a token becomes a user.
  exports: [AuthService, AuthSessionService],
})
export class AuthModule {}