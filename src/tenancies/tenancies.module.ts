import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TenanciesService } from './tenancies.service';
import { TenanciesController } from './tenancies.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TenanciesController],
  providers: [TenanciesService],
  exports: [TenanciesService],
})
export class TenanciesModule {}
