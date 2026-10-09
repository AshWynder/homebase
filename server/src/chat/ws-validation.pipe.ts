import {
  PipeTransform,
  ValidationPipe,
  type ArgumentMetadata,
} from '@nestjs/common';

/**
 * Validation for `@MessageBody()` payloads that reports failures through the
 * normal acknowledgement channel.
 *
 * Why this exists instead of the global `ValidationPipe`:
 *
 * Socket.IO acks are function callbacks, and Nest delivers an ack by passing the
 * handler's **return value** into that callback. An exception thrown by the
 * global pipe travels a different route entirely — the exception filter, which
 * holds the socket but never the ack callback. So a malformed payload would be
 * logged correctly and the client would still wait forever for a reply.
 *
 * A pipe can return a value, so this one folds validation failures into the
 * payload and lets the gateway return them. One channel, one place to handle
 * `{ ok: false }`.
 *
 * The sentinel key is namespaced and non-enumerable in spirit: it is a plain
 * key, so it must be something a caller cannot produce by accident. It is
 * assembled from characters no UUID or DTO field can contain.
 */
export const WS_INVALID_PAYLOAD = '__wsInvalidPayload';

export type WsValidationFailure = {
  [WS_INVALID_PAYLOAD]: { ok: false; code: number; message: string };
};

export const isWsValidationFailure = (
  value: unknown,
): value is WsValidationFailure =>
  typeof value === 'object' &&
  value !== null &&
  WS_INVALID_PAYLOAD in value;

/**
 * Turns `class-validator`'s flat `ValidationError[]` into one sentence, because
 * it goes straight into a user-visible toast.
 *
 * Nested failures (`constraints` may itself be an object for nested DTOs) are
 * walked, so every leaf constraint is reported rather than only the top level.
 */
function describeErrors(errors: unknown[]): string {
  const parts: string[] = [];

  for (const error of errors) {
    if (typeof error !== 'object' || error === null) continue;

    const { constraints, children } = error as {
      constraints?: Record<string, string>;
      children?: unknown[];
    };

    if (constraints) {
      parts.push(...Object.values(constraints));
    }

    if (children?.length) {
      parts.push(describeErrors(children));
    }
  }

  return parts.length ? parts.join('; ') : 'That message could not be sent';
}

const validationPipe = new ValidationPipe({
  // Client payloads need not be transformed, and leaving `transform` off avoids
  // surprising coercions on values such as an empty-string `conversationId`.
  transform: false,
  validateCustomDecorators: true,
  stopAtFirstError: false,
});

/**
 * Apply the same validation the HTTP side gets, but hand back a result the
 * gateway can return instead of throwing.
 */
export const WsValidationPipe: PipeTransform = {
  async transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return await validationPipe.transform(value, metadata);
    } catch (error) {
      const response =
        typeof error === 'object' && error !== null
          ? (error as { getResponse?: () => unknown }).getResponse?.()
          : undefined;

      const raw =
        typeof response === 'object' && response !== null
          ? (response as { message?: unknown }).message
          : undefined;

      return {
        [WS_INVALID_PAYLOAD]: {
          ok: false,
          code: 400,
          message: Array.isArray(raw)
            ? describeErrors(raw)
            : typeof raw === 'string'
              ? raw
              : 'That message could not be sent',
        },
      } satisfies WsValidationFailure;
    }
  },
};