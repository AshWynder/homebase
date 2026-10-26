import type { Invoice, InvoiceStatus } from '@/api/types';

export type InvoiceDisplayStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'OVERDUE';

export interface StatusTheme {
  accent: string;
  tint: string;
  border: string;
  text: string;
  label: string;
}

export function getStatusTheme(status: InvoiceDisplayStatus): StatusTheme {
  switch (status) {
    case 'OVERDUE':
      return {
        accent: '#e11d48',
        tint: '#fff1f2',
        border: '#fecdd3',
        text: '#be123c',
        label: 'OVERDUE',
      };
    case 'UNPAID':
      return {
        accent: '#d97706',
        tint: '#fffbeb',
        border: '#fde68a',
        text: '#b45309',
        label: 'UNPAID',
      };
    case 'PARTIAL':
      return {
        accent: '#2563eb',
        tint: '#eff6ff',
        border: '#bfdbfe',
        text: '#1d4ed8',
        label: 'PARTIAL',
      };
    case 'PAID':
      return {
        accent: '#16a34a',
        tint: '#f0fdf4',
        border: '#bbf7d0',
        text: '#15803d',
        label: 'PAID',
      };
    default:
      return {
        accent: '#16a34a',
        tint: '#f0fdf4',
        border: '#bbf7d0',
        text: '#15803d',
        label: 'PAID',
      };
  }
}

function startOfDay(value: Date): Date {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function getDerivedInvoiceStatus(
  invoice: Pick<Invoice, 'amount' | 'balanceDue' | 'dueDate'>
): InvoiceDisplayStatus {
  const total = Number(invoice.amount ?? 0);
  const balance = Number(invoice.balanceDue ?? 0);
  const paid = Math.max(0, total - balance);

  if (balance <= 0) return 'PAID';

  const dueDate = new Date(invoice.dueDate);
  const isOverdue = !Number.isNaN(dueDate.getTime()) && startOfDay(dueDate) < startOfDay(new Date());
  if (isOverdue && balance > 0) return 'OVERDUE';
  if (paid > 0 && paid < total) return 'PARTIAL';
  return 'UNPAID';
}

export function normalizeInvoiceStatus(status: InvoiceStatus): InvoiceDisplayStatus {
  switch (status) {
    case 'OVERDUE':
      return 'OVERDUE';
    case 'PARTIALLY_PAID':
      return 'PARTIAL';
    case 'PAID':
      return 'PAID';
    case 'UNPAID':
    default:
      return 'UNPAID';
  }
}
