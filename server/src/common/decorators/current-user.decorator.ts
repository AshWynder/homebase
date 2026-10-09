import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { User, UserProfile } from '../../../generated/prisma/client';
import { authenticatedUserOf } from '../context/context.util';

/** Shape attached to `request.user` (HTTP) or `socket.data.user` (websocket). */
export interface AuthenticatedUser {
  user: User;
  profile: UserProfile;
}

/**
 * Injects the authenticated `{ user, profile }` into a handler.
 *
 * Works unchanged on both transports because `authenticatedUserOf` knows where
 * each one parks it: `request.user` for HTTP, `socket.data.user` for a gateway
 * handler that the global `AuthGuard` has already checked. A handler written
 * with this decorator does not care which transport it is on.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    authenticatedUserOf(ctx),
);