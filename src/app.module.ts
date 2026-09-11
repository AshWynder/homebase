import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PropertiesModule } from './properties/properties.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PropertiesModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
