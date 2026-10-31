import 'dotenv/config';
import { prisma } from './prisma.client';
import { auth } from '../src/auth/auth';
import { ConversationType, MeterType, Role } from '../generated/prisma/enums';
import jikazeData from './data/jikaze.json';

const PASSWORD = 'pass1234';

interface JikazeTenant {
  name: string;
  email: string | null;
  'phone number': number;
  'start date': string | null;
  'rent amount': number;
  'deposit amount paid': number;
  unit: string;
}

interface JikazeOwner {
  name: string;
  email: string;
}

interface JikazeData {
  properties: { name: string; address: string }[];
  owner: JikazeOwner;
  tenants: JikazeTenant[];
}

const data = jikazeData as JikazeData;

function generateUsername(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].toLowerCase();
  }
  return (parts[0].charAt(0) + parts.slice(1).join('')).toLowerCase();
}

function generateEmail(name: string): string {
  return `${generateUsername(name)}@example.com`;
}

function formatPhone(phone: number): string {
  return `+${phone}`;
}

function generateNationalId(index: number): string {
  return String(30000001 + index).padStart(8, '0');
}

interface SeedUser {
  id: string;
  name: string;
  email: string;
  username: string;
  phone: string;
  role: Role;
  nationalId: string;
}

async function ensureUser(data: {
  name: string;
  email: string;
  username: string;
  phone: string;
  role: Role;
  nationalId: string;
}): Promise<SeedUser> {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });

  let userId = existing?.id;

  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: {
        name: data.name,
        email: data.email,
        password: PASSWORD,
      },
    });

    if (!result?.user?.id) {
      throw new Error(`Failed to create auth user for ${data.email}`);
    }

    userId = result.user.id;
    console.log(`  created ${data.role}: ${data.email} (username: ${data.username})`);
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

  // Set the username on the User record (signUpEmail does not accept it)
  await prisma.user.update({
    where: { id: userId },
    data: { username: data.username },
  });

  return { id: userId, ...data };
}

async function ensureUnit(propertyId: string, unitNumber: string) {
  const existing = await prisma.unit.findFirst({
    where: { propertyId, unitNumber },
  });

  if (existing) return existing;

  return prisma.unit.create({
    data: {
      unitNumber,
      propertyId,
    },
  });
}

async function ensureTenancy(tenantId: string, unitId: string, rentAmount: number, startDate: Date) {
  const existing = await prisma.tenancy.findFirst({
    where: { unitId, isActive: true },
  });

  if (existing) return existing;

  return prisma.tenancy.create({
    data: {
      tenantId,
      unitId,
      rentAmount,
      startDate,
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
      pricePerUnit: 150.00,
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

async function main() {
  console.log('🌱 Starting jikaze seed...\n');

  // ─────────────────────────────────────────────────────────────
  // 1. Owner
  // ─────────────────────────────────────────────────────────────
  console.log('👤 Creating owner...');
  const owner = await ensureUser({
    name: data.owner.name,
    email: data.owner.email,
    username: generateUsername(data.owner.name),
    phone: formatPhone(254700000000),
    role: Role.OWNER,
    nationalId: generateNationalId(0),
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Tenants
  // ─────────────────────────────────────────────────────────────
  console.log('\n👥 Creating tenants...');
  const tenants: SeedUser[] = [];

  for (const [index, t] of data.tenants.entries()) {
    const tenant = await ensureUser({
      name: t.name,
      email: t.email ?? generateEmail(t.name),
      username: generateUsername(t.name),
      phone: formatPhone(t['phone number']),
      role: Role.TENANT,
      nationalId: generateNationalId(index + 1),
    });
    tenants.push(tenant);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. Property
  // ─────────────────────────────────────────────────────────────
  console.log('\n🏠 Creating property...');
  const existingProperty = await prisma.property.findFirst({
    where: { name: data.properties[0].name },
  });

  let property;
  if (existingProperty) {
    property = existingProperty;
    console.log(`  exists  property: ${property.name}`);
  } else {
    property = await prisma.property.create({
      data: {
        name: data.properties[0].name,
        address: data.properties[0].address,
        ownerId: owner.id,
      },
    });
    console.log(`  created property: ${property.name}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Units, tenancies, utility meters (water only, no readings)
  // ─────────────────────────────────────────────────────────────
  console.log('\n🏗️  Creating units, tenancies, and water meters...');
  const tenantProfileIds: string[] = [];

  for (const [index, tenant] of tenants.entries()) {
    const t = data.tenants[index];

    const unit = await ensureUnit(property.id, t.unit);

    const startDate = t['start date'] ? new Date(t['start date']) : new Date();

    await ensureTenancy(tenant.id, unit.id, t['rent amount'], startDate);

    await ensureMeter(unit.id, t.unit);

    tenantProfileIds.push(tenant.id);
    console.log(`  unit ${t.unit}: tenancy + water meter for ${t.name}`);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. Chat — property group thread + owner↔tenant direct threads
  // ─────────────────────────────────────────────────────────────
  console.log('\n💬 Creating chat threads...');

  const groupProfileIds = [owner.id, ...tenantProfileIds];

  const groupConversation = await prisma.conversation.upsert({
    where: { propertyId: property.id },
    update: {},
    create: {
      type: ConversationType.GROUP,
      propertyId: property.id,
      name: property.name,
    },
  });

  for (const profileId of groupProfileIds) {
    await seat(groupConversation.id, profileId, new Date());
  }

  console.log(`  group thread for ${property.name}`);

  for (const tenantId of tenantProfileIds) {
    const directKey = [owner.id, tenantId].sort().join(':');

    const directConversation = await prisma.conversation.upsert({
      where: { directKey },
      update: {},
      create: {
        type: ConversationType.DIRECT,
        directKey,
      },
    });

    await seat(directConversation.id, owner.id, new Date());
    await seat(directConversation.id, tenantId, new Date());
  }

  console.log(`  ${tenantProfileIds.length} direct thread(s) (owner ↔ each tenant)`);

  // ─────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────
  const [users, profiles, properties, units, tenancies, meters, conversations] =
    await Promise.all([
      prisma.user.count(),
      prisma.userProfile.count(),
      prisma.property.count(),
      prisma.unit.count(),
      prisma.tenancy.count(),
      prisma.utilityMeter.count(),
      prisma.conversation.count(),
    ]);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Jikaze seed finished successfully!');
  console.log(`📊 Users: ${users} | Profiles: ${profiles}`);
  console.log(`📊 Properties: ${properties} | Units: ${units} | Tenancies: ${tenancies}`);
  console.log(`📊 Water Meters: ${meters} | Conversations: ${conversations}`);
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