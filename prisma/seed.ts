import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { prisma } from './prisma.client';
import { auth } from '../src/auth/auth';
import { Role } from '../generated/prisma/enums';

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

  // Distribution: 2 Owners, 2 Caretakers, 10 Tenants
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

async function main() {
  console.log('🌱 Starting User & Profile Seeding...\n');

  // Clean up existing user profile and auth data
  console.log('🧹 Cleaning up old user profiles and auth data...');
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
  const mockUsers = generateMockUsers(12);
  console.log(`👥 Seeding ${mockUsers.length} generated mock accounts...`);
  for (const user of mockUsers) {
    await createUserWithProfile(user);
  }
  console.log('✅ Mock accounts seeded.\n');

  const totalUsers = await prisma.user.count();
  const totalProfiles = await prisma.userProfile.count();

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🎉 Seeding finished successfully!`);
  console.log(`📊 Total Users in DB: ${totalUsers}`);
  console.log(`📊 Total Profiles in DB: ${totalProfiles}`);
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
