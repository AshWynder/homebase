import { api, unwrap } from '@/lib/axios';

import type {
  MeResponse,
  RegisterInput,
  RegisterResponse,
  SignInResponse,
} from './types';

/**
 * Auth endpoints.
 *
 * NOTE: `/api/auth/register` and `/api/auth/me` are custom NestJS routes and
 * return the `{ success, data }` envelope (use `unwrap`). The Better Auth
 * passthrough routes (`sign-in/email`, `sign-out`) are handled by
 * `toNodeHandler` and return raw JSON — no envelope.
 */
export const authApi = {
  register: (input: RegisterInput) =>
    unwrap<RegisterResponse>(api.post('/api/auth/register', input)),

  signIn: (input: { email: string; password: string }) =>
    api
      .post<SignInResponse>('/api/auth/sign-in/email', input)
      .then((res) => res.data),

  signOut: () =>
    api.post('/api/auth/sign-out').then((res) => res.data as unknown),

  me: () => unwrap<MeResponse>(api.get('/api/auth/me')),
};