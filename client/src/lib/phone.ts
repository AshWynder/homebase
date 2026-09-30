const KENYA_COUNTRY_CODE = '254';

/**
 * Strips formatting out of a stored phone number so it can be used in a URI.
 * Numbers are stored E.164 (`+254700000001`) but tenants may have typed them
 * with spaces or dashes, and `tel:`/`wa.me` both need bare digits.
 */
export function normalisePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.trim().replace(/[^\d+]/g, '');
  return digits || null;
}

/** `tel:` URI, for the system dialler. */
export function telHref(phone: string | null | undefined): string | null {
  const digits = normalisePhone(phone);
  return digits ? `tel:${digits}` : null;
}

/**
 * WhatsApp deep link. `wa.me` takes the number in international form with no
 * `+`, so a local `07…` number is promoted to `2547…` rather than producing a
 * link WhatsApp cannot resolve.
 */
export function whatsappHref(phone: string | null | undefined): string | null {
  const digits = normalisePhone(phone)?.replace(/\D/g, '');
  if (!digits) return null;
  const international = digits.startsWith('0')
    ? `${KENYA_COUNTRY_CODE}${digits.slice(1)}`
    : digits;
  return `https://wa.me/${international}`;
}
