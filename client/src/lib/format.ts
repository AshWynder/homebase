const kesFormatter = new Intl.NumberFormat('en-KE', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats a numeric amount as Kenyan Shillings, e.g. `KES 25,000`. */
export function formatKes(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return 'KES 0';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return 'KES 0';
  return `KES ${kesFormatter.format(value)}`;
}

/**
 * Compact KES for portfolio tiles, e.g. `1.77M`, `450K`, `KES 850`.
 * Keeps the `KES` prefix only for amounts under 1,000.
 */
export function formatCompactKes(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0';
  const value = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const millions = value / 1_000_000;
    return `${millions.toFixed(millions >= 10 ? 0 : 2).replace(/\.?0+$/, '')}M`;
  }
  if (abs >= 1_000) {
    const thousands = value / 1_000;
    return `${thousands.toFixed(thousands >= 10 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return formatKes(value);
}

/** Formats an ISO date as `YYYY-MM-DD`. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

/** Formats an ISO date as `Jan 2024`. */
export function formatMonthYear(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en', { month: 'short', year: 'numeric' });
}

/** Formats an ISO date as `Nov 1, 2024`. */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Formats an ISO datetime as `Oct 1, 2024 • 09:14 AM`. */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const day = date.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = date.toLocaleString('en', { hour: '2-digit', minute: '2-digit' });
  return `${day} • ${time}`;
}

/** Formats a period label from an ISO date, e.g. `September 2026`. */
export function formatPeriod(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en', { month: 'long', year: 'numeric' });
}

/** Short display id from a UUID, e.g. `#A1B2C3D4`. */
export function shortId(id: string | null | undefined, prefix = '#'): string {
  if (!id) return `${prefix}—`;
  return `${prefix}${id.replace(/-/g, '').slice(-8).toUpperCase()}`;
}

/** Whole days from now until `value` (negative if past). */
export function daysUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Returns the tenant's display name from a tenancy's nested profile. */
export function tenantName(tenancy?: {
  tenant?: { user?: { name?: string } | null } | null;
} | null): string {
  return tenancy?.tenant?.user?.name ?? 'Unknown tenant';
}