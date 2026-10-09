import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { DarajaService } from './daraja.service';
import { PaystackService } from './paystack.service';

@Module({
  imports: [PrismaModule, InvoicesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, DarajaService, PaystackService],
  exports: [PaymentsService],
})
export class PaymentsModule {}