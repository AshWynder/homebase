import { darkColors, darkTints } from '@/theme/colors';
import type { InvoiceBucket } from '@/lib/invoice-buckets';

/** Core Money-screen colours. Kept here so hex values are not scattered. */
export const FINANCE = {
  primary: '#006241',
  primaryDeep: '#006241',
  accent: '#047857',
  screen: '#F8FAFF',
  text: '#0f172a',
  textBody: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e2e8f0',
  tabTrack: '#EAF1FF',
  container: '#EAF1FF',
  containerBorder: '#D9E5FB',
  mintTint: '#D1FAE5',
  mintStrong: '#A7F3D0',
  danger: '#B91C1C',
  dangerTint: '#FEE2E2',
  dangerBorder: 'rgba(185,28,28,0.35)',
  overdueTile: '#FEDADA',
} as const;

export const FINANCE_DARK = {
  primary: darkColors.primary,
  primaryLight: darkColors.primaryLight,
  primaryOn: darkColors.primaryOn,
  accent: darkColors.secondary,
  screen: darkColors.background,
  text: darkColors.text,
  muted: darkColors.textMuted,
  faint: darkColors.textDim,
  textSlateLight: darkColors.textSlateLight,
  border: darkColors.border,
  borderStrong: darkColors.borderStrong,
  tabTrack: darkColors.surface,
  surface: darkColors.surface,
  surfaceElevated: darkColors.surfaceElevated,
  danger: darkColors.danger,
  dangerTintBg: darkColors.redTintBg,
  dangerTintBorder: darkColors.redTintBorder,
  overdueTintBg: 'rgba(239,68,68,0.06)',
  overdueTintBorder: darkColors.borderStrong,
  emeraldTintBg: darkColors.emeraldTintBg,
  emeraldTintBorder: darkColors.emeraldTintBorder,
  teal: darkColors.teal,
  amber: darkColors.amber,
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
    color: '#B91C1C',
    strong: '#B91C1C',
    tint: '#FEDADA',
    badge: '#FECACA',
    avatarBorder: 'rgba(185,28,28,0.35)',
  },
  UNPAID: {
    label: 'UNPAID',
    listLabel: 'UNPAID INVOICES',
    color: '#475569',
    strong: '#475569',
    tint: '#EAF1FF',
    badge: '#D9E5FB',
    avatarBorder: '#D9E5FB',
  },
  PARTIAL: {
    label: 'PARTIAL',
    listLabel: 'PARTIAL INVOICES',
    color: '#1E40AF',
    strong: '#1E40AF',
    tint: '#E6F0FF',
    badge: '#BFDBFE',
    avatarBorder: '#BFDBFE',
  },
  PAID: {
    label: 'PAID',
    listLabel: 'PAID INVOICES',
    color: '#006241',
    strong: '#006241',
    tint: '#D1FAE5',
    badge: '#D1FAE5',
    avatarBorder: '#A7F3D0',
  },
};

export const BUCKET_THEME_DARK: Record<InvoiceBucket, BucketTheme> = {
  OVERDUE: {
    label: 'OVERDUE',
    listLabel: 'OVERDUE INVOICES',
    color: darkColors.red,
    strong: darkColors.red,
    tint: darkTints.red.bg,
    badge: darkTints.red.bg,
    avatarBorder: darkTints.red.border,
  },
  UNPAID: {
    label: 'UNPAID',
    listLabel: 'UNPAID INVOICES',
    color: darkColors.textMuted,
    strong: darkColors.text,
    tint: darkTints.slate.bg,
    badge: darkTints.slate.bg,
    avatarBorder: darkTints.slate.border,
  },
  PARTIAL: {
    label: 'PARTIAL',
    listLabel: 'PARTIAL INVOICES',
    color: darkColors.indigo,
    strong: darkColors.indigo,
    tint: darkTints.indigo.bg,
    badge: darkTints.indigo.bg,
    avatarBorder: darkTints.indigo.border,
  },
  PAID: {
    label: 'PAID',
    listLabel: 'PAID INVOICES',
    color: darkColors.emerald,
    strong: darkColors.emeraldLight,
    tint: darkTints.emerald.bg,
    badge: darkTints.emerald.bg,
    avatarBorder: darkTints.emerald.border,
  },
};

export const ZERO_CARD_BACKGROUND = '#f3f5f8';
export const ZERO_CARD_BACKGROUND_DARK = darkColors.surface;
