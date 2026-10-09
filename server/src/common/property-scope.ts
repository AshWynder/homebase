import { Role } from '../../generated/prisma/enums';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

/** True when the caller is a caretaker (property staff), not an owner. */
export function isCaretaker(auth: AuthenticatedUser): boolean {
  return auth.profile.role === Role.CARETAKER;
}

/**
 * Prisma filter that scopes a query to properties the caller manages.
 *
 * Owners see the properties they own; caretakers see the properties they are
 * assigned to. A profile has a single role, so this is a branch rather than an
 * OR — an owner is never also scoped as a caretaker.
 */
export function managedPropertyWhere(
  auth: AuthenticatedUser,
): { ownerId: string } | { caretakerId: string } {
  return isCaretaker(auth)
    ? { caretakerId: auth.profile.id }
    : { ownerId: auth.profile.id };
}

/** True when the caller manages the given property row. */
export function managesProperty(
  auth: AuthenticatedUser,
  property: { ownerId: string; caretakerId?: string | null },
): boolean {
  if (property.ownerId === auth.profile.id) return true;
  return isCaretaker(auth) && property.caretakerId === auth.profile.id;
}
