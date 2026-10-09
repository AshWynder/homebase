import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { socketOf, transportOf } from '../common/context/context.util';
import { AuthSessionService } from './auth-session.service';

/**
 * Global guard backed by Better Auth.
 *
 * Runs for HTTP routes *and* websocket handlers, so it branches on the
 * transport. The cost of each branch is very different, which is the whole
 * point of this file:
 *
 * - HTTP: read `Authorization`, verify the session against the database, attach
 *   `{ user, profile }` to `request.user`.
 * - WebSocket: do nothing but assert that the gateway already authenticated
 *   this connection in `handleConnection`. The bearer token arrives once in the
 *   handshake, never per message, so re-verifying here would mean a database
 *   round trip on every keystroke-driven event. If the handshake failed, the
 *   socket was already disconnected and this is just defence in depth.
 *
 * Routes decorated with `@Public()` are skipped on both transports.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: AuthSessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const transport = transportOf(context);

    if (transport === 'ws') {
      const client = socketOf(context);
      // A missing user means the handshake never authenticated this socket.
      if (!client?.data?.user) {
        throw new UnauthorizedException('Socket is not authenticated');
      }
      return true;
    }

    const authenticated = await this.sessions.authenticateHeaders(
      context.switchToHttp().getRequest().headers,
    );

    context.switchToHttp().getRequest().user =
      authenticated satisfies AuthenticatedUser;
    return true;
  }
}