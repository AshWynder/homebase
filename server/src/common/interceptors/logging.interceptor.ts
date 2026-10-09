import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Global HTTP request logger (NestJS-native alternative to morgan).
 * Logs method, path, status code and duration for every successful
 * request. Rejected requests are logged by HttpExceptionFilter.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();
    const { method, originalUrl } = request;
    const start = Date.now();

    // Rejected requests (guards, validation, handler errors) never reach
    // this pipe — they are logged once by HttpExceptionFilter instead.
    return next.handle().pipe(
      tap(() => {
        this.log(method, originalUrl, response.statusCode, start);
      }),
    );
  }

  private log(
    method: string,
    url: string,
    statusCode: number,
    start: number,
  ): void {
    this.logger.log(`${method} ${url} ${statusCode} ${Date.now() - start}ms`);
  }
}