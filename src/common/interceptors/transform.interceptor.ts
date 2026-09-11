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

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
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
