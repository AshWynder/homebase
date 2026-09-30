import type { QueryInvoicesInput, QueryInvoiceSummaryInput } from '@/api/invoices';
import type { QueryMetersInput } from '@/api/meters';
import type { QueryPaymentsInput } from '@/api/payments';
import type { QueryTenanciesInput } from '@/api/tenancies';
import type { QueryUnitsInput } from '@/api/units';

export const queryKeys = {
  properties: {
    all: ['properties'] as const,
    list: () => [...queryKeys.properties.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.properties.all, 'detail', id] as const,
  },
  units: {
    all: ['units'] as const,
    list: (params: QueryUnitsInput) => [...queryKeys.units.all, 'list', params] as const,
    byProperty: (propertyId: string) =>
      [...queryKeys.units.all, 'property', propertyId] as const,
    detail: (id: string) => [...queryKeys.units.all, 'detail', id] as const,
  },
  tenancies: {
    all: ['tenancies'] as const,
    list: (params: QueryTenanciesInput) =>
      [...queryKeys.tenancies.all, 'list', params] as const,
    active: () => [...queryKeys.tenancies.all, 'active'] as const,
    detail: (id: string) => [...queryKeys.tenancies.all, 'detail', id] as const,
  },
  invoices: {
    all: ['invoices'] as const,
    list: (params: QueryInvoicesInput) =>
      [...queryKeys.invoices.all, 'list', params] as const,
    // Nested under `all` so the existing invalidations on generate and payment
    // refresh the dashboard tiles for free.
    summary: (params: QueryInvoiceSummaryInput) =>
      [...queryKeys.invoices.all, 'summary', params] as const,
    detail: (id: string) => [...queryKeys.invoices.all, 'detail', id] as const,
  },
  meters: {
    all: ['meters'] as const,
    list: (params: QueryMetersInput) => [...queryKeys.meters.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.meters.all, 'detail', id] as const,
    readings: (id: string) => [...queryKeys.meters.all, 'readings', id] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (params: QueryPaymentsInput) =>
      [...queryKeys.payments.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.payments.all, 'detail', id] as const,
  },
};