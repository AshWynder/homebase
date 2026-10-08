import { api, unwrap } from '@/lib/axios';

import type {
  ChangePasswordInput,
  MeResponse,
  Paginated,
  RegisterInput,
  RegisterResponse,
  Role,
  SignInResponse,
  UpdateProfileInput,
  UserProfile,
} from './types';

export interface QueryUsersInput {
  role?: Role;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Auth endpoints.
 *
 * NOTE: `/api/auth/register`, `/api/auth/me`, `/api/auth/profile`, `/api/auth/avatar`,
 * and `/api/auth/change-password` are custom NestJS routes and return the `{ success, data }`
 * envelope (use `unwrap`). The Better Auth passthrough routes (`sign-in/email`, `sign-out`)
 * are handled by `toNodeHandler` and return raw JSON — no envelope.
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

  /**
   * `token` overrides the store's token via an explicit header. `useSignIn`
   * passes the freshly issued token so the profile can be fetched *before* any
   * session is written to the store.
   */
  me: (token?: string) =>
    unwrap<MeResponse>(
      api.get('/api/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    ),

  updateProfile: (input: UpdateProfileInput) =>
    unwrap<MeResponse>(api.patch('/api/auth/profile', input)),

  uploadAvatar: (formData: FormData) =>
    unwrap<MeResponse>(
      api.post('/api/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }),
    ),

  changePassword: (input: ChangePasswordInput) =>
    unwrap<{ success: boolean; message: string }>(
      api.post('/api/auth/change-password', input),
    ),

  /**
   * User profiles for the owner-side pickers.
   */
  listUsers: (params: QueryUsersInput = {}) =>
    unwrap<Paginated<UserProfile>>(api.get('/api/auth/users', { params })),
};
