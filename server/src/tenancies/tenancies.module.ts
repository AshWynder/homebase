import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenanciesService } from './tenancies.service';
import { TenanciesController } from './tenancies.controller';
import { ChatModule } from '../chat/chat.module';

@Module({
  // ChatModule (not ChatMembershipService directly) so the module boundary is
  // explicit: tenancies depends on chat, and chat deliberately does not depend
  // back, so nothing can form a cycle.
  imports: [PrismaModule, ChatModule],
  controllers: [TenanciesController],
  providers: [TenanciesService],
  exports: [TenanciesService],
})
export class TenanciesModule {}