import type { Invoice } from '@/api/types';

export type InvoiceBucket = 'OVERDUE' | 'UNPAID' | 'PARTIAL' | 'PAID';

export interface BucketTotal {
  count: number;
  total: number;
}

type BucketInvoice = Pick<Invoice, 'amount' | 'balanceDue' | 'dueDate'>;

function toAmount(value: string | number | null | undefined): number {
  const amount = typeof value === 'string' ? Number(value) : value;
  return amount !== null && amount !== undefined && !Number.isNaN(amount) ? amount : 0;
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function isBeforeToday(value: string | Date | null | undefined, now: Date): boolean {
  if (!value) return false;
  const dueDate = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(dueDate.getTime())) return false;
  return startOfDay(dueDate).getTime() < startOfDay(now).getTime();
}

/** Total already collected on an invoice, derived from amount - balanceDue. */
export function getAmountPaid(invoice: Pick<Invoice, 'amount' | 'balanceDue'>): number {
  return Math.max(0, toAmount(invoice.amount) - toAmount(invoice.balanceDue));
}

/**
 * Assigns an invoice to exactly one bucket. Overdue invoices include partially
 * paid ones, so every non-paid invoice lands in one of Overdue, Unpaid or
 * Partial and the stat cards add up to the full list.
 */
export function getInvoiceBucket(invoice: BucketInvoice, now = new Date()): InvoiceBucket {
  const total = toAmount(invoice.amount);
  const remaining = Math.max(0, toAmount(invoice.balanceDue));
  const paid = Math.max(0, total - remaining);

  if (remaining <= 0) return 'PAID';
  if (isBeforeToday(invoice.dueDate, now)) return 'OVERDUE';
  if (paid <= 0) return 'UNPAID';
  if (paid < total) return 'PARTIAL';
  return 'PAID';
}

/** Per-bucket invoice counts and the amount each stat card should display. */
export function getBucketTotals(
  invoices: BucketInvoice[],
  now = new Date(),
): Record<InvoiceBucket, BucketTotal> {
  const totals: Record<InvoiceBucket, BucketTotal> = {
    OVERDUE: { count: 0, total: 0 },
    UNPAID: { count: 0, total: 0 },
    PARTIAL: { count: 0, total: 0 },
    PAID: { count: 0, total: 0 },
  };

  for (const invoice of invoices) {
    const bucket = getInvoiceBucket(invoice, now);
    totals[bucket].count += 1;
    totals[bucket].total +=
      bucket === 'PAID' ? getAmountPaid(invoice) : Math.max(0, toAmount(invoice.balanceDue));
  }

  return totals;
}
