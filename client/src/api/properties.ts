import { api, unwrap } from '@/lib/axios';

import type {
  AssignCaretakerInput,
  CreatePropertyInput,
  Property,
  UpdatePropertyInput,
} from './types';

export const propertiesApi = {
  list: () => unwrap<Property[]>(api.get('/properties')),
  get: (id: string) => unwrap<Property>(api.get(`/properties/${id}`)),
  create: (input: CreatePropertyInput) => unwrap<Property>(api.post('/properties', input)),
  update: (id: string, input: UpdatePropertyInput) =>
    unwrap<Property>(api.patch(`/properties/${id}`, input)),
  remove: (id: string) => unwrap<Property>(api.delete(`/properties/${id}`)),
  assignCaretaker: (id: string, input: AssignCaretakerInput) =>
    unwrap<Property>(api.post(`/properties/${id}/caretaker`, input)),
  removeCaretaker: (id: string) =>
    unwrap<Property>(api.delete(`/properties/${id}/caretaker`)),
};