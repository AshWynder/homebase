import 'dotenv/config';
import { prisma } from './prisma.client';
import { auth } from '../src/auth/auth';
import {
  ConversationType,
  InvoiceLineItemType,
  InvoiceStatus,
  MeterType,
  Role,
} from '../generated/prisma/enums';

// Production seed: one property, one owner, one caretaker and ten tenants.
// Idempotent on every axis (users by email, property by name, units by number,
// tenancy by active unit, meter by unit+type, invoice by tenancy+period) so it
// is safe to re-run. It never deletes anything and never touches payments.

const PASSWORD = 'pass1234';
const RENT_AMOUNT = 25000;
const WATER_PRICE_PER_UNIT = 150;
const GARBAGE_FEE = 200;
const SERVICE_CHARGE_FEE = 500;
const UNIT_COUNT = 10;
const METER_READING_MONTHS = [3, 2, 1, 0];

const PROPERTY_NAME = 'Valerian Court Apartments';
const PROPERTY_ADDRESS = 'Nairobi, Kenya';
const BLOCK_NAME = 'Block A';
const UNIT_PREFIX = 'A';

interface SeedUserData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: Role;
  nationalId: string;
}

const OWNER: SeedUserData = {
  name: 'Hope Valeiran',
  email: 'valerian@gmail.com',
  password: PASSWORD,
  phone: '+254700100001',
  role: Role.OWNER,
  nationalId: '10000001',
};

const CARETAKER: SeedUserData = {
  name: 'Dominic Kali',
  email: 'kali@gmail.com',
  password: PASSWORD,
  phone: '+254700100002',
  role: Role.CARETAKER,
  nationalId: '10000002',
};

const TENANTS: SeedUserData[] = Array.from({ length: UNIT_COUNT }, (_, index) => {
  const number = index + 1;
  return {
    name: `Tenant ${number}`,
    email: `tenant${number}@gmail.com`,
    password: PASSWORD,
    phone: `+2547110000${String(number).padStart(2, '0')}`,
    role: Role.TENANT,
    nationalId: String(20000001 + index),
  };
});

interface ReadingInfo {
  id: string;
  unitsConsumed: number;
  consumptionCost: number;
}

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

function directKeyFor(a: string, b: string): string {
  return [a, b].sort().join(':');
}

async function ensureUser(data: SeedUserData) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  let userId = existing?.id;

  if (!userId) {
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

    userId = result.user.id;
    console.log(`  created ${data.role}: ${data.email}`);
  } else {
    console.log(`  exists  ${data.role}: ${data.email}`);
  }

  const profile = await prisma.userProfile.upsert({
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

  return profile;
}

async function ensureProperty(ownerId: string, caretakerId: string) {
  const existing = await prisma.property.findFirst({
    where: { name: PROPERTY_NAME },
  });

  if (existing) {
    console.log(`  exists  property: ${existing.name}`);
    return existing;
  }

  const property = await prisma.property.create({
    data: {
      name: PROPERTY_NAME,
      address: PROPERTY_ADDRESS,
      ownerId,
      caretakerId,
    },
  });

  console.log(`  created property: ${property.name}`);
  return property;
}

async function ensureUnit(propertyId: string, unitNumber: string) {
  const existing = await prisma.unit.findFirst({
    where: { propertyId, unitNumber },
  });

  if (existing) return existing;

  return prisma.unit.create({
    data: {
      unitNumber,
      blockName: BLOCK_NAME,
      propertyId,
    },
  });
}

async function ensureTenancy(tenantId: string, unitId: string) {
  const existing = await prisma.tenancy.findFirst({
    where: { unitId, isActive: true },
  });

  if (existing) return existing;

  return prisma.tenancy.create({
    data: {
      tenantId,
      unitId,
      rentAmount: RENT_AMOUNT,
      startDate: monthsAgo(6),
      isActive: true,
    },
  });
}

async function ensureMeter(unitId: string, unitNumber: string) {
  return prisma.utilityMeter.upsert({
    where: {
      unitId_meterType: { unitId, meterType: MeterType.WATER },
    },
    update: {},
    create: {
      unitId,
      meterType: MeterType.WATER,
      meterNumber: `WM-${unitNumber}`,
      pricePerUnit: WATER_PRICE_PER_UNIT,
    },
  });
}

async function ensureReadings(
  meterId: string,
  unitIndex: number,
): Promise<ReadingInfo> {
  const existing = await prisma.meterReading.findFirst({
    where: { meterId },
    orderBy: { readingDate: 'desc' },
  });

  if (existing) {
    return {
      id: existing.id,
      unitsConsumed: existing.unitsConsumed,
      consumptionCost: Number(existing.consumptionCost),
    };
  }

  let previousReading = 1000 + unitIndex * 50;
  let latest: ReadingInfo | undefined;

  for (const [monthIndex, offset] of METER_READING_MONTHS.entries()) {
    const unitsConsumed = 10 + ((unitIndex + monthIndex) % 6);
    const currentReading = previousReading + unitsConsumed;
    const consumptionCost = unitsConsumed * WATER_PRICE_PER_UNIT;

    const reading = await prisma.meterReading.create({
      data: {
        meterId,
        currentReading,
        unitsConsumed,
        pricePerUnit: WATER_PRICE_PER_UNIT,
        consumptionCost,
        readingDate: monthsAgo(offset),
      },
    });

    latest = {
      id: reading.id,
      unitsConsumed,
      consumptionCost,
    };
    previousReading = currentReading;
  }

  await prisma.utilityMeter.update({
    where: { id: meterId },
    data: { lastReading: previousReading },
  });

  if (!latest) {
    throw new Error(`Failed to seed readings for meter ${meterId}`);
  }

  return latest;
}

async function ensureInvoice(params: {
  unitId: string;
  tenancyId: string;
  unitIndex: number;
  latestReading: ReadingInfo;
}) {
  const { unitId, tenancyId, unitIndex, latestReading } = params;
  const now = new Date();
  const periodStart = startOfMonth(now);
  const period = monthLabel(periodStart);

  const existing = await prisma.invoice.findUnique({
    where: { tenancyId_periodStart: { tenancyId, periodStart } },
  });

  if (existing) return existing;

  const lineItems: {
    type: InvoiceLineItemType;
    description: string;
    amount: number;
    meterReadingId?: string;
  }[] = [
    {
      type: InvoiceLineItemType.RENT,
      description: `Monthly rent – ${period}`,
      amount: RENT_AMOUNT,
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

  return prisma.invoice.create({
    data: {
      unitId,
      tenancyId,
      periodStart,
      periodEnd: endOfMonth(now),
      amount,
      balanceDue: amount,
      dueDate: dueDateInCurrentMonth(now),
      status: InvoiceStatus.UNPAID,
      lineItems: {
        create: lineItems,
      },
    },
  });
}

async function seat(conversationId: string, profileId: string, joinedAt: Date) {
  await prisma.conversationParticipant.upsert({
    where: { conversationId_profileId: { conversationId, profileId } },
    update: {},
    create: { conversationId, profileId, joinedAt, lastReadAt: joinedAt },
  });
}

async function ensureGroupThread(
  propertyId: string,
  propertyName: string,
  profileIds: string[],
) {
  const conversation = await prisma.conversation.upsert({
    where: { propertyId },
    update: {},
    create: {
      type: ConversationType.GROUP,
      propertyId,
      name: propertyName,
    },
  });

  for (const profileId of profileIds) {
    await seat(conversation.id, profileId, new Date());
  }

  const existingMessages = await prisma.message.count({
    where: { conversationId: conversation.id },
  });

  if (existingMessages === 0 && profileIds.length > 0) {
    const lines = [
      'Welcome to Valerian Court Apartments. This is the property group thread.',
      'Water will be off on Thursday from 9am to 1pm for maintenance.',
      'The water is back on. Apologies for the delay.',
      'Reminder: rent is due on the 5th of every month.',
    ];

    for (const [index, content] of lines.entries()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: profileIds[index % profileIds.length],
          content,
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
  }

  return conversation;
}

async function ensureDirectThread(
  a: string,
  b: string,
  lines: readonly string[],
) {
  const directKey = directKeyFor(a, b);

  const conversation = await prisma.conversation.upsert({
    where: { directKey },
    update: {},
    create: {
      type: ConversationType.DIRECT,
      directKey,
    },
  });

  await seat(conversation.id, a, new Date());
  await seat(conversation.id, b, new Date());

  const existingMessages = await prisma.message.count({
    where: { conversationId: conversation.id },
  });

  if (existingMessages === 0) {
    const authors = [a, b, a, b];

    for (const [index, line] of lines.entries()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: authors[index % authors.length],
          content: line,
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
  }
}

async function main() {
  console.log('🌱 Starting production seed...\n');

  console.log('👤 Users');
  const owner = await ensureUser(OWNER);
  const caretaker = await ensureUser(CARETAKER);
  const tenants: { id: string }[] = [];

  for (const tenant of TENANTS) {
    tenants.push(await ensureUser(tenant));
  }

  console.log('\n🏠 Property, units, tenancies, meters & invoices');
  const property = await ensureProperty(owner.id, caretaker.id);
  const tenantProfileIds: string[] = [];

  for (const [index, tenant] of tenants.entries()) {
    const unitNumber = `${UNIT_PREFIX}-${101 + index}`;
    const unit = await ensureUnit(property.id, unitNumber);
    const tenancy = await ensureTenancy(tenant.id, unit.id);
    const meter = await ensureMeter(unit.id, unitNumber);
    const latestReading = await ensureReadings(meter.id, index);

    await ensureInvoice({
      unitId: unit.id,
      tenancyId: tenancy.id,
      unitIndex: index,
      latestReading,
    });

    tenantProfileIds.push(tenant.id);
  }

  console.log(`  ${UNIT_COUNT} units, tenancies, meters, readings and unpaid invoices ready.`);

  console.log('\n💬 Chat threads');
  const groupProfileIds = [owner.id, caretaker.id, ...tenantProfileIds];
  await ensureGroupThread(property.id, property.name, groupProfileIds);

  await ensureDirectThread(owner.id, tenantProfileIds[0], [
    'Hello, I would like to report a leaking tap in my kitchen.',
    'Noted. I will send the caretaker to check it tomorrow morning.',
    'Thank you.',
    'The caretaker will be there at 9am.',
  ]);

  await ensureDirectThread(tenantProfileIds[0], caretaker.id, [
    'Good morning, the gate code changed — is the new one active?',
    'Yes, it went live this morning.',
    'Got it, testing it now.',
    'Let me know if it does not work for you.',
  ]);

  await ensureDirectThread(owner.id, caretaker.id, [
    'The gutter cleaning is due before the rains.',
    'I can do it on Friday morning.',
    'Friday works.',
    'I will confirm once it is done.',
  ]);

  console.log('  group thread and 3 direct threads ready.');

  const [users, profiles, properties, units, tenancies, meters, readings, invoices, payments] =
    await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.property.count(),
      prisma.unit.count(),
      prisma.tenancy.count(),
      prisma.utilityMeter.count(),
      prisma.meterReading.count(),
      prisma.invoice.count(),
      prisma.payment.count(),
    ]);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Production seed finished successfully!');
  console.log(`📊 Users: ${users} | Profiles: ${profiles}`);
  console.log(`📊 Properties: ${properties} | Units: ${units} | Tenancies: ${tenancies}`);
  console.log(`📊 Meters: ${meters} | Readings: ${readings}`);
  console.log(`📊 Invoices: ${invoices} | Payments: ${payments}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((error) => {
    console.error('❌ Seed error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
