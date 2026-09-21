import { api, unwrap } from '@/lib/axios';

import type { CreatePropertyInput, Property, UpdatePropertyInput } from './types';

export const propertiesApi = {
  list: () => unwrap<Property[]>(api.get('/properties')),
  get: (id: string) => unwrap<Property>(api.get(`/properties/${id}`)),
  create: (input: CreatePropertyInput) => unwrap<Property>(api.post('/properties', input)),
  update: (id: string, input: UpdatePropertyInput) =>
    unwrap<Property>(api.patch(`/properties/${id}`, input)),
  remove: (id: string) => unwrap<Property>(api.delete(`/properties/${id}`)),
};