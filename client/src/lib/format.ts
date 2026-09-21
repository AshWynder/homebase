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

/** Formats an ISO date as `YYYY-MM-DD`. */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toISOString().slice(0, 10);
}

/** Formats a period label from an ISO date, e.g. `September 2026`. */
export function formatPeriod(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en', { month: 'long', year: 'numeric' });
}

/** Returns the tenant's display name from a tenancy's nested profile. */
export function tenantName(tenancy?: {
  tenant?: { user?: { name?: string } | null } | null;
} | null): string {
  return tenancy?.tenant?.user?.name ?? 'Unknown tenant';
}