import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';
import { isHttp } from '../context/context.util';

/**
 * Wraps every successful HTTP response in the `{ success, data, ... }` envelope
 * the client expects.
 *
 * HTTP only. This interceptor is global, so it also runs for websocket
 * handlers — where there is no status code, no `path`, and `switchToHttp()` hands
 * back an empty object, so `response.headersSent` would throw. A gateway event
 * already has its own wire format (an acknowledgement payload the client
 * matches on), so there is nothing to wrap; non-HTTP contexts pass through
 * untouched.
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    if (!isHttp(context)) {
      return next.handle();
    }

    const shouldBypass = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (shouldBypass) {
      return next.handle();
    }

    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();
    const request = httpContext.getRequest();

    const customMessage = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data) => {
        // If response headers have already been sent (e.g., custom streaming or raw write)
        if (response.headersSent) {
          return data;
        }

        const statusCode = response.statusCode ?? 200;

        return {
          success: true,
          statusCode,
          message: customMessage || 'Operation successful',
          data: data !== undefined ? data : null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
