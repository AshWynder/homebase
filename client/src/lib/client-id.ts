import * as Crypto from 'expo-crypto';

/**
 * A client-generated id for an outgoing message.
 *
 * `expo-crypto` rather than `Math.random()` or a timestamp: the whole optimistic
 * scheme rests on these being unique across devices and across app launches.
 * A collision means one person's pending bubble being replaced by somebody else's
 * message, which is the most confusing failure this feature has.
 *
 * Synchronous because `expo-crypto`'s uuid generator is — awaiting it would add a
 * microtask to the send path for no benefit.
 */
export function newClientId(): string {
  return Crypto.randomUUID();
}