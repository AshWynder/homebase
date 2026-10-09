import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { MetersService } from './meters.service';
import { MetersController } from './meters.controller';

@Module({
  imports: [PrismaModule, InvoicesModule],
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}