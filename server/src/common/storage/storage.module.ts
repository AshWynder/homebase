import { Global, Module } from '@nestjs/common';

import { R2Service } from './r2.service';

/**
 * Global so any module can inject R2Service without re-importing it, matching
 * how PrismaModule is wired.
 */
@Global()
@Module({
  providers: [R2Service],
  exports: [R2Service],
})
export class StorageModule {}
