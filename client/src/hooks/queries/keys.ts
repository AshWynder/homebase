import type { QueryInvoicesInput, QueryInvoiceSummaryInput } from '@/api/invoices';
import type { QueryUsersInput } from '@/api/auth';
import type { QueryMaintenanceTicketsInput } from '@/api/maintenance';
import type { QueryMetersInput } from '@/api/meters';
import type { QueryNoticesInput } from '@/api/notices';
import type { QueryPaymentsInput } from '@/api/payments';
import type { QueryTenanciesInput } from '@/api/tenancies';
import type { QueryUnitsInput } from '@/api/units';
import type { MaintenanceStatus } from '@/api/types';

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
  // The infinite list and the detail view are both nested under `all` so a
  // single invalidation after a create refreshes everything the tenant sees.
  maintenance: {
    all: ['maintenance'] as const,
    list: (params: QueryMaintenanceTicketsInput) =>
      [...queryKeys.maintenance.all, 'list', params] as const,
    // The infinite list keys pages under `list`, so an unfiltered key has to be
    // a prefix of every filtered one for invalidation to reach all of them.
    infinite: (status: MaintenanceStatus | undefined) =>
      [...queryKeys.maintenance.all, 'infinite', status ?? 'all'] as const,
    detail: (id: string) => [...queryKeys.maintenance.all, 'detail', id] as const,
  },
  notices: {
    all: ['notices'] as const,
    /** Owner's sent list. Distinct from `received` because the row shape differs. */
    list: (params: QueryNoticesInput) => [...queryKeys.notices.all, 'list', params] as const,
    received: (unreadOnly: boolean) =>
      [...queryKeys.notices.all, 'received', unreadOnly] as const,
    count: () => [...queryKeys.notices.all, 'count'] as const,
    detail: (id: string) => [...queryKeys.notices.all, 'detail', id] as const,
  },
  // Params are part of the key, so each distinct search term caches separately
  // and backspacing through past terms is instant.
  users: {
    all: ['users'] as const,
    list: (params: QueryUsersInput) => [...queryKeys.users.all, 'list', params] as const,
  },
};
