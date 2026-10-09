import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../../prisma/prisma.client';
import { bearer, jwt } from 'better-auth/plugins';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  // Expo web dev origins (mirrors CORS_ORIGINS in .env.development).
  trustedOrigins: ['http://localhost:8081', 'http://localhost:8082'],
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    // This API authenticates with Bearer tokens (no cookie sessions), so
    // Better Auth's cookie-CSRF origin check is unnecessary — and it rejects
    // native clients that send no Origin header ("Missing or null Origin").
    disableCSRFCheck: true,
  },
  plugins: [
    jwt({
      jwt: {
        expirationTime: '1h',
        refreshExpirationTime: '7d',
      },
    }),
    bearer(),
  ],
});
