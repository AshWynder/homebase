import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { prisma } from './prisma.client';
import { auth } from '../src/auth/auth';
import {
  ConversationType,
  InvoiceLineItemType,
  InvoiceStatus,
  MeterType,
  Role,
} from '../generated/prisma/enums';

// ─────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────

const UNITS_PER_PROPERTY = 10;


const WATER_PRICE_PER_UNIT = 150;
// Offsets (in months from now) for meter readings, oldest → latest.
// The latest reading is dated in the current month so it falls inside the
// billed invoice period.
const METER_READING_MONTHS = [3, 2, 1, 0];

// Chat seed data. A handful of lines per thread is enough to exercise history
// pagination, unread counts and the directKey dedupe without turning the seed
// into a chat simulator.
const GROUP_MESSAGE_COUNT = 6;
const DIRECT_THREAD_COUNT = 3;
const DIRECT_MESSAGES_PER_THREAD = 4;

// Seed conversation openers. These are the everyday reasons the three allowed
// direct pairs exist, so the threads read like real usage rather than lorem.
const DIRECT_THREAD_TOPICS = [
  ['Water pressure dropped in the shared bathroom this morning.', 'Noted — I will check the riser before midday.', 'Thanks. It is worst on the top floor.', 'I have added it to today’s inspection list.'],
  ['Could we schedule the gutter cleaning before the rains?', 'Yes, I can do it on Friday morning.', 'Perfect, I will be home to let you in.', 'See you then.'],
  ['The gate code has changed — is the new one active?', 'Yes, it went live this morning.', 'Got it, testing it now.', 'Let me know if it does not work for you.'],
] as const;

const GROUP_LINES = [
  'Reminder: water will be off for maintenance on Thursday from 9am to 1pm.',
  'Good morning — the water is back on. Apologies for the delay.',
  'Does anyone know if the visitor parking bays are free this evening?',
  'They are, I am using the street for guests tonight.',
  'The plumber can come tomorrow morning, does 8am work for anyone?',
  '8am works for me.',
  'Leaving the compound late tomorrow, please close the gate behind you.',
  'Water looks clear again at the second floor, thanks to whoever reported it.',
  'Reminder that the rent deadline is the 5th. Let me know early if you need anything.',
  'Any plans for the community day on Saturday?',
  'I can bring some mandazi for the shared breakfast.',
  'That works. I will set up the tables early.',
] as const;

interface SeedUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  nationalId: string;
}

const FIXED_USERS: SeedUserData[] = [
  {
    name: 'John Doe (Owner)',
    email: 'owner@example.com',
    password: 'password123',
    phone: '+254700000001',
    role: Role.OWNER,
    nationalId: '12345678',
  },
  {
    name: 'Jane Smith (Caretaker)',
    email: 'caretaker@example.com',
    password: 'password123',
    phone: '+254700000002',
    role: Role.CARETAKER,
    nationalId: '23456789',
  },
  {
    name: 'Alice Tenant (Tenant)',
    email: 'tenant@example.com',
    password: 'password123',
    phone: '+254700000003',
    role: Role.TENANT,
    nationalId: '34567890',
  },
  // The seed builds two properties, and the authorization tests need to sign in
  // as somebody with no membership in property one. A faker-generated caretaker
  // would have an email nobody can predict, so the second property's staff are
  // fixed too — the contract suite cannot test cross-property access otherwise.
  {
    name: 'Mary Owner (Owner)',
    email: 'owner2@example.com',
    password: 'password123',
    phone: '+254700000004',
    role: Role.OWNER,
    nationalId: '45678901',
  },
  {
    name: 'Peter Caretaker (Caretaker)',
    email: 'caretaker2@example.com',
    password: 'password123',
    phone: '+254700000005',
    role: Role.CARETAKER,
    nationalId: '56789012',
  },
];

function generateRandomKenyanPhone(): string {
  const prefixes = ['70', '71', '72', '79', '74', '75', '76'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.string.numeric(7);
  return `+254${prefix}${suffix}`;
}

function generateMockTenants(count = 12): SeedUserData[] {
  const users: SeedUserData[] = [];
  const usedPhones = new Set<string>(FIXED_USERS.map((u) => u.phone));
  const usedNationalIds = new Set<string>(FIXED_USERS.map((u) => u.nationalId));

  // Owners and caretakers for both properties are fixed above, so only tenants
  // are randomized here. `count` is therefore the tenant headcount, not a total.
  const roles: Role[] = Array(count).fill(Role.TENANT);

  for (const role of roles) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const name = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    let phone = generateRandomKenyanPhone();
    while (usedPhones.has(phone)) {
      phone = generateRandomKenyanPhone();
    }
    usedPhones.add(phone);

    let nationalId = faker.string.numeric(8);
    while (usedNationalIds.has(nationalId)) {
      nationalId = faker.string.numeric(8);
    }
    usedNationalIds.add(nationalId);

    users.push({
      name,
      email,
      password: 'password123',
      phone,
      role,
      nationalId,
    });
  }

  return users;
}

async function createUserWithProfile(data: SeedUserData) {
  console.log(`Creating ${data.role}: ${data.name} (${data.email})...`);

  // 1. Create User & Account credentials via Better Auth
  const result = await auth.api.signUpEmail({
    body: {
      name: data.name,
      email: data.email,
      password: data.password,
    },
  });

  if (!result?.user?.id) {
    throw new Error(`Failed to create auth user for ${data.email}`);
  }

  const userId = result.user.id;

  // 2. Create or Upsert UserProfile linked to the user's actual ID
  await prisma.userProfile.upsert({
    where: { userId },
    update: {
      phone: data.phone,
      role: data.role,
      nationalId: data.nationalId,
    },
    create: {
      userId,
      phone: data.phone,
      role: data.role,
      nationalId: data.nationalId,
    },
  });

  return { userId, ...data };
}

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────

function monthsAgo(count: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - count, now.getDate());
}

function daysAgo(count: number): Date {
  return new Date(Date.now() - count * 24 * 60 * 60 * 1000);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function dueDateInCurrentMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 5);
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// Property domain seeding
// ─────────────────────────────────────────────────────────────

interface ReadingInfo {
  id: string;
  unitsConsumed: number;
  consumptionCost: number;
}

interface PropertyPlan {
  name: string;
  address: string;
  blockPrefix: string;
  blockName: string;
  ownerId: string;
  caretakerId: string;
}

const INVOICE_STATUS_CYCLE = [
  InvoiceStatus.UNPAID,
  InvoiceStatus.PAID,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const GARBAGE_FEE = 200;
const SERVICE_CHARGE_FEE = 500;

function balanceFor(amount: number, status: InvoiceStatus): number {
  if (status === InvoiceStatus.PAID) return 0;
  if (status === InvoiceStatus.PARTIALLY_PAID) return amount / 2;
  return amount;
}

async function createInvoicesForTenancy(params: {
  unitId: string;
  tenancyId: string;
  rentAmount: number;
  unitIndex: number;
  latestReading: ReadingInfo;
}) {
  const { unitId, tenancyId, rentAmount, unitIndex, latestReading } = params;
  const now = new Date();
  const periodStart = startOfMonth(now);
  const period = monthLabel(periodStart);

  // One invoice per tenancy per period. The invoice `amount` is the total
  // cost of its typed line items.
  const lineItems: {
    type: InvoiceLineItemType;
    description: string;
    amount: number;
    meterReadingId?: string;
  }[] = [
    {
      type: InvoiceLineItemType.RENT,
      description: `Monthly rent – ${period}`,
      amount: rentAmount,
    },
    {
      type: InvoiceLineItemType.WATER,
      description: `Water consumption – ${latestReading.unitsConsumed} units @ KES ${WATER_PRICE_PER_UNIT}/unit`,
      amount: latestReading.consumptionCost,
      meterReadingId: latestReading.id,
    },
    {
      type: InvoiceLineItemType.GARBAGE,
      description: `Garbage collection – ${period}`,
      amount: GARBAGE_FEE,
    },
  ];

  if (unitIndex % 3 === 0) {
    lineItems.push({
      type: InvoiceLineItemType.SERVICE_CHARGE,
      description: `Service charge – ${period}`,
      amount: SERVICE_CHARGE_FEE,
    });
  }

  const amount = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const status = INVOICE_STATUS_CYCLE[unitIndex % INVOICE_STATUS_CYCLE.length];

  await prisma.invoice.create({
    data: {
      unitId,
      tenancyId,
      periodStart,
      periodEnd: endOfMonth(now),
      amount,
      balanceDue: balanceFor(amount, status),
      dueDate: dueDateInCurrentMonth(now),
      status,
      lineItems: {
        create: lineItems,
      },
    },
  });
}

async function seedPropertyWithUnits(
  plan: PropertyPlan,
  tenantIds: string[],
  statusOffset: number,
) {
  console.log(`🏠 Seeding property: ${plan.name}...`);

  const property = await prisma.property.create({
    data: {
      name: plan.name,
      address: plan.address,
      ownerId: plan.ownerId,
      caretakerId: plan.caretakerId,
    },
  });

  for (let i = 0; i < UNITS_PER_PROPERTY; i++) {
    const unitNumber = `${plan.blockPrefix}-${101 + i}`;
    const tenantId = tenantIds.shift();
    if (!tenantId) {
      throw new Error('Ran out of tenant profiles while creating tenancies');
    }

    // Unit
    const unit = await prisma.unit.create({
      data: {
        unitNumber,
        blockName: plan.blockName,
        propertyId: property.id,
      },
    });

    // Tenancy (one active tenancy per unit)
    const rentAmount = faker.number.int({ min: 30, max: 80 }) * 500; // KES 15,000 – 40,000
    const tenancy = await prisma.tenancy.create({
      data: {
        tenantId,
        unitId: unit.id,
        rentAmount,
        startDate: faker.date.between({ from: monthsAgo(12), to: monthsAgo(6) }),
        isActive: true,
      },
    });

    // Water utility meter (one per unit)
    const meter = await prisma.utilityMeter.create({
      data: {
        unitId: unit.id,
        meterType: MeterType.WATER,
        meterNumber: `WM-${unitNumber}-${faker.string.alphanumeric(5).toUpperCase()}`,
        pricePerUnit: WATER_PRICE_PER_UNIT,
      },
    });

    // Monthly meter readings (last 3 months of history + the current month)
    let previousReading = faker.number.int({ min: 500, max: 1500 });
    const readings: ReadingInfo[] = [];

    for (const offset of METER_READING_MONTHS) {
      const unitsConsumed = faker.number.int({ min: 8, max: 20 });
      const currentReading = previousReading + unitsConsumed;
      const consumptionCost = unitsConsumed * WATER_PRICE_PER_UNIT;

      const reading = await prisma.meterReading.create({
        data: {
          meterId: meter.id,
          currentReading,
          unitsConsumed,
          pricePerUnit: WATER_PRICE_PER_UNIT,
          consumptionCost,
          readingDate: monthsAgo(offset),
        },
      });

      readings.push({ id: reading.id, unitsConsumed, consumptionCost });
      previousReading = currentReading;
    }

    // Keep the meter's last reading in sync with the latest reading
    await prisma.utilityMeter.update({
      where: { id: meter.id },
      data: { lastReading: previousReading },
    });

    // Invoice + typed line items (amount = total of line items)
    await createInvoicesForTenancy({
      unitId: unit.id,
      tenancyId: tenancy.id,
      rentAmount,
      unitIndex: statusOffset + i,
      latestReading: readings[readings.length - 1],
    });
  }

  console.log(
    `✅ ${plan.name}: ${UNITS_PER_PROPERTY} units, tenancies, water meters, readings & invoices created.`,
  );
}

// ─────────────────────────────────────────────────────────────
// Chat
// ─────────────────────────────────────────────────────────────

/**
 * Deterministic directKey for a pair, matching ChatService.directKeyFor.
 *
 * Both sides must derive the same string or two threads appear for one pair.
 * Sorting the ids is what makes it symmetric: swapping a and b cannot change
 * the result.
 */
function directKeyFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

/**
 * Seats one profile in a conversation, leaving any existing seat untouched.
 *
 * The join stamp is written explicitly rather than left to the column default
 * because the seeded messages are backdated — a member should not appear to
 * have joined after they spoke.
 */
async function seat(
  conversationId: string,
  profileId: string,
  joinedAt: Date,
) {
  await prisma.conversationParticipant.upsert({
    where: { conversationId_profileId: { conversationId, profileId } },
    update: {},
    create: { conversationId, profileId, joinedAt, lastReadAt: joinedAt },
  });
}

/**
 * Creates a property's standing group thread and seats its owner, caretaker and
 * active tenants.
 *
 * This mirrors what ChatService.ensureGroupConversation does at runtime; the
 * seed writes it directly because it needs the same backdated timestamps and
 * because the service's version is reached over HTTP, which is not available
 * here.
 */
async function seedGroupThread(propertyId: string, name: string, startedAt: Date) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      units: { include: { tenancies: { where: { isActive: true } } } },
    },
  });

  const conversation = await prisma.conversation.upsert({
    where: { propertyId },
    update: {},
    create: {
      type: ConversationType.GROUP,
      propertyId,
      name,
      createdAt: startedAt,
      updatedAt: startedAt,
    },
  });

  await seat(conversation.id, property.ownerId, startedAt);
  if (property.caretakerId) await seat(conversation.id, property.caretakerId, startedAt);

  const tenantIds = property.units.flatMap((u) => u.tenancies.map((t) => t.tenantId));
  for (const tenantId of tenantIds) await seat(conversation.id, tenantId, startedAt);

  // Pick from the members that actually exist so every seeded message has a
  // real sender seated in the thread.
  const members = [property.ownerId, property.caretakerId, ...tenantIds].filter(
    (id): id is string => !!id,
  );

  for (let i = 0; i < GROUP_MESSAGE_COUNT; i++) {
    const createdAt = daysAgo(GROUP_MESSAGE_COUNT - i);
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: members[i % members.length],
        content: GROUP_LINES[i % GROUP_LINES.length],
        createdAt,
      },
    });
  }

  const last = await prisma.message.findFirst({
    where: { conversationId: conversation.id },
    orderBy: { id: 'desc' },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessageAt: last?.createdAt ?? null },
  });

  return conversation;
}

/**
 * Creates the three legal direct pairs for one property: tenant↔owner,
 * tenant↔caretaker and owner↔caretaker. Tenant↔tenant is deliberately absent —
 * ChatService.canMessage refuses it.
 */
async function seedDirectThreads(propertyId: string, startedAt: Date) {
  const property = await prisma.property.findUniqueOrThrow({
    where: { id: propertyId },
    include: {
      units: { include: { tenancies: { where: { isActive: true } } } },
    },
  });
  if (!property.caretakerId) return;

  const tenantIds = property.units.flatMap((u) => u.tenancies.map((t) => t.tenantId));
  if (!tenantIds.length) return;

  const pairs: [string, string][] = [
    [property.ownerId, tenantIds[0]],       // landlord ↔ tenant
    [tenantIds[0], property.caretakerId],   // tenant ↔ caretaker
    [property.ownerId, property.caretakerId], // landlord ↔ caretaker
  ];

  const created: string[] = [];

  for (const [index, [a, b]] of pairs.entries()) {
    const directKey = directKeyFor(a, b);
    const conversation = await prisma.conversation.upsert({
      where: { directKey },
      update: {},
      create: {
        type: ConversationType.DIRECT,
        directKey,
        createdAt: startedAt,
        updatedAt: startedAt,
      },
    });

    await seat(conversation.id, a, startedAt);
    await seat(conversation.id, b, startedAt);

    const lines = DIRECT_THREAD_TOPICS[index % DIRECT_THREAD_TOPICS.length];
    // Alternate authors so both participants show up as senders.
    const authors = [a, b, a, b];
    for (let i = 0; i < DIRECT_MESSAGES_PER_THREAD; i++) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: authors[i % authors.length],
          content: lines[i % lines.length],
          createdAt: daysAgo(DIRECT_MESSAGES_PER_THREAD - i),
        },
      });
    }

    const last = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { id: 'desc' },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: last?.createdAt ?? null },
    });

    created.push(conversation.id);
  }

  return created;
}

/** Seeds group + direct threads for every property. */
async function seedChat() {
  const properties = await prisma.property.findMany({ orderBy: { createdAt: 'asc' } });

  let groups = 0;
  let directs = 0;

  for (const [index, property] of properties.entries()) {
    // Stagger the start dates so inbox ordering is exercised on first login.
    await seedGroupThread(property.id, property.name, daysAgo(30 + index * 3));
    groups++;

    if (index < DIRECT_THREAD_COUNT) {
      const made = await seedDirectThreads(property.id, daysAgo(20 + index * 2));
      directs += made?.length ?? 0;
    }
  }

  // Note: participants are seated with lastReadAt = their join date, which is
  // older than every seeded message. That leaves the threads genuinely unread,
  // so the activity badge is non-zero on a fresh seed without faking it.

  console.log(
    `💬 Seeded ${groups} group thread(s) and ${directs} direct thread(s) with messages.\n`,
  );
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seeding (users, properties & billing)...\n');

  // Clean up existing seed data (children first to respect FK constraints)
  console.log('🧹 Cleaning up old seed data...');
  // Notice rows cascade from property/user_profile and recipient rows from both,
  // so these two are redundant today — they are listed explicitly because the
  // block above works children-first rather than relying on cascade order.
  await prisma.conversationParticipant.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.noticeRecipient.deleteMany({});
  await prisma.notice.deleteMany({});
  await prisma.invoiceLineItem.deleteMany({});
  await prisma.meterReading.deleteMany({});
  await prisma.invoice.deleteMany({});
  await prisma.utilityMeter.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✅ Cleanup complete.\n');

  // Seed fixed/predictable test users
  console.log('👤 Seeding default test accounts...');
  for (const user of FIXED_USERS) {
    await createUserWithProfile(user);
  }
  console.log('✅ Default test accounts seeded.\n');

  // Staff are read here because property plans need their ids, but the tenant list
  // is deliberately read *later* — after the mock tenants exist. Reading it earlier
  // measures the previous run's leftovers, so the headcount check below would pass
  // or fail for reasons unrelated to what this run actually created.
  const owners = await prisma.userProfile.findMany({
    where: { role: Role.OWNER },
    orderBy: { createdAt: 'asc' },
  });
  const caretakers = await prisma.userProfile.findMany({
    where: { role: Role.CARETAKER },
    orderBy: { createdAt: 'asc' },
  });

  // Two named properties rather than a loop: each has hand-written addresses and
  // block labels, so a generated name would read as filler in the UI and would
  // change on every reseed.
  const propertyPlans: PropertyPlan[] = [
    {
      name: 'Riverside Heights Apartments',
      address: '12 Riverside Drive, Westlands, Nairobi',
      blockPrefix: 'A',
      blockName: 'Block A',
      ownerId: owners[0].id,
      caretakerId: caretakers[0].id,
    },
    {
      name: 'Westlands Court',
      address: '45 Ring Road, Parklands, Nairobi',
      blockPrefix: 'B',
      blockName: 'Block B',
      ownerId: owners[1].id,
      caretakerId: caretakers[1].id,
    },
  ];

  // One tenant per unit, minus the fixed tenant created above. Generating any
  // fewer leaves units with nobody living in them, which is what the tenant-facing
  // screens need in order to have anything to show.
  const mockTenants = generateMockTenants(
    propertyPlans.length * UNITS_PER_PROPERTY - 1,
  );
  console.log(`👥 Seeding ${mockTenants.length} generated mock tenants...`);
  for (const user of mockTenants) {
    await createUserWithProfile(user);
  }
  console.log('✅ Mock accounts seeded.\n');

  const tenants = await prisma.userProfile.findMany({
    where: { role: Role.TENANT },
    orderBy: { createdAt: 'asc' },
  });

  const requiredTenants = propertyPlans.length * UNITS_PER_PROPERTY;
  if (
    owners.length < propertyPlans.length ||
    caretakers.length < propertyPlans.length ||
    tenants.length < requiredTenants
  ) {
    throw new Error(
      `Not enough profiles to seed properties (found ${owners.length} owners, ` +
        `${caretakers.length} caretakers, ${tenants.length} tenants; need ` +
        `${propertyPlans.length} of each staff role and ${requiredTenants} tenants).`,
    );
  }

  const tenantIds = tenants.slice(0, requiredTenants).map((t) => t.id);

  console.log('🏘️  Seeding properties, units, tenancies, meters & invoices...');
  for (const [index, plan] of propertyPlans.entries()) {
    await seedPropertyWithUnits(plan, tenantIds, index * UNITS_PER_PROPERTY);
  }
  console.log('✅ Properties seeded.\n');

  console.log('💬 Seeding chat threads & messages...');
  await seedChat();

  const [
    totalUsers,
    totalProfiles,
    totalProperties,
    totalUnits,
    totalTenancies,
    totalMeters,
    totalReadings,
    totalInvoices,
    totalLineItems,
    totalConversations,
    totalMessages,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.userProfile.count(),
    prisma.property.count(),
    prisma.unit.count(),
    prisma.tenancy.count(),
    prisma.utilityMeter.count(),
    prisma.meterReading.count(),
    prisma.invoice.count(),
    prisma.invoiceLineItem.count(),
    prisma.conversation.count(),
    prisma.message.count(),
  ]);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Seeding finished successfully!`);
  console.log(`📊 Users: ${totalUsers} | Profiles: ${totalProfiles}`);
  console.log(
    `📊 Properties: ${totalProperties} | Units: ${totalUnits} | Tenancies: ${totalTenancies}`,
  );
  console.log(`📊 Water Meters: ${totalMeters} | Meter Readings: ${totalReadings}`);
  console.log(`📊 Invoices: ${totalInvoices} | Invoice Line Items: ${totalLineItems}`);
  console.log(
    `💬 Conversations: ${totalConversations} | Messages: ${totalMessages}`,
  );
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });