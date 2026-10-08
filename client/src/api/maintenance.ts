import { api, unwrap } from '@/lib/axios';

import type {
  CreateMaintenanceTicketInput,
  MaintenanceStatus,
  MaintenanceTicket,
  Paginated,
  StagedPhoto,
  UpdateMaintenanceTicketInput,
} from './types';

/** Server-side caps, mirrored so the UI can reject before a wasted upload. */
export const MAINTENANCE_LIMITS = {
  maxPhotos: 5,
  maxPhotoBytes: 8 * 1024 * 1024,
  maxDescriptionLength: 2000,
} as const;

/** Page size for the "load more" list. */
export const MAINTENANCE_PAGE_SIZE = 8;

export interface QueryMaintenanceTicketsInput {
  status?: MaintenanceStatus;
  unitId?: string;
  propertyId?: string;
  page?: number;
  limit?: number;
}

/**
 * A photo that has already been re-encoded to JPEG on-device, so the multipart
 * part is always a predictable `image/jpeg` regardless of whether the tenant
 * picked a HEIC photo straight off an iPhone library.
 */
function toPhotoPart(photo: StagedPhoto) {
  return {
    uri: photo.uri,
    name: photo.fileName,
    type: 'image/jpeg',
  };
}

/**
 * Creates a maintenance ticket.
 *
 * Two overrides are mandatory here and easy to miss:
 *
 * 1. `Content-Type` — the shared axios instance pins `application/json`, and
 *    Axios will happily send that alongside FormData, so multer never sees a
 *    boundary and rejects the body. Passing `multipart/form-data` lets React
 *    Native's networking layer append the boundary itself.
 * 2. `timeout` — the instance default is 20s, which a 5-photo upload on mobile
 *    data will blow through, turning a slow-but-successful upload into a
 *    confusing error.
 *
 * `unitId` and `tenantId` are deliberately absent: the server derives them from
 * the authenticated tenant, and a tenant must not be able to file a ticket
 * against someone else's unit.
 */
function create(input: CreateMaintenanceTicketInput) {
  const form = new FormData();
  form.append('description', input.description.trim());

  for (const photo of input.photos ?? []) {
    form.append('photos', toPhotoPart(photo) as unknown as Blob);
  }

  return unwrap<MaintenanceTicket>(
    api.post('/maintenance', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  );
}

export const maintenanceApi = {
  list: (params: QueryMaintenanceTicketsInput = {}) =>
    unwrap<Paginated<MaintenanceTicket>>(api.get('/maintenance', { params })),
  get: (id: string) => unwrap<MaintenanceTicket>(api.get(`/maintenance/${id}`)),
  create,
  update: (id: string, input: UpdateMaintenanceTicketInput) =>
    unwrap<MaintenanceTicket>(api.patch(`/maintenance/${id}`, input)),
};
