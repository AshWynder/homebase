import { Injectable, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { headerValue } from '../common/context/context.util';
import { auth } from './auth';

/**
 * Turns a bearer token into an authenticated `{ user, profile }`.
 *
 * Extracted from `AuthGuard` so the websocket handshake can authenticate the
 * same way the HTTP layer does. The two transports then differ in *when* they
 * call this, not in *how* they verify:
 *
 * - HTTP: once per request, in the guard.
 * - WebSocket: once per connection, in the gateway's `handleConnection`, and the
 *   result is parked on `socket.data.user` for the life of that connection.
 *
 * The distinction that matters: this token is a Better Auth session row, not a
 * self-contained JWT. Verifying it costs a database round trip, which is why
 * it is done once at handshake and never again per message. If it were a JWT,
 * `handleConnection` could be skipped entirely and the gateway could verify
 * itself; that is not possible here.
 */
@Injectable()
export class AuthSessionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the bearer token from an `Authorization` header.
   *
   * @throws UnauthorizedException when the header is absent, malformed, expired
   * or points at a session whose profile has since been deleted.
   */
  async authenticateHeaders(
    headers: Record<string, unknown> | undefined,
  ): Promise<AuthenticatedUser> {
    const authorization = headerValue(headers, 'authorization');

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    return this.authenticateToken(authorization.slice('Bearer '.length).trim());
  }

  /** Resolves a raw bearer token to its session and profile. */
  async authenticateToken(token: string | undefined): Promise<AuthenticatedUser> {
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    // better-auth throws on a malformed or expired token; a failed lookup and a
    // rejected token are the same outcome for the caller, so both collapse to
    // the same error rather than leaking which one it was.
    let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
    try {
      session = await auth.api.getSession({
        headers: fromNodeHeaders({ authorization: `Bearer ${token}` }),
      });
    } catch {
      session = null;
    }

    if (!session?.user) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      throw new UnauthorizedException('User profile not found');
    }

    return {
      // Normalize better-auth's optional `image` to Prisma's nullable `image`.
      user: { ...session.user, image: session.user.image ?? null },
      profile,
    };
  }
}