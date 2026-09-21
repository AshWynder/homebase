import { api, unwrap } from '@/lib/axios';

import type { CreateUnitInput, Paginated, Unit } from './types';

export interface QueryUnitsInput {
  propertyId?: string;
  page?: number;
  limit?: number;
}

export const unitsApi = {
  list: (params: QueryUnitsInput = {}) =>
    unwrap<Paginated<Unit>>(api.get('/units', { params })),
  get: (id: string) => unwrap<Unit>(api.get(`/units/${id}`)),
  byProperty: (propertyId: string) =>
    unwrap<Unit[]>(api.get(`/units/property/${propertyId}`)),
  create: (input: CreateUnitInput) => unwrap<Unit>(api.post('/units', input)),
  update: (id: string, input: Partial<CreateUnitInput>) =>
    unwrap<Unit>(api.patch(`/units/${id}`, input)),
  remove: (id: string) => unwrap<Unit>(api.delete(`/units/${id}`)),
};