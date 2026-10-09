import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { UnitsModule } from './units/units.module';
import { TenanciesModule } from './tenancies/tenancies.module';
import { MetersModule } from './meters/meters.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { NoticesModule } from './notices/notices.module';
import { ChatModule } from './chat/chat.module';
import { StorageModule } from './common/storage/storage.module';

@Module({
  imports: [
    AuthModule,
    PropertiesModule,
    UnitsModule,
    TenanciesModule,
    MetersModule,
    InvoicesModule,
    PaymentsModule,
    MaintenanceModule,
    NoticesModule,
    ChatModule,
    // @Global: provides R2Service to every module.
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global bearer-token guard; routes opt out with @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}