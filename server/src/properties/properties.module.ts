import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PropertiesService } from './properties.service';
import { PropertiesController } from './properties.controller';
import { AuthModule } from '../auth/auth.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  // AuthModule so assigning a caretaker can reuse the register flow (better-auth
  // signup + profile row) instead of duplicating it. ChatModule so the same
  // call can seat the new caretaker in the property's group thread; chat does
  // not import properties, so no cycle forms.
  imports: [PrismaModule, AuthModule, ChatModule],
  controllers: [PropertiesController],
  providers: [PropertiesService],
})
export class PropertiesModule {}
