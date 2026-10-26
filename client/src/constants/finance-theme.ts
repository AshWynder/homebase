import type { InvoiceBucket } from '@/lib/invoice-buckets';

/** Core Money-screen colours. Kept here so hex values are not scattered. */
export const FINANCE = {
  primary: '#065f46',
  accent: '#047857',
  screen: '#f8faf9',
  text: '#0f172a',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  tabTrack: '#eef2f6',
} as const;

export const STAT_CARD_BUCKETS: InvoiceBucket[] = ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE'];

export interface BucketTheme {
  label: string;
  listLabel: string;
  color: string;
  strong: string;
  tint: string;
  badge: string;
  avatarBorder: string;
}

export const BUCKET_THEME: Record<InvoiceBucket, BucketTheme> = {
  OVERDUE: {
    label: 'OVERDUE',
    listLabel: 'OVERDUE INVOICES',
    color: '#e11d48',
    strong: '#be123c',
    tint: '#fff1f2',
    badge: '#ffe4e6',
    avatarBorder: '#fecdd3',
  },
  UNPAID: {
    label: 'UNPAID',
    listLabel: 'UNPAID INVOICES',
    color: '#d97706',
    strong: '#b45309',
    tint: '#fffbeb',
    badge: '#fef3c7',
    avatarBorder: '#fde68a',
  },
  PARTIAL: {
    label: 'PARTIAL',
    listLabel: 'PARTIAL INVOICES',
    color: '#2563eb',
    strong: '#1d4ed8',
    tint: '#eff6ff',
    badge: '#dbeafe',
    avatarBorder: '#bfdbfe',
  },
  PAID: {
    label: 'PAID',
    listLabel: 'PAID INVOICES',
    color: '#16a34a',
    strong: '#15803d',
    tint: '#f0fdf4',
    badge: '#dcfce7',
    avatarBorder: '#bbf7d0',
  },
};

export const ZERO_CARD_BACKGROUND = '#f3f5f8';
