import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'is_public';

/** Marks a route as publicly accessible (skips the global AuthGuard). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);