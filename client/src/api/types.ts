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
  createdAt: string;
  updatedAt: string;
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