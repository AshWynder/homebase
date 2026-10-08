import { api, unwrap } from '@/lib/axios';

import type {
  ConversationCount,
  ConversationPage,
  ConversationSummary,
  MessageableGroup,
  MessageablePerson,
  MessagePage,
  ReadReceipt,
} from './types';

/**
 * Chat reads go over HTTP, writes go over the socket.
 *
 * That split is not arbitrary. History and the inbox are paginated and have to
 * work before any socket exists — on a cold start, or on a screen that never
 * opens a conversation at all. Sends are the opposite: they need to reach other
 * devices the instant they happen, which is the one thing HTTP polling cannot do.
 */
export interface QueryConversationsInput {
  /** Matches thread names and participant names. */
  search?: string;
  page?: number;
  limit?: number;
}

export interface QueryMessagesInput {
  /** The `nextCursor` from the previous page, to walk backwards through history. */
  before?: string;
  limit?: number;
}

export const conversationsApi = {
  list: (params: QueryConversationsInput = {}) =>
    unwrap<ConversationPage>(api.get('/conversations', { params })),

  get: (id: string) =>
    unwrap<ConversationSummary>(api.get(`/conversations/${id}`)),

  /**
   * History, oldest-first within a page.
   *
   * The server orders by message id descending and reverses each page, so the
   * `before` cursor points at the oldest row already seen.
   */
  messages: (conversationId: string, params: QueryMessagesInput = {}) =>
    unwrap<MessagePage>(
      api.get(`/conversations/${conversationId}/messages`, { params }),
    ),

  /**
   * The caller's unread total across every thread. Cheap enough to poll and the
   * number the tab badge shows, so it is a separate endpoint rather than a sum
   * the client computes from a possibly-paginated inbox.
   */
  unreadCount: () => unwrap<ConversationCount>(api.get('/conversations/count')),

  /**
   * Moves the read cursor over HTTP.
   *
   * Duplicated with the socket's `message:read` on purpose: a list screen with no
   * open thread still has to clear a badge, and requiring a socket there would
   * make the badge depend on connection state.
   */
  markRead: (conversationId: string) =>
    unwrap<ReadReceipt>(api.post(`/conversations/${conversationId}/read`)),

  /**
   * Opens a direct thread, or returns the existing one.
   *
   * Idempotent by `directKey`, so calling it from a "message" button twice cannot
   * create two threads.
   */
  openDirect: (profileId: string) =>
    unwrap<ConversationSummary>(api.post('/conversations/direct', { profileId })),

  /**
   * People this caller may open a direct thread with.
   *
   * Server-derived from the caller's own relationships, so the picker can never
   * offer a name the server would then refuse. Flat and unpaginated: the set is
   * bounded by the caller's own ties, not by the size of a directory.
   */
  messageablePeople: () =>
    unwrap<MessageablePerson[]>(api.get('/conversations/people')),

  /** Properties whose group thread this caller may open. */
  messageableGroups: () =>
    unwrap<MessageableGroup[]>(api.get('/conversations/groups')),

  /**
   * The group thread for a property.
   *
   * Lazily created and reconciled on the server if it does not exist yet, so the
   * client does not need to know whether this is the first open.
   */
  openGroup: (propertyId: string) =>
    unwrap<ConversationSummary>(api.get(`/conversations/group/${propertyId}`)),
};