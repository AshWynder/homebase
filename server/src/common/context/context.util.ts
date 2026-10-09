import type { ArgumentsHost, ExecutionContext } from '@nestjs/common';

import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Execution-context helpers shared by the global guard, interceptors and filters.
 *
 * These exist because the app is no longer HTTP-only. Global guards,
 * interceptors and filters all run for websocket gateways too, but the objects
 * they normally read are transport-specific:
 *
 * |              | HTTP                          | WebSocket                        |
 * | ------------ | ----------------------------- | -------------------------------- |
 * | payload      | `request`                     | `args[0]` — the emitted payload  |
 * | target       | `response`                    | the socket                       |
 * | authenticated| `request.user`                | `socket.data.user`               |
 * | status       | `response.statusCode`         | n/a                              |
 *
 * Reading `switchToHttp()` on a websocket handler is the trap: it does not throw
 * in a useful place, it just hands back an empty object, so `request.headers` is
 * `undefined` and the code fails one or two lines later on the wrong-looking
 * error. Every shared piece of cross-cutting logic branches on
 * `getType()` first.
 */

export type TransportType = 'http' | 'ws' | 'rpc';

/** Narrowed view of the bits of a websocket connection the app actually uses. */
export interface SocketLike {
  data: { user?: AuthenticatedUser; [key: string]: unknown };
  handshake: { headers: Record<string, unknown>; auth: Record<string, unknown> };
  emit(event: string, ...args: unknown[]): void;
  disconnect(): void;
  id: string;
}

/** Which transport this execution context belongs to. */
export function transportOf(context: ExecutionContext): TransportType {
  return context.getType() as TransportType;
}

export function isHttp(context: ExecutionContext): boolean {
  return transportOf(context) === 'http';
}

/** The websocket client, when the context is a gateway handler. */
export function socketOf(context: ExecutionContext): SocketLike {
  return context.switchToWs().getClient<SocketLike>();
}

/**
 * The already-authenticated user for this context, if there is one.
 *
 * For HTTP the global AuthGuard writes it to `request.user`. For a websocket the
 * gateway's `handleConnection` writes it to `socket.data.user` after the
 * handshake, and the guard only checks that it is present — it never re-verifies
 * per message, so there is no database hit on the send path.
 */
export function authenticatedUserOf(
  context: ExecutionContext,
): AuthenticatedUser | undefined {
  if (isHttp(context)) {
    return context.switchToHttp().getRequest().user as
      | AuthenticatedUser
      | undefined;
  }
  if (transportOf(context) === 'ws') {
    return socketOf(context).data?.user;
  }
  return undefined;
}

/**
 * Case-insensitive header read for either transport.
 *
 * Node lowercases incoming header names, but socket handshake headers come from
 * a client that may send any casing, so lookups normalise.
 */
export function headerValue(
  headers: Record<string, unknown> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== wanted) continue;
    if (typeof value === 'string') return value;
    // Node collapses repeated headers into an array; the first is the original.
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  }
  return undefined;
}

/** Narrow an unknown throw site to a websocket gateway failure. */
export function isWebsocketHost(host: unknown): boolean {
  if (typeof host !== 'object' || host === null) return false;
  return (
    typeof (host as ArgumentsHost).getType === 'function' &&
    (host as ArgumentsHost).getType() === 'ws'
  );
}