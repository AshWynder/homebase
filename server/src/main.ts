import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { R2Service } from './common/storage/r2.service';

const logger = new Logger('Bootstrap');

// B4 GOING TO PRODUCTION ADD PREFIX 'api/v1' FOR OUR ENDPOINTS

async function bootstrap() {
  // rawBody is required to verify Paystack webhook signatures (HMAC of raw payload)
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Photo uploads are the one feature that silently no-ops on a misconfigured
  // server, and the only symptom a user sees is a rejected request much later.
  // Saying so at boot turns a 30-minute debugging session into one log line.
  // Not fatal: the rest of the API works fine without object storage.
  const r2 = app.get(R2Service);
  if (!r2.isConfigured) {
    logger.warn(
      `R2 is NOT configured (${r2.describeConfiguration()}) — ` +
        'maintenance photo uploads will fail until this is fixed. ' +
        'If the keys are in your env file, the server process is probably ' +
        'running an older environment and needs restarting.',
    );
  }

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const reflector = app.get(Reflector);
  // Errors (guard rejections, validation, 404s) bypass interceptors,
  // so rejected requests are logged by the exception filter instead.
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(reflector),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
