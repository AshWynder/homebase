import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { prisma } from './prisma.client';
import { auth } from '../src/auth/auth';
import {
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
];

function generateRandomKenyanPhone(): string {
  const prefixes = ['70', '71', '72', '79', '74', '75', '76'];
  const prefix = faker.helpers.arrayElement(prefixes);
  const suffix = faker.string.numeric(7);
  return `+254${prefix}${suffix}`;
}

function generateMockUsers(count = 14): SeedUserData[] {
  const users: SeedUserData[] = [];
  const usedPhones = new Set<string>(FIXED_USERS.map((u) => u.phone));
  const usedNationalIds = new Set<string>(FIXED_USERS.map((u) => u.nationalId));

  // Distribution: 2 Owners, 2 Caretakers, rest Tenants
  const roles: Role[] = [
    Role.OWNER,
    Role.OWNER,
    Role.CARETAKER,
    Role.CARETAKER,
    ...Array(count - 4).fill(Role.TENANT),
  ];

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
// Main
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seeding (users, properties & billing)...\n');

  // Clean up existing seed data (children first to respect FK constraints)
  console.log('🧹 Cleaning up old seed data...');
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

  // Seed mock users generated with Faker
  // 2 owners + 2 caretakers + 19 tenants (+ 1 fixed tenant) = 20 tenants,
  // exactly one per unit across the 2 properties × 10 units.
  const mockUsers = generateMockUsers(23);
  console.log(`👥 Seeding ${mockUsers.length} generated mock accounts...`);
  for (const user of mockUsers) {
    await createUserWithProfile(user);
  }
  console.log('✅ Mock accounts seeded.\n');

  // Load the profiles created above
  const owners = await prisma.userProfile.findMany({
    where: { role: Role.OWNER },
    orderBy: { createdAt: 'asc' },
  });
  const caretakers = await prisma.userProfile.findMany({
    where: { role: Role.CARETAKER },
    orderBy: { createdAt: 'asc' },
  });
  const tenants = await prisma.userProfile.findMany({
    where: { role: Role.TENANT },
    orderBy: { createdAt: 'asc' },
  });

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
  ]);

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Seeding finished successfully!`);
  console.log(`📊 Users: ${totalUsers} | Profiles: ${totalProfiles}`);
  console.log(
    `📊 Properties: ${totalProperties} | Units: ${totalUnits} | Tenancies: ${totalTenancies}`,
  );
  console.log(`📊 Water Meters: ${totalMeters} | Meter Readings: ${totalReadings}`);
  console.log(`📊 Invoices: ${totalInvoices} | Invoice Line Items: ${totalLineItems}`);
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