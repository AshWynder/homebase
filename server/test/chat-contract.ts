/**
 * Live contract check for the chat feature.
 *
 * Not a Jest spec — it drives a running server the same way a real client does,
 * because the interesting behaviour is the handshake and the acknowledgements,
 * which a mocked socket cannot exercise. Run the server first:
 *
 *   npm run start:dev
 *   npx dotenv -e .env.development -- npx tsx test/chat-contract.ts
 *
 * Covers the authorization rules the seed data can produce, plus the offline and
 * failure paths a UI depends on.
 */
import { randomUUID } from 'node:crypto';

import { io, type ClientSocket as Socket } from './socket-io-client';

import { prisma } from '../prisma/prisma.client';

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;

const PASSED: string[] = [];
const FAILED: string[] = [];

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    PASSED.push(name);
    console.log(`  ✓ ${name}`);
  } else {
    FAILED.push(`${name}${detail ? ` — ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

async function api<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<{ status: number; body: ApiResponse<T> }> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const body = (await response.json()) as ApiResponse<T>;
  return { status: response.status, body };
}

/** Signs in as whichever account belongs to a profile id, for lifecycle probes. */
async function signInTenantFor(profileId: string): Promise<string> {
  const profile = await prisma.userProfile.findUnique({
    where: { id: profileId },
    select: { user: { select: { email: true } } },
  });
  if (!profile) throw new Error(`no profile ${profileId}`);

  const { token } = await signIn(profile.user.email);
  return token;
}

/** Signs in and returns a live socket plus the ids needed for assertions. */
async function signIn(email: string) {
  // Better Auth is mounted under /api/auth (see AuthController's catch-all).
  const response = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });

  // Better Auth's own handler: returns a bare body, not the API envelope.
  const body = (await response.json()) as {
    token?: string;
    user?: { id: string };
  };

  if (!response.ok || !body.token) {
    throw new Error(`sign-in failed for ${email}: ${JSON.stringify(body)}`);
  }

  // The profile id is what every authorization rule keys on, so it is read here
  // rather than looked up ad hoc at each assertion.
  const profile = await prisma.userProfile.findUnique({
    where: { userId: body.user!.id },
    select: { id: true, role: true },
  });
  if (!profile) throw new Error(`no profile for ${email}`);

  return { token: body.token, userId: body.user!.id, profile };
}

/** Opens a socket and waits for the gateway's `connection:ready`. */
/**
 * Every socket this run opens.
 *
 * A live socket holds an open TCP handle, so a single forgotten one keeps the event
 * loop alive and the process never exits — the suite would print its summary and
 * then hang forever, which reads like a flaky test rather than a leak. Tracked in
 * one place and torn down in `finally`, so new probes cannot reintroduce it.
 */
const openSockets = new Set<Socket>();

function connect(token: string, timeoutMs = 8000): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      auth: { token },
      transports: ['websocket'],
      reconnection: false,
    });
    openSockets.add(socket);

    const timer = setTimeout(
      () => {
        socket.close();
        reject(new Error('handshake timed out'));
      },
      timeoutMs,
    );

    socket.on('connection:ready', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connection:error', (err: { message: string }) => {
      clearTimeout(timer);
      socket.close();
      openSockets.delete(socket);
      reject(new Error(`rejected: ${err.message}`));
    });
    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      socket.close();
      openSockets.delete(socket);
      reject(err);
    });
  });
}

/** Emits an event and waits for its acknowledgement. */
function emit<T>(
  socket: Socket,
  event: string,
  payload: unknown,
  timeoutMs = 8000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} ack timed out`)), timeoutMs);
    socket.emit(event, payload, (ack: T) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

/** Shape the gateway emits for `message:new`. */
interface MessageNewPayload {
  conversationId: string;
  clientId: string;
  message: { id: string; content: string };
}

interface ChatMessagePayload {
  id: string;
  conversationId: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; role: string };
}

/**
 * Acknowledgement of a chat event.
 *
 * `message` is the persisted row on success and a human-readable error string on
 * failure — the two shapes come from different sources (the service vs the
 * exception filter), so the failure one is spelled `error` here rather than
 * forcing one property to mean two unrelated things.
 */
interface SendAck {
  ok: boolean;
  clientId?: string;
  message?: ChatMessagePayload;
  code?: number;
  error?: string;
}

interface ConversationSummary {
  id: string;
  type: 'DIRECT' | 'GROUP';
  name: string;
  propertyId: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  participants: { id: string; name: string; role: string }[];
  lastMessage: { id: string; content: string; createdAt: string } | null;
}

interface ConversationPage {
  items: ConversationSummary[];
  total: number;
  page: number;
  limit: number;
}

async function main() {
  console.log('\n━━━ CHAT CONTRACT ━━━\n');

  console.log('Signing in seed accounts...');
  const owner = await signIn('owner@example.com');
  const caretaker = await signIn('caretaker@example.com');
  const tenant = await signIn('tenant@example.com');
  // Staff of the second seeded property. Needed because the only way to prove
  // cross-property isolation is to act as somebody who genuinely belongs
  // elsewhere — reusing the first property's caretaker would prove nothing.
  const strangerCaretaker = await signIn('caretaker2@example.com');
  const strangerOwner = await signIn('owner2@example.com');
  console.log('  ✓ five accounts authenticated\n');

  // ── 1. HTTP surface ────────────────────────────────────────────────
  console.log('HTTP endpoints');

  const inbox = await api<ConversationPage>('/conversations', owner.token);
  check('GET /conversations returns 200', inbox.status === 200);
  check(
    'inbox is scoped to the caller',
    inbox.body.data.items.length > 0,
    'owner has no conversations',
  );
  check(
    'inbox labels direct threads by counterpart',
    inbox.body.data.items
      .filter((c) => c.type === 'DIRECT')
      .every((c) => c.name && c.name !== 'Direct message'),
  );
  check(
    'inbox includes at least one property group',
    inbox.body.data.items.some((c) => c.type === 'GROUP'),
  );

  // The inbox preview line. Without it a list row is a name and a timestamp,
  // which is not something anybody opens the app to read.
  const seededPreview = inbox.body.data.items.find((c) => c.lastMessage);
  check(
    'the inbox carries a last-message preview',
    !!seededPreview && seededPreview.lastMessage!.content.length > 0,
    JSON.stringify(seededPreview?.lastMessage ?? null),
  );
  check(
    'the preview is the newest message, matching the sort order',
    inbox.body.data.items
      .filter((c) => c.lastMessage && c.lastMessageAt)
      .every((c, i, all) => {
        const next = all[i + 1];
        if (!next?.lastMessageAt || !next.lastMessage) return true;
        return c.lastMessageAt! >= next.lastMessageAt!;
      }),
  );

  // The page envelope is self-describing. Without `page`/`limit` an infinite
  // scroll has to infer "is there a next page" by comparing counts, which breaks
  // the moment the server clamps the requested limit and the final page comes
  // back full.
  const inboxPage1 = await api<ConversationPage>('/conversations?limit=1', owner.token);
  const inboxPage2 = await api<ConversationPage>(
    '/conversations?limit=1&page=2',
    owner.token,
  );
  check(
    'the inbox echoes the page it served',
    inboxPage1.body.data.page === 1 && inboxPage1.body.data.limit === 1,
    JSON.stringify(inboxPage1.body.data).slice(0, 120),
  );
  check(
    'a short page returns exactly one row',
    inboxPage1.body.data.items.length === 1,
    `items=${inboxPage1.body.data.items.length}`,
  );
  check(
    'page 2 is a different thread than page 1',
    inboxPage2.body.data.items.length === 1 &&
      inboxPage2.body.data.items[0].id !== inboxPage1.body.data.items[0].id,
    JSON.stringify(inboxPage2.body.data.items.map((c) => c.id)),
  );
  check(
    'total counts every matching thread, not the page',
    inboxPage1.body.data.total === inbox.body.data.total &&
      inbox.body.data.total > inboxPage1.body.data.items.length,
    `total=${inboxPage1.body.data.total} pageSize=${inboxPage1.body.data.items.length}`,
  );

  // `limit` is clamped rather than trusted, so the echo is also the proof the cap
  // is real.
  const clamped = await api<ConversationPage>(
    '/conversations?limit=1000',
    owner.token,
  );
  check(
    'an oversized limit is clamped and reported as clamped',
    clamped.body.data.limit === 50,
    `limit=${clamped.body.data.limit}`,
  );

  const count = await api<{ unread: number }>('/conversations/count', owner.token);
  check('GET /conversations/count returns 200', count.status === 200);
  check(
    'seeded threads read as unread',
    count.body.data.unread > 0,
    `unread=${count.body.data.unread}`,
  );

  const group = inbox.body.data.items.find((c) => c.type === 'GROUP')!;
  const history = await api<{
    items: { id: string; content: string; createdAt: string }[];
    nextCursor: string | null;
  }>(
    `/conversations/${group.id}/messages?limit=3`,
    owner.token,
  );
  check('GET messages returns 200', history.status === 200);
  check(
    'history respects the limit',
    history.body.data.items.length <= 3,
    `got ${history.body.data.items.length}`,
  );
  check(
    'history is oldest-first',
    history.body.data.items.length < 2 ||
      new Date(history.body.data.items[0].createdAt) <=
        new Date(history.body.data.items[1].createdAt),
  );

  // Nest answers POST with 201 unless a handler sets @HttpCode. Assert the range
  // rather than a literal so a future @HttpCode(200) does not fail this line.
  const markedRead = await api<{ lastReadAt: string }>(
    `/conversations/${group.id}/read`,
    owner.token,
    { method: 'POST' },
  );
  check(
    'POST /:id/read succeeds',
    markedRead.status >= 200 && markedRead.status < 300,
    `got ${markedRead.status}`,
  );
  check(
    'POST /:id/read returns the new cursor',
    !!markedRead.body.data?.lastReadAt,
  );

  // Cursor pagination: a full page must report a cursor, and following it must
  // return strictly older messages with no overlap. This is what catches the
  // off-by-one where `hasMore` is derived from a page that never fetched an extra
  // row, which silently loses the end of a thread's history.
  const firstPage = await api<{
    items: ChatMessagePayload[];
    nextCursor: string | null;
  }>(`/conversations/${group.id}/messages?limit=2`, owner.token);

  check(
    'a full page reports a next cursor',
    firstPage.body.data.items.length === 2 && !!firstPage.body.data.nextCursor,
    `items=${firstPage.body.data.items.length} cursor=${firstPage.body.data.nextCursor}`,
  );

  if (firstPage.body.data.nextCursor) {
    const cursor = firstPage.body.data.nextCursor;
    const secondPage = await api<{
      items: ChatMessagePayload[];
      nextCursor: string | null;
    }>(`/conversations/${group.id}/messages?limit=2&before=${cursor}`, owner.token);

    const firstIds = firstPage.body.data.items.map((m) => m.id);
    const secondIds = secondPage.body.data.items.map((m) => m.id);

    check(
      'following the cursor returns strictly older messages',
      secondIds.length > 0 &&
        secondIds.every((id) => !firstIds.includes(id)) &&
        secondIds.every((id) => id < cursor),
      `page1=[${firstIds.join(',')}] page2=[${secondIds.join(',')}]`,
    );

    check(
      'each page stays oldest-first internally',
      secondIds.length < 2 || secondIds[0] < secondIds[1],
    );
  }

  // Deliberately not asserting "unread went down" from the seeded value: a
  // previous run of this suite already marked the thread read, and that state
  // persists. A fresh message is sent in the live-messaging section below, and
  // the read cursor is verified against that instead.

  const unreadOf = async (token: string, id: string) => {
    const list = await api<{ items: ConversationSummary[] }>('/conversations', token);
    return list.body.data.items.find((c) => c.id === id)?.unreadCount ?? -1;
  };

  // ── 2. Authorization ───────────────────────────────────────────────
  console.log('\nAuthorization');

  const tenantInbox = await api<{ items: ConversationSummary[] }>(
    '/conversations',
    tenant.token,
  );
  const tenantGroups = tenantInbox.body.data.items.filter((c) => c.type === 'GROUP');
  check(
    'tenant is seated in their property group',
    tenantGroups.length > 0,
    'tenant has no group thread',
  );

  // A tenant must not reach a thread they are not in. The fixed tenant lives in
  // property one, so a group for property two is a genuine non-member thread.
  const strangerGroup = await prisma.conversation.findFirst({
    where: { type: 'GROUP', id: { not: group.id } },
    select: { id: true },
  });

  if (strangerGroup) {
    const forbidden = await api(
      `/conversations/${strangerGroup.id}/messages`,
      tenant.token,
    );
    check(
      'tenant cannot read a thread they are not in',
      forbidden.status === 403,
      `got ${forbidden.status}`,
    );

    const detail = await api(`/conversations/${strangerGroup.id}`, tenant.token);
    check(
      'tenant cannot read thread details either',
      detail.status === 403,
      `got ${detail.status}`,
    );
  } else {
    console.log('  · skipped non-member read (only one group in this seed)');
  }

  // tenant → tenant must be refused even though both profiles exist. Picks a
  // tenant from the other property so the pair is a real one, not a made-up id.
  const otherTenant = await prisma.userProfile.findFirst({
    where: { role: 'TENANT', tenancies: { none: { isActive: true } } },
    select: { id: true },
  });
  const strangerTenant = otherTenant?.id
    ? otherTenant
    : (
        await prisma.userProfile.findMany({
          where: { role: 'TENANT' },
          select: { id: true },
          skip: 1,
          take: 1,
        })
      )[0];

  if (strangerTenant) {
    const refused = await api(
      '/conversations/direct',
      tenant.token,
      {
        method: 'POST',
        body: JSON.stringify({ profileId: strangerTenant.id }),
      },
    );
    check(
      'tenant cannot open a thread with another tenant',
      refused.status === 403,
      `got ${refused.status}`,
    );
  } else {
    console.log('  · skipped tenant↔tenant refusal (no second tenant in seed)');
  }

  // A landlord can open a thread with *their* caretaker. Resolved through the
  // property rather than `findFirst`: with two seeded properties, an arbitrary
  // caretaker is just as likely to be the other owner's, and the 403 that provokes
  // is indistinguishable from a genuine bug.
  const myCaretaker = await prisma.property.findFirst({
    where: { owner: { user: { email: 'owner@example.com' } } },
    select: { caretakerId: true },
  });
  if (myCaretaker?.caretakerId) {
    const allowed = await api<ConversationSummary>(
      '/conversations/direct',
      owner.token,
      {
        method: 'POST',
        body: JSON.stringify({ profileId: myCaretaker.caretakerId }),
      },
    );
    check(
      'owner can open a thread with their own caretaker',
      allowed.status >= 200 && allowed.status < 300,
      `got ${allowed.status}`,
    );

    // …but not the caretaker who works next door.
    const crossProperty = await api('/conversations/direct', owner.token, {
      method: 'POST',
      body: JSON.stringify({ profileId: strangerCaretaker.profile.id }),
    });
    check(
      'owner cannot open a thread with another property\'s caretaker',
      crossProperty.status === 403,
      `got ${crossProperty.status}`,
    );
  }

  /**
   * The "start a chat" picker.
   *
   * The contract this has to hold: the endpoint returns *exactly* the people a
   * direct thread with is permitted for, so the UI never offers a button the
   * server would refuse. `/api/auth/users` cannot serve this — it is closed to
   * tenants, and for `role: 'TENANT'` it returns precisely the tenants with no
   * active tenancy.
   */
  const ownerPeople = await api<{ id: string; role: string; name: string | null }[]>(
    '/conversations/people',
    owner.token,
  );
  const tenantPeople = await api<{ id: string; role: string; name: string | null }[]>(
    '/conversations/people',
    tenant.token,
  );

  check(
    'the picker lists people for an owner',
    ownerPeople.status === 200 && ownerPeople.body.data.length > 0,
    `status=${ownerPeople.status}`,
  );
  check(
    'the picker never lists another landlord',
    !ownerPeople.body.data.some((p) => p.id === strangerOwner.profile.id),
    'a landlord of a different property must not be reachable',
  );
  check(
    'the picker never lists a neighbour property\'s caretaker',
    !ownerPeople.body.data.some((p) => p.id === strangerCaretaker.profile.id),
    'only caretakers of the caller\'s own properties belong here',
  );
  check(
    'the picker never lists the caller',
    !ownerPeople.body.data.some((p) => p.id === owner.profile.id),
    'self-messaging is refused by the authorization rules',
  );

  // The privacy assertion that matters most: a tenant gets their landlord and
  // their caretaker, and nobody else. Every other resident is excluded.
  check(
    'a tenant\'s picker is exactly their landlord and caretaker',
    tenantPeople.status === 200 &&
      tenantPeople.body.data.length === 2 &&
      tenantPeople.body.data.filter((p) => p.role === 'OWNER').length === 1 &&
      tenantPeople.body.data.filter((p) => p.role === 'CARETAKER').length === 1,
    JSON.stringify(tenantPeople.body.data),
  );
  check(
    'a tenant\'s picker contains no other tenant',
    !tenantPeople.body.data.some((p) => p.role === 'TENANT'),
    'tenant↔tenant is refused, so it must not be offered',
  );

  // The list is not merely plausible — every entry is actually openable. A picker
  // that lists a name the server then 403s on is the bug this endpoint exists to
  // prevent, so it is asserted rather than assumed.
  const probeResults = await Promise.all(
    tenantPeople.body.data.map((person) =>
      api('/conversations/direct', tenant.token, {
        method: 'POST',
        body: JSON.stringify({ profileId: person.id }),
      }),
    ),
  );
  check(
    'every person the picker lists can actually be messaged',
    probeResults.every((r) => r.status >= 200 && r.status < 300),
    `statuses=${probeResults.map((r) => r.status).join(',')}`,
  );

  const ownerGroupChoices = await api<{ id: string; name: string }[]>(
    '/conversations/groups',
    owner.token,
  );
  const tenantGroupChoices = await api<{ id: string; name: string }[]>(
    '/conversations/groups',
    tenant.token,
  );

  // Resolved from the database rather than assumed from the seed, so the check
  // stays exact if the seed ever grows or loses a property.
  const ownedPropertyIds = new Set(
    (
      await prisma.property.findMany({
        where: { owner: { user: { email: 'owner@example.com' } } },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  check(
    'the picker lists exactly the properties an owner owns',
    ownerGroupChoices.status === 200 &&
      ownerGroupChoices.body.data.length === ownedPropertyIds.size &&
      ownedPropertyIds.size > 0 &&
      ownerGroupChoices.body.data.every((g) => ownedPropertyIds.has(g.id)),
    `listed=${ownerGroupChoices.body.data?.map((g) => g.id).join(',')} owned=${[...ownedPropertyIds].join(',')}`,
  );

  const tenantPropertyId = tenantInbox.body.data.items.find(
    (c) => c.type === 'GROUP',
  )?.propertyId;
  check(
    'a tenant\'s picker is exactly the home they live in',
    tenantGroupChoices.status === 200 &&
      !!tenantPropertyId &&
      tenantGroupChoices.body.data.length === 1 &&
      tenantGroupChoices.body.data[0].id === tenantPropertyId,
    `listed=${tenantGroupChoices.body.data?.map((g) => g.id).join(',')} liveIn=${tenantPropertyId}`,
  );

  const caretakerPeople = await api<{ id: string; role: string }[]>(
    '/conversations/people',
    caretaker.token,
  );
  check(
    'a caretaker\'s picker is their residents and their landlord',
    caretakerPeople.status === 200 &&
      caretakerPeople.body.data.length > 0 &&
      caretakerPeople.body.data.some((p) => p.role === 'OWNER') &&
      !caretakerPeople.body.data.some((p) => p.role === 'CARETAKER'),
    `roles=${caretakerPeople.body.data?.map((p) => p.role).join(',')}`,
  );

  // tenant → tenant must be refused.
  const tenants = tenantInbox.body.data.items;
  const otherTenantThread = tenants.find(
    (c) =>
      c.type === 'DIRECT' &&
      c.participants.filter((p) => p.role === 'TENANT').length === 2,
  );
  check(
    'no tenant↔tenant thread exists in the seed',
    !otherTenantThread,
  );

  // owner → caretaker is allowed; the seed already has one.
  const ownerCareTaker = inbox.body.data.items.find(
    (c) =>
      c.type === 'DIRECT' &&
      c.participants.some((p) => p.role === 'OWNER') &&
      c.participants.some((p) => p.role === 'CARETAKER'),
  );
  check('owner↔caretaker thread is reachable', !!ownerCareTaker);

  const noToken = await fetch(`${BASE}/conversations`);
  check(
    'unauthenticated HTTP is rejected',
    noToken.status === 401,
    `got ${noToken.status}`,
  );

  // ── 3. WebSocket handshake ─────────────────────────────────────────
  console.log('\nWebSocket handshake');

  const ownerSocket = await connect(owner.token);
  check('valid token connects', ownerSocket.connected);

  const tenantSocket = await connect(tenant.token);
  check('second client connects independently', tenantSocket.connected);

  await ownerSocket.close();
  await tenantSocket.close();

  let rejectedBadToken = false;
  try {
    await connect('not-a-real-token');
  } catch {
    rejectedBadToken = true;
  }
  check('invalid token is refused at the handshake', rejectedBadToken);

  // The gateway accepts the transport connection, then refuses the *session*: it
  // emits `connection:error` and disconnects. So the signal to assert is that
  // `connection:error` arrived — a plain `connect_error` would instead mean the
  // transport itself was rejected.
  const noTokenResult = await new Promise<string>((resolve) => {
    const s = io(BASE, { transports: ['websocket'], reconnection: false });
    s.on('connection:ready', () => {
      s.close();
      resolve('ready');
    });
    s.on('connection:error', () => {
      s.close();
      resolve('connection:error');
    });
    s.on('connect_error', () => {
      s.close();
      resolve('connect_error');
    });
    setTimeout(() => {
      s.close();
      resolve('timeout');
    }, 5000);
  });
  check(
    'missing token is refused at the session layer',
    noTokenResult === 'connection:error',
    `got ${noTokenResult}`,
  );

  // ── 4. Live messaging ──────────────────────────────────────────────
  console.log('\nLive messaging');

  const a = await connect(owner.token);
  const b = await connect(tenant.token);

  await emit(a, 'conversation:subscribe', { conversationId: group.id });
  await emit(b, 'conversation:subscribe', { conversationId: group.id });
  check('both clients subscribed to the group', true);

  // The whole point of the design: a send on A must arrive on B.
  const delivered = new Promise<MessageNewPayload>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('recipient never received the broadcast')),
      8000,
    );
    b.on('message:new', (payload) => {
      clearTimeout(timer);
      resolve(payload as MessageNewPayload);
    });
  });

  const clientId = randomUUID();
  const ack = await emit<SendAck>(a, 'message:send', {
    conversationId: group.id,
    clientId,
    content: 'Contract check: is the water pressure back to normal?',
  });

  check('send is acknowledged ok', ack.ok === true, JSON.stringify(ack));
  check('ack echoes the clientId', ack.clientId === clientId);
  check('ack carries a server id', !!ack.message?.id);
  const sentId = ack.message?.id;

  const received = await delivered;
  check(
    'recipient received message:new',
    received.message.content.includes('water pressure'),
  );
  check(
    'broadcast targets the right thread',
    received.conversationId === group.id,
  );

  // Optimistic matching: the sender matches its bubble by clientId.
  check(
    'sender can match its optimistic bubble by clientId',
    ack.clientId === clientId && !!sentId,
  );

  check(
    'the broadcast also carries clientId, so ordering does not matter',
    received.clientId === clientId,
    `broadcast clientId=${received.clientId}`,
  );

  // ── 5. Send authorization over the socket ──────────────────────────
  console.log('\nSocket authorization');

  // Two different rejections, and they are worth separating.
  //
  // `outsider` is the *second* property's caretaker: authenticated, holding a
  // perfectly valid token, and with no membership row in property one's group.
  // That is the case that proves rooms are delivery and the database is
  // authorization.
  //
  // `localCaretaker` is property one's own caretaker — a genuine member who simply
  // never emitted `conversation:subscribe`. They can still send, and must be able
  // to: a client replying from an inbox without opening the thread has no reason
  // to have joined the room first. What matters is that this socket receives no
  // `message:new`, because it is not subscribed.
  const outsider = await connect(strangerCaretaker.token);
  const localCaretaker = await connect(caretaker.token);

  const notMyThread = await emit<SendAck>(outsider, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'should be refused',
  });
  check(
    'non-member send is refused',
    notMyThread.ok === false,
    JSON.stringify(notMyThread),
  );

  const silentSeen: unknown[] = [];
  localCaretaker.on('message:new', (payload: unknown) => silentSeen.push(payload));

  const notSubscribed = await emit<SendAck>(localCaretaker, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'member, but never subscribed',
  });
  check(
    'a member can send without subscribing first',
    notSubscribed.ok === true,
    JSON.stringify(notSubscribed),
  );

  // Give the broadcast a moment to arrive (or fail to) before asserting silence.
  await new Promise((resolve) => setTimeout(resolve, 300));
  check(
    'an unsubscribed socket receives no message:new',
    silentSeen.length === 0,
    `received ${silentSeen.length}`,
  );

  const emptyAck = await emit<SendAck>(a, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: '   ',
  });
  check(
    'whitespace-only message is refused',
    emptyAck.ok === false,
    JSON.stringify(emptyAck),
  );

  const badUuid = await emit<SendAck>(a, 'message:send', {
    conversationId: 'not-a-uuid',
    clientId: randomUUID(),
    content: 'hello',
  });
  check(
    'malformed conversation id is refused',
    badUuid.ok === false,
    JSON.stringify(badUuid),
  );

  const missingBody = await emit<SendAck>(a, 'message:send', {
    conversationId: group.id,
  } as never);
  check(
    'missing content is refused',
    missingBody.ok === false,
    JSON.stringify(missingBody),
  );

  // ── 6. Read cursor over the socket ──────────────────────────────────
  console.log('\nRead receipts');

  // Tenant has now received the message sent above, so its unread count for the
  // group is genuinely > 0 and moving the cursor has a visible effect.
  const unreadBefore = await unreadOf(tenant.token, group.id);
  check(
    'a received message raises the recipient unread count',
    unreadBefore > 0,
    `unread=${unreadBefore}`,
  );

  const readAck = await emit<{ ok: boolean; lastReadAt?: string }>(b, 'message:read', {
    conversationId: group.id,
  });
  check('message:read acknowledges ok', readAck.ok === true);

  const unreadAfter = await unreadOf(tenant.token, group.id);
  check(
    'reading over the socket clears that thread unread count',
    unreadAfter === 0,
    `before=${unreadBefore} after=${unreadAfter}`,
  );

  // The REST endpoint does the same thing, so the badge can be cleared from a
  // list screen where no socket is open.
  await emit(a, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'Second message, for the read endpoint.',
  } as never);
  const beforeHttpRead = await unreadOf(tenant.token, group.id);
  await api(`/conversations/${group.id}/read`, tenant.token, { method: 'POST' });
  const afterHttpRead = await unreadOf(tenant.token, group.id);
  check(
    'POST /:id/read clears the unread count too',
    beforeHttpRead > 0 && afterHttpRead === 0,
    `before=${beforeHttpRead} after=${afterHttpRead}`,
  );

  // ── 7. Typing indicator over the socket ─────────────────────────────
  console.log('\nTyping indicator');

  // `a` (owner) and `b` (tenant) are still subscribed to the group from §4.
  interface TypingPayload {
    conversationId: string;
    profileId: string;
    name: string;
    typing: boolean;
  }

  /**
   * Resolves with the next `typing:state` on a socket, or null on timeout.
   *
   * Null rather than a rejection: a signal that never arrives is a *failed
   * check*, and throwing here would abort the remaining sections instead of
   * reporting the failure alongside the rest.
   */
  const nextTyping = (socket: Socket): Promise<TypingPayload | null> =>
    new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 4000);
      socket.once('typing:state', (payload) => {
        clearTimeout(timer);
        resolve(payload as TypingPayload);
      });
    });

  const ownerName =
    (await prisma.user.findUnique({
      where: { id: owner.userId },
      select: { name: true },
    }))?.name ?? '';

  const heardOnPeer = nextTyping(b);
  const typingAck = await emit<{ ok: boolean; code?: number }>(a, 'typing:state', {
    conversationId: group.id,
    typing: true,
  });
  check('typing:state acknowledges ok', typingAck.ok === true, JSON.stringify(typingAck));
  const started = await heardOnPeer;
  check('typing signal reaches a subscribed peer', started?.typing === true, String(started));
  check('typing carries the conversation id', started?.conversationId === group.id);
  check('typing identifies the sender profile', started?.profileId === owner.profile.id);
  check('typing carries the sender display name', started?.name === ownerName);

  // The sender's own echo: `client.to(room)` excludes the emitting socket, so
  // "you are typing" can never come back to the device that typed it. Other
  // devices of the *same* account do hear it — asserted next — which is why the
  // payload carries the profileId the client filters on.
  const ownEcho: TypingPayload[] = [];
  a.on('typing:state', (payload: unknown) => ownEcho.push(payload as TypingPayload));

  const heardOnStop = nextTyping(b);
  await emit(a, 'typing:state', { conversationId: group.id, typing: false });
  const stopped = await heardOnStop;
  check('typing stop reaches the peer', stopped?.typing === false, String(stopped));

  const otherDevice = await connect(owner.token);
  await emit(otherDevice, 'conversation:subscribe', { conversationId: group.id });
  const heardOnSecondDevice = nextTyping(otherDevice);
  await emit(a, 'typing:state', { conversationId: group.id, typing: true });
  const crossDevice = await heardOnSecondDevice;
  check(
    'a second device of the same account receives the signal',
    crossDevice?.profileId === owner.profile.id && crossDevice?.typing === true,
    String(crossDevice),
  );

  // Room membership is the only authorization: `localCaretaker` is a genuine
  // member who never subscribed (§5), and typing is a keystroke-rate event —
  // it must never query the database to find that out. The ack still says ok,
  // because a client with nothing to retry should not be handed a failure.
  const leaked: TypingPayload[] = [];
  const leakCollector = (payload: unknown) => leaked.push(payload as TypingPayload);
  b.on('typing:state', leakCollector);
  const ghostAck = await emit<{ ok: boolean }>(localCaretaker, 'typing:state', {
    conversationId: group.id,
    typing: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  b.off('typing:state', leakCollector);
  check(
    'typing from a non-subscribed socket is still acknowledged',
    ghostAck.ok === true,
    JSON.stringify(ghostAck),
  );
  check('a non-subscribed socket relays nothing to the room', leaked.length === 0);

  const badTypingId = await emit<{ ok: boolean }>(a, 'typing:state', {
    conversationId: 'not-a-uuid',
    typing: true,
  });
  check(
    'malformed conversation id on typing is refused',
    badTypingId.ok === false,
    JSON.stringify(badTypingId),
  );

  const missingFlag = await emit<{ ok: boolean }>(a, 'typing:state', {
    conversationId: group.id,
  } as never);
  check(
    'a missing typing flag is refused',
    missingFlag.ok === false,
    JSON.stringify(missingFlag),
  );

  // Retract the still-open signal from the cross-device probe above, so the
  // section leaves the room the way it found it.
  await emit(a, 'typing:state', { conversationId: group.id, typing: false });
  await new Promise((resolve) => setTimeout(resolve, 300));
  check('the sender never receives its own typing echo', ownEcho.length === 0);

  // ── 8. Offline behaviour ───────────────────────────────────────────
  console.log('\nOffline');

  let ackDroppedWhenClosed = false;
  await a.close();
  await new Promise((r) => setTimeout(r, 400));

  const offlineAck = await new Promise<SendAck | undefined>((resolve) => {
    const timer = setTimeout(() => resolve(undefined), 2500);
    // Emitting on a closed socket: the callback never fires. This is the exact
    // hazard the client guards against with `socket.connected` before sending.
    try {
      a.emit('message:send', {
        conversationId: group.id,
        clientId: randomUUID(),
        content: 'sent while offline',
      } as never, (ack: SendAck) => {
        clearTimeout(timer);
        resolve(ack);
      });
    } catch {
      clearTimeout(timer);
      resolve(undefined);
    }
  });
  ackDroppedWhenClosed = offlineAck === undefined;
  check(
    'send while disconnected gets no ack (client must fail fast)',
    ackDroppedWhenClosed,
  );
  check(
    'socket reports not-connected after close',
    a.connected === false,
  );

  await b.close();
  await outsider.close();

  // ── 9. Reconnect ─────────────────────────────────────────────────────
  console.log('\nReconnect');

  /**
   * Room membership does not survive a transport drop.
   *
   * Each socket is a new `sid` after a reconnect, so the rooms it was put in are
   * gone. The user room is re-joined by the gateway's connection handler, but a
   * conversation room is only re-entered if the *client* asks again. This is the
   * behaviour the client's `connected` effect exists for, so it is asserted
   * rather than assumed.
   */
  // Opened directly rather than through `connect()`, because the suite's helper
  // sets `reconnection: false` on purpose — every other section wants a dropped
  // connection to fail loudly instead of quietly reconnecting and changing the
  // shape of the test. Reconnection is the one behaviour under test here, so this
  // socket is configured the way the real client configures it.
  const reconnector = await new Promise<Socket>((resolve, reject) => {
    const socket = io(BASE, {
      auth: { token: owner.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 100,
      reconnectionDelayMax: 300,
    });
    openSockets.add(socket);
    const timer = setTimeout(() => reject(new Error('reconnect probe timed out')), 8000);
    socket.on('connection:ready', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connection:error', (err: { message: string }) => {
      clearTimeout(timer);
      reject(new Error(`rejected: ${err.message}`));
    });
  });

  await emit(reconnector, 'conversation:subscribe', { conversationId: group.id });

  const conversationEvents: string[] = [];
  const userEvents: string[] = [];
  reconnector.on('message:new', (payload: { conversationId: string }) => {
    conversationEvents.push(payload.conversationId);
  });
  reconnector.on('conversation:touched', () => {
    userEvents.push(group.id);
  });

  // Force a reconnect without closing the client-side object: `disconnect()` on
  // the client stops reconnection, whereas killing the engine lets the client
  // reconnect on its own, which is the case being tested.
  // Closing the engine rather than the socket: `socket.disconnect()` stops the
  // client's reconnection attempts outright, whereas killing the transport lets
  // it reconnect on its own, which is the case under test.
  reconnector.io.engine.close();

  // Bounded, so a regression in reconnection reports a failed check instead of
  // hanging the run until the suite timeout.
  const reconnected = await Promise.race([
    new Promise<boolean>((resolve) => {
      if (reconnector.connected) {
        resolve(true);
        return;
      }
      reconnector.once('connect', () => resolve(true));
    }),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 8000)),
  ]);
  check(
    'the client reconnected on its own after the transport dropped',
    reconnected,
  );
  if (!reconnected) {
    await reconnector.close();
  }

  /**
   * `handleConnection` is async: the session lookup has to finish before
   * `socket.data.user` exists. Until it does, the socket is connected but
   * unauthenticated, and every handler refuses it.
   *
   * This is the trap the reconnect sequence walks into, so it is asserted
   * explicitly. A client that treats the Socket.IO `connect` event as "ready" and
   * re-subscribes on it gets a 401 here, concludes nothing is wrong, and then
   * never receives a message again in that thread.
   */
  const tooEarly = await emit<SendAck>(reconnector, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'Reconnect probe: sent before the handshake finished.',
  });
  check(
    'a send before connection:ready is refused, not silently dropped',
    tooEarly.ok === false && tooEarly.code === 401,
    JSON.stringify(tooEarly),
  );

  // Wait for the gateway's handshake to actually complete.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('connection:ready never arrived')), 8000);
    reconnector.once('connection:ready', () => {
      clearTimeout(timer);
      resolve();
    });
  });
  check(
    'the transport dropped and came back on the same client',
    reconnector.connected && reconnector.id !== undefined,
  );

  // Deliberately *not* re-subscribing yet. If the conversation room survived, this
  // send would be delivered to a socket that never asked again.
  //
  // The ack is checked on every probe send. Without that, a payload rejected by
  // validation and a room that silently failed to deliver are indistinguishable —
  // both look like "no events arrived" — and the assertion ends up blaming the
  // wrong layer. (It did exactly that once, over a `clientId` that was not a
  // v4 UUID.)
  const probe1 = await emit<SendAck>(reconnector, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'Reconnect probe: sent without re-subscribing.',
  });
  check('the first probe send is acknowledged ok', probe1.ok === true, JSON.stringify(probe1));

  await new Promise((r) => setTimeout(r, 500));
  check(
    'the conversation room did NOT survive the reconnect',
    !conversationEvents.includes(group.id),
    `received ${conversationEvents.length} message:new events`,
  );
  check(
    'the user room DID survive, re-joined by the gateway',
    userEvents.includes(group.id),
    'the inbox would go stale forever after a reconnect if this failed',
  );

  // Now re-subscribe, exactly as the client's status effect does, and prove the
  // delivery path is restored rather than merely assumed restored.
  const resubAck = await emit<{ ok: boolean }>(reconnector, 'conversation:subscribe', {
    conversationId: group.id,
  });
  check('re-subscribing after a reconnect is acknowledged ok', resubAck.ok === true);

  const probe2 = await emit<SendAck>(reconnector, 'message:send', {
    conversationId: group.id,
    clientId: randomUUID(),
    content: 'Reconnect probe: sent after re-subscribing.',
  });
  check('the second probe send is acknowledged ok', probe2.ok === true, JSON.stringify(probe2));

  await new Promise((r) => setTimeout(r, 500));
  check(
    're-subscribing restores delivery to the open thread',
    conversationEvents.includes(group.id),
    `received ${conversationEvents.length} message:new events`,
  );

  await reconnector.close();

  // ── 10. Tenancy lifecycle ───────────────────────────────────────────
  console.log('\nTenancy lifecycle');

  // A property with no group thread yet. Relying on a seeded one would mean the
  // lazy-create path is never exercised, which is the branch most likely to be
  // broken and the least likely to be noticed.
  // A property created through the API, so this run starts from a property that
  // has *no* group thread. Reusing a seeded one would make the lazy-create branch
  // untestable: the seed already made its group, so the request would find it and
  // never take the create path.
  const freshProperty = await api<{ id: string }>('/properties', strangerOwner.token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Contract Test Court',
      address: '1 Verification Way, Nairobi',
      caretakerId: strangerCaretaker.profile.id,
    }),
  });
  check(
    'a property can be created for the lifecycle test',
    freshProperty.status >= 200 && freshProperty.status < 300,
    `got ${freshProperty.status}`,
  );

  const freshPropertyId = freshProperty.body.data.id;

  const groupBefore = await prisma.conversation.findFirst({
    where: { propertyId: freshPropertyId, type: 'GROUP' },
    select: { id: true },
  });
  check('a brand new property has no group thread', !groupBefore);

  // Staff watch for the lazy create, since that is who the notification is for.
  const ownerUpdated: unknown[] = [];
  const ownerOfFresh = await connect(strangerOwner.token);
  ownerOfFresh.on('conversation:updated', (payload: unknown) =>
    ownerUpdated.push(payload),
  );

  const created = await api<ConversationSummary>(
    `/conversations/group/${freshPropertyId}`,
    strangerOwner.token,
    { method: 'GET' },
  );
  check(
    'GET group/:propertyId lazily creates the thread',
    created.status === 200 && created.body.data.type === 'GROUP',
    `got ${created.status}`,
  );

  await new Promise((resolve) => setTimeout(resolve, 300));
  check(
    'property staff are told the thread was created',
    ownerUpdated.length > 0,
    `events=${ownerUpdated.length}`,
  );

  const newGroup = await prisma.conversation.findUnique({
    where: { propertyId: freshPropertyId },
    select: { id: true },
  });
  check('the group thread is persisted', !!newGroup);

  if (newGroup) {
    const seated = await connect(strangerCaretaker.token);
    const sub = await emit<{ ok: boolean }>(seated, 'conversation:subscribe', {
      conversationId: newGroup.id,
    });
    check('the assigned caretaker is seated in it', sub.ok === true);

    // Move a tenant in, then out again. Termination is the case that matters: a
    // seat that outlives the tenancy is a data-access bug, not a cosmetic one.
    // A property created through the API has no units — the seed only builds them
    // for its own two — so the unit this resident moves into has to be created too.
    const createdUnit = await api<{ id: string }>('/units', strangerOwner.token, {
      method: 'POST',
      body: JSON.stringify({ unitNumber: 'LC-1', propertyId: freshPropertyId }),
    });
    check(
      'a unit can be created for the fresh property',
      createdUnit.status >= 200 && createdUnit.status < 300,
      `got ${createdUnit.status}`,
    );

    const spareUnit = createdUnit.status < 300 ? { id: createdUnit.body.data.id } : null;
    // Registered fresh through the public endpoint rather than dug out of the
    // seed: every seeded tenant already has a tenancy, and reusing one would mean
    // this run is not actually testing a move-in.
    const newcomerEmail = `chat-lifecycle-${randomUUID()}@example.com`;
    const registered = await fetch(`${BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newcomerEmail,
        password: 'password123',
        name: 'Lifecycle Tenant',
        phone: '+2547' + String(Math.floor(10000000 + Math.random() * 89999999)),
        role: 'TENANT',
      }),
    });
    const registeredBody = (await registered.json()) as { data?: { profile?: { id: string } } };
    const spareTenantId = registeredBody.data?.profile?.id;

    if (!registered.ok || !spareTenantId) {
      console.log(`  · skipped tenancy lifecycle (register failed: ${registered.status})`);
    }
    const spareTenant = spareTenantId ? { id: spareTenantId } : null;

    const rosterEvents: unknown[] = [];
    seated.on('conversation:updated', (payload: unknown) =>
      rosterEvents.push(payload),
    );

    if (spareUnit && spareTenant) {
      const tenancy = await api<{ id: string }>('/tenancies', strangerOwner.token, {
        method: 'POST',
        body: JSON.stringify({
          tenantId: spareTenant.id,
          unitId: spareUnit.id,
          rentAmount: 45000,
          startDate: new Date().toISOString(),
        }),
      });
      check(
        'a tenancy can be started',
        tenancy.status >= 200 && tenancy.status < 300,
        `got ${tenancy.status}`,
      );

      await new Promise((resolve) => setTimeout(resolve, 300));

      const seatedCount = await prisma.conversationParticipant.count({
        where: {
          conversationId: newGroup.id,
          profileId: spareTenant.id,
        },
      });
      check('a new resident is seated in the group', seatedCount === 1);

      check(
        'an open thread is told a resident joined',
        rosterEvents.some(
          (e) =>
            typeof e === 'object' &&
            e !== null &&
            (e as { conversationId?: string }).conversationId === newGroup.id,
        ),
        `events=${rosterEvents.length}`,
      );

      // Now the seat must disappear, and the socket that was in the room must
      // stop receiving.
      const departedSocket = await connect(await signInTenantFor(spareTenant.id));
      await emit(departedSocket, 'conversation:subscribe', {
        conversationId: newGroup.id,
      });

      const afterDeparture: unknown[] = [];
      departedSocket.on('message:new', (payload: unknown) =>
        afterDeparture.push(payload),
      );

      const terminated = await api(
        `/tenancies/${tenancy.body.data.id}/terminate`,
        strangerOwner.token,
        { method: 'POST' },
      );
      check(
        'the tenancy terminates',
        terminated.status >= 200 && terminated.status < 300,
        `got ${terminated.status}`,
      );

      const stillSeated = await prisma.conversationParticipant.count({
        where: { conversationId: newGroup.id, profileId: spareTenant.id },
      });
      check('the departed tenant loses their seat', stillSeated === 0);

      await new Promise((resolve) => setTimeout(resolve, 300));
      check(
        'the open thread is told the resident left',
        rosterEvents.length > 1,
        `events=${rosterEvents.length}`,
      );

      // The strongest form of the check: a removed member cannot send, even
      // though their socket is still connected and still joined to the room.
      const refusedSend = await emit<SendAck>(departedSocket, 'message:send', {
        conversationId: newGroup.id,
        clientId: randomUUID(),
        content: 'still here',
      });
      check(
        'a removed member cannot send, despite still holding a socket',
        refusedSend.ok === false,
        JSON.stringify(refusedSend),
      );
      check(
        'a removed member receives no broadcasts',
        afterDeparture.length === 0,
        `received ${afterDeparture.length}`,
      );

      await departedSocket.close();
    } else {
      console.log('  · skipped tenancy lifecycle (no spare unit or tenant)');
    }

    await seated.close();
  }

  await ownerOfFresh.close();

  // ── Summary ────────────────────────────────────────────────────────
  console.log(`\n━━━ ${PASSED.length} passed, ${FAILED.length} failed ━━━\n`);
  if (FAILED.length) {
    for (const failure of FAILED) console.log(`  ✗ ${failure}`);
    console.log();
    // Set the code rather than calling `process.exit`: exiting here would skip the
    // `finally` that closes sockets and disconnects Prisma.
    process.exitCode = 1;
    return;
  }
  console.log('All chat contract checks passed.\n');
}

main()
  .catch((error) => {
    console.error('\nContract run crashed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const socket of openSockets) socket.close();
    openSockets.clear();
    await prisma.$disconnect();
  });