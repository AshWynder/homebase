import 'dotenv/config';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { prisma } from '../../prisma/prisma.client';
import { bearer, jwt, username } from 'better-auth/plugins';

// Comma-separated allowlist, same shape as CORS_ORIGINS. Falls back to the Expo
// web dev origins so local development keeps working without extra setup.
const trustedOrigins = (
  process.env['BETTER_AUTH_TRUSTED_ORIGINS'] ??
  'http://localhost:8081,http://localhost:8082'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
  },
  advanced: {
    // This API authenticates with Bearer tokens (no cookie sessions), so
    // Better Auth's cookie-CSRF origin check is unnecessary — and it rejects
    // native clients that send no Origin header ("Missing or null Origin").
    disableCSRFCheck: true,
    // Cookies ignore ports, so two Better Auth apps on the same hostname (this
    // API on :5000 and another app on :443) would otherwise read and overwrite
    // each other's `better-auth.*` cookies. A distinct prefix keeps this API's
    // cookies isolated even though it does not rely on them.
    cookiePrefix: 'homebase',
  },
  plugins: [
    jwt({
      jwt: {
        expirationTime: '1h',
        refreshExpirationTime: '7d',
      },
    }),
    bearer(),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameNormalization: (value) => value.trim().toLowerCase(),
      displayUsername: false,
    }),
  ],
});
