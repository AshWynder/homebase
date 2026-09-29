import { api, unwrap } from '@/lib/axios';

import type {
  CreateMeterInput,
  MeterReading,
  MeterType,
  Paginated,
  RecordedReading,
  RecordReadingInput,
  UtilityMeter,
} from './types';

export interface QueryMetersInput {
  unitId?: string;
  propertyId?: string;
  meterType?: MeterType;
  page?: number;
  limit?: number;
}

export const metersApi = {
  list: (params: QueryMetersInput = {}) =>
    unwrap<Paginated<UtilityMeter>>(api.get('/meters', { params })),
  get: (id: string) => unwrap<UtilityMeter>(api.get(`/meters/${id}`)),
  create: (input: CreateMeterInput) => unwrap<UtilityMeter>(api.post('/meters', input)),
  update: (id: string, input: Partial<CreateMeterInput>) =>
    unwrap<UtilityMeter>(api.patch(`/meters/${id}`, input)),
  remove: (id: string) => unwrap<UtilityMeter>(api.delete(`/meters/${id}`)),
  recordReading: (id: string, input: RecordReadingInput) =>
    unwrap<RecordedReading>(api.post(`/meters/${id}/readings`, input)),
  readings: (id: string, params: { page?: number; limit?: number } = {}) =>
    unwrap<Paginated<MeterReading>>(api.get(`/meters/${id}/readings`, { params })),
};