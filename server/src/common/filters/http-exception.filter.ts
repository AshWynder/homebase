import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { Request, Response } from 'express';
import { WsException } from '@nestjs/websockets';

import { isWebsocketHost, type SocketLike } from '../context/context.util';

/**
 * Translates multer's upload failures into proper HTTP statuses.
 *
 * Multer rejects an oversize or over-count upload by throwing, and that error
 * is not an `HttpException`, so without this it would fall through to the 500
 * branch below and report a server fault for what is really a client mistake.
 */
function toHttpException(
  error: MulterError,
): PayloadTooLargeException | BadRequestException {
  if (error.code === 'LIMIT_FILE_SIZE' || error.code === 'LIMIT_PART_COUNT') {
    return new PayloadTooLargeException(
      error.code === 'LIMIT_FILE_SIZE'
        ? 'That file is too large to upload'
        : 'That upload has too many parts',
    );
  }

  // Too many files, or a file under a field name the endpoint does not accept.
  // Both are request-shape problems rather than size problems, so 400.
  if (error.code === 'LIMIT_FILE_COUNT') {
    return new BadRequestException('Too many files uploaded');
  }

  // An unexpected field name: the client sent a form field this endpoint does
  // not read, which is a request-shape problem too.
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return new BadRequestException(
      `Unexpected file field "${error.field}". Upload files using the "${error.field}" form field.`,
    );
  }

  return new BadRequestException(error.message);
}

/**
 * Global exception filter that logs every rejected request
 * (guard rejections, validation errors, handler errors, 404s) and every failed
 * websocket event.
 *
 * Interceptors only run for requests that pass the guards, so error
 * logging lives here instead — this is the Nest-native counterpart to
 * morgan's error logging.
 *
 * Response bodies are delegated to the exception payload itself, so the
 * API contract stays exactly the same as Nest's default behaviour.
 *
 * Global filters also see websocket handlers. There is no HTTP response to write
 * to in that case, so the failure is reported to the socket instead — see
 * `catchWebsocket`.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');
  private readonly socketLogger = new Logger('WS');

  catch(exception: unknown, host: ArgumentsHost): void {
    // Normalise upload failures into real HTTP exceptions before the checks
    // below, which all key off `instanceof HttpException`.
    const normalised =
      exception instanceof MulterError ? toHttpException(exception) : exception;

    const status =
      normalised instanceof HttpException
        ? normalised.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (isWebsocketHost(host)) {
      this.catchWebsocket(normalised, status, host);
      return;
    }

    const payload =
      normalised instanceof HttpException
        ? normalised.getResponse()
        : {
            statusCode: status,
            message: 'Internal server error',
          };

    const message =
      typeof payload === 'string'
        ? payload
        : ((payload as { message?: string | string[] }).message ?? '');

    const request = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();

    const line = `${request.method} ${request.url} ${status} ${
      Array.isArray(message) ? message.join('; ') : message
    }`;

    if (status >= 500) {
      this.logger.error(
        line,
        normalised instanceof Error ? normalised.stack : undefined,
      );
    } else {
      this.logger.warn(line);
    }

    if (!response.headersSent) {
      response.status(status).json(payload);
    }
  }

  /**
   * Reports a failed gateway event back over the socket.
   *
   * The gateway throws `WsException({ event, message })`, so the event name comes
   * back out of `getError()`. `WsException` itself only carries a string, which
   * is why the payload is the structured form.
   *
   * The emitted envelope mirrors the success path, so the client has a single
   * `{ ok, ... }` shape to branch on regardless of transport.
   *
   * A raw non-`WsException` (a genuine bug) is logged and *not* emitted — a
   * fabricated acknowledgement would be worse than silence, because the client
   * would treat it as a real answer.
   */
  private catchWebsocket(
    exception: unknown,
    status: number,
    host: ArgumentsHost,
  ): void {
    const wsHost = host.switchToWs();
    const client = wsHost.getClient<SocketLike>();

    // The event the client is waiting on. `getPattern()` is the message pattern
    // Nest matched, which is the event name — so a handler can throw a plain
    // ForbiddenException and the failure still lands on the acknowledgement
    // channel that the caller is awaiting. Without this, an expected rejection
    // (not a participant, blank message) would leave the client waiting forever
    // for a reply that never comes.
    const event = wsHost.getPattern();

    const detail = describeWsError(exception, status);

    if (status >= 500) {
      this.socketLogger.error(`${event} ${status} ${detail}`);
    } else {
      this.socketLogger.warn(`${event} ${status} ${detail}`);
    }

    if (!event) {
      this.socketLogger.warn('gateway error outside an event — nothing emitted');
      return;
    }

    client.emit(event, { ok: false, code: status, message: detail });
  }
}

/**
 * A message safe to hand back to the client.
 *
 * A 500's real message is already in the log and is not echoed — a gateway bug
 * should not leak internals onto a socket a caller can read.
 */
function describeWsError(exception: unknown, status: number): string {
  if (status >= 500) return 'Something went wrong. Please try again.';

  if (exception instanceof WsException) {
    const error = exception.getError();
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const { message } = error as { message?: unknown };
      if (typeof message === 'string') return message;
    }
    return exception.message;
  }

  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    const message =
      typeof response === 'string'
        ? response
        : ((response as { message?: string | string[] }).message ?? '');
    return Array.isArray(message) ? message.join('; ') : message;
  }

  return exception instanceof Error ? exception.message : 'Request failed';
}