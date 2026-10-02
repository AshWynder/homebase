export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type Role = 'OWNER' | 'CARETAKER' | 'TENANT';
export type MeterType = 'WATER' | 'ELECTRICITY';
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type PaymentMethod = 'MPESA_STK' | 'MPESA_C2B' | 'CARD';
export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'PENDING';
export type PaymentProvider = 'DARAJA' | 'PAYSTACK';

export type MaintenanceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

/**
 * A repair request raised against a unit. The nested `unit.property` and
 * `tenant.user` mirrors the server's include set, so a tenant sees which home
 * the ticket is filed against without a second request.
 */
export interface MaintenanceTicket {
  id: string;
  unitId: string;
  tenantId?: string | null;
  description: string;
  status: MaintenanceStatus;
  /** Absolute R2 URLs, already decorated by the server (the DB holds keys). */
  photoUrls: string[];
  resolvedAt?: string | null;
  unit: Unit & { property?: Pick<Property, 'id' | 'name' | 'address'> | null };
  tenant?: {
    id: string;
    user?: Pick<User, 'id' | 'name' | 'email'> | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/** A photo staged on-device before upload. `uri` is already compressed to JPEG. */
export interface StagedPhoto {
  id: string;
  uri: string;
  fileName: string;
}

export interface CreateMaintenanceTicketInput {
  description: string;
  photos?: StagedPhoto[];
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  phone: string;
  role: Role;
  nationalId?: string | null;
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  address?: string | null;
  ownerId: string;
  caretakerId?: string | null;
  owner?: UserProfile;
  caretaker?: UserProfile | null;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  unitNumber: string;
  blockName?: string | null;
  propertyId: string;
  property?: Pick<Property, 'id' | 'name' | 'address'>;
  createdAt: string;
  updatedAt: string;
}

export interface Tenancy {
  id: string;
  tenantId: string;
  unitId: string;
  rentAmount: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  tenant?: UserProfile;
  unit?: Unit;
  createdAt: string;
  updatedAt: string;
}

export interface UtilityMeter {
  id: string;
  unitId: string;
  meterType: MeterType;
  meterNumber?: string | null;
  lastReading: number;
  pricePerUnit: string;
  unit?: Unit;
  _count?: { readings: number };
  createdAt: string;
  updatedAt: string;
}

export interface MeterReading {
  id: string;
  meterId: string;
  currentReading: number;
  unitsConsumed: number;
  pricePerUnit: string;
  consumptionCost: string;
  readingDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  type: string;
  description: string;
  amount: string;
  meterReadingId?: string | null;
  createdAt: string;
}

/**
 * The slice of an invoice that `GET /payments` nests on each payment, so a
 * payment row can show its tenant, unit and period without a second request.
 * Optional because the invoice-detail endpoint returns payments bare.
 */
export interface PaymentInvoice {
  id: string;
  status: InvoiceStatus;
  amount: string;
  balanceDue: string;
  periodStart: string;
  periodEnd: string;
  unit?: Pick<Unit, 'id' | 'unitNumber'> & {
    property?: Pick<Property, 'id' | 'name'> | null;
  };
  tenancy?: { tenant?: { user?: User | null } | null } | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  method: PaymentMethod;
  provider: PaymentProvider;
  transactionRef: string;
  phoneNumber?: string | null;
  status: PaymentStatus;
  mpesaReceiptNumber?: string | null;
  authorizationUrl?: string | null;
  failureReason?: string | null;
  paidAt?: string | null;
  invoice?: PaymentInvoice;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceStatusSummary {
  count: number;
  /** Money owed, except for PAID where it is the collected amount. */
  total: string;
}

export interface InvoiceSummary {
  byStatus: Record<InvoiceStatus, InvoiceStatusSummary>;
  totals: {
    billed: string;
    outstanding: string;
  };
}

export interface Invoice {
  id: string;
  unitId: string;
  tenancyId: string;
  periodStart: string;
  periodEnd: string;
  amount: string;
  balanceDue: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems?: InvoiceLineItem[];
  payments?: Payment[];
  tenancy?: Tenancy;
  unit?: Unit;
  createdAt: string;
  updatedAt: string;
}

// ── Auth ───────────────────────────────────────────────────

/** Better Auth user (subset of fields the client uses). */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: Role;
  nationalId?: string;
}

/** Response of POST /api/auth/register (envelope-wrapped by the server). */
export interface RegisterResponse {
  user: AuthUser;
  token: string;
  profile: UserProfile;
}

/** Raw Better Auth response of POST /api/auth/sign-in/email (no envelope). */
export interface SignInResponse {
  token: string;
  user: AuthUser;
}

/** Response of GET /api/auth/me (envelope-wrapped by the server). */
export interface MeResponse {
  user: AuthUser;
  profile: UserProfile;
}

// ── Request payloads ───────────────────────────────────────

export interface CreatePropertyInput {
  name: string;
  address?: string;
  ownerId: string;
  caretakerId?: string;
}

export interface UpdatePropertyInput {
  name?: string;
  address?: string;
  ownerId?: string;
  caretakerId?: string | null;
}

export interface CreateUnitInput {
  unitNumber: string;
  blockName?: string;
  propertyId: string;
}

export interface CreateTenancyInput {
  tenantId: string;
  unitId: string;
  rentAmount: number;
  startDate: string;
  endDate?: string;
  isActive?: boolean;
}

export interface TerminateTenancyInput {
  endDate?: string;
}

export interface CreateMeterInput {
  unitId: string;
  meterType?: MeterType;
  meterNumber?: string;
  lastReading?: number;
  pricePerUnit?: number;
}

export interface RecordReadingInput {
  currentReading: number;
  readingDate?: string;
}

/** Response of POST /meters/:id/readings — the reading plus the invoice it was billed to. */
export interface RecordedReading extends MeterReading {
  invoice: {
    id: string;
    periodStart: string;
    periodEnd: string;
  };
}

export interface GenerateInvoicesInput {
  periodStart?: string;
  year?: number;
  month?: number;
  propertyId?: string;
  tenancyId?: string;
}

export interface InitiateStkPaymentInput {
  invoiceId: string;
  phoneNumber: string;
}

export interface InitiateCardPaymentInput {
  invoiceId: string;
  callbackUrl?: string;
}
export type NoticeAudience = 'ALL_PROPERTIES' | 'PROPERTY' | 'TENANT';

/** The property a notice is scoped to, null for a portfolio-wide notice. */
export interface NoticeProperty {
  id: string;
  name: string;
  address: string;
}

/**
 * The sending owner, flattened one level: `author` is a UserProfile row, so the
 * display name lives on its nested `user`.
 */
export interface NoticeAuthor {
  id: string;
  userId: string;
  role: Role;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Notice {
  id: string;
  title: string;
  message: string;
  audience: NoticeAudience;
  propertyId: string | null;
  authorId: string;
  property: NoticeProperty | null;
  author: NoticeAuthor;
  createdAt: string;
  updatedAt: string;
}

/**
 * A row in the send-time delivery list. The owner side receives these with
 * `tenantId` only — the UI presents read totals rather than a named roster,
 * since the response deliberately does not carry recipient profiles.
 */
export interface NoticeRecipient {
  id: string;
  tenantId: string;
  isRead: boolean;
}

/**
 * What POST /notices/:id/read returns: the caller's own receipt and nothing
 * else. It is not a notice, so it cannot stand in for one.
 */
export interface NoticeReceipt {
  id: string;
  isRead: boolean;
  readAt: string | null;
}

/** An owner's row in GET /notices — aggregate read progress, no receipts. */
export interface SentNotice extends Notice {
  recipientCount: number;
  readCount: number;
}

/** A tenant's row in GET /notices — their own read state, flattened onto the notice. */
export interface ReceivedNotice extends Notice {
  isRead: boolean;
  readAt: string | null;
}

/**
 * GET/POST /notices/:id. `recipients` is only present for the author, so the
 * tenant inbox can never load a roster it has no business seeing.
 */
export interface NoticeDetail extends Notice {
  recipientCount: number;
  readCount: number;
  isRead: boolean;
  readAt: string | null;
  recipients?: NoticeRecipient[];
}

export interface CreateNoticeInput {
  title: string;
  message: string;
  audience: NoticeAudience;
  /** Required when audience is PROPERTY, and rejected otherwise. */
  propertyId?: string;
  /** Required when audience is TENANT, and rejected otherwise. */
  tenantId?: string;
}
