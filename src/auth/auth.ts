import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../../prisma/prisma.client';
import { bearer, jwt } from 'better-auth/plugins';

export  const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    jwt({
      jwt: {
        expirationTime: '1h',
        refreshExpirationTime: '7d'
      },
    }),
    bearer(),
  ]
})