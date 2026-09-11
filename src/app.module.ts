import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropertiesModule } from './properties/properties.module';
import { AuthModule } from './auth/auth.module';
import { UnitsModule } from './units/units.module';

@Module({
  imports: [PropertiesModule, AuthModule, UnitsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
