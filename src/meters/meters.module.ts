import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MetersService } from './meters.service';
import { MetersController } from './meters.controller';

@Module({
  imports: [PrismaModule],
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}