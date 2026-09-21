import { api, unwrap } from '@/lib/axios';

import type {
  CreateTenancyInput,
  Paginated,
  Tenancy,
  TerminateTenancyInput,
} from './types';

export interface QueryTenanciesInput {
  tenantId?: string;
  unitId?: string;
  propertyId?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export const tenanciesApi = {
  list: (params: QueryTenanciesInput = {}) =>
    unwrap<Paginated<Tenancy>>(api.get('/tenancies', { params })),
  active: (params: Omit<QueryTenanciesInput, 'isActive'> = {}) =>
    unwrap<Paginated<Tenancy>>(api.get('/tenancies/active', { params })),
  get: (id: string) => unwrap<Tenancy>(api.get(`/tenancies/${id}`)),
  create: (input: CreateTenancyInput) => unwrap<Tenancy>(api.post('/tenancies', input)),
  update: (id: string, input: Partial<CreateTenancyInput>) =>
    unwrap<Tenancy>(api.patch(`/tenancies/${id}`, input)),
  terminate: (id: string, input: TerminateTenancyInput = {}) =>
    unwrap<Tenancy>(api.post(`/tenancies/${id}/terminate`, input)),
  remove: (id: string) => unwrap<Tenancy>(api.delete(`/tenancies/${id}`)),
};