import { api, unwrap } from '@/lib/axios';

import type {
  CreateNoticeInput,
  NoticeAudience,
  NoticeDetail,
  NoticeReceipt,
  Paginated,
  ReceivedNotice,
  SentNotice,
} from './types';

/**
 * Mirrors the server-side DTO limits so the compose form can reject before a
 * round trip.
 */
export const NOTICE_LIMITS = {
  maxTitleLength: 140,
  maxMessageLength: 4000,
} as const;

export const NOTICE_PAGE_SIZE = 20;

export interface QueryNoticesInput {
  /** Owner-side: narrows to notices scoped to one property. */
  propertyId?: string;
  /** Owner-side: narrows by who the notice was addressed to. */
  audience?: NoticeAudience;
  /** Tenant-side: returns unread notices only. */
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * GET /notices.
 *
 * The row shape depends on the caller — an owner gets read totals, a tenant gets
 * their own read state — and the server picks that from the JWT rather than from
 * anything the client sends. So the item type is a parameter: the owner hook asks
 * for `SentNotice`, the tenant hook for `ReceivedNotice`, and neither has to
 * narrow a union at every call site.
 */
function list<T extends SentNotice | ReceivedNotice = SentNotice>(
  params: QueryNoticesInput = {},
) {
  return unwrap<Paginated<T>>(api.get('/notices', { params }));
}

export const noticesApi = {
  list,
  get: (id: string) => unwrap<NoticeDetail>(api.get(`/notices/${id}`)),
  create: (input: CreateNoticeInput) => unwrap<NoticeDetail>(api.post('/notices', input)),
  /**
   * Returns the *receipt*, not the notice — the server updates only its own
   * row and has no reason to resend the body. Typed to match, because treating
   * this as a NoticeDetail would let a partial object overwrite the detail
   * cache and blank the screen that just marked itself read.
   */
  markRead: (id: string) => unwrap<NoticeReceipt>(api.post(`/notices/${id}/read`)),
  remove: (id: string) => unwrap<{ id: string }>(api.delete(`/notices/${id}`)),
  /**
   * Tenant-only unread total. Declared before `/:id` on the server, so the
   * literal path never gets captured as a UUID.
   */
  unreadCount: () => unwrap<number>(api.get('/notices/count')),
};