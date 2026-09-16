import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropertiesModule } from './properties/properties.module';
import { AuthModule } from './auth/auth.module';
import { UnitsModule } from './units/units.module';
import { TenanciesModule } from './tenancies/tenancies.module';
import { MetersModule } from './meters/meters.module';
import { InvoicesModule } from './invoices/invoices.module';

@Module({
  imports: [
    PropertiesModule,
    AuthModule,
    UnitsModule,
    TenanciesModule,
    MetersModule,
    InvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
