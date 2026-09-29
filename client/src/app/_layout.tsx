import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { isTenantSession } from '@/lib/auth-routing';
import { queryClient } from '@/lib/query-client';
import { useStore } from '@/stores/use-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);
  const activeRole = useStore((s) => s.activeRole);

  const isSignedIn = !!token;
  const isTenant = isTenantSession(profile, activeRole);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/*
          Conditional root navigator (RBAC).
          Only one role group is ever mounted. When `token`/role flip on logout
          or a cross-role login, expo-router unmounts the previously protected
          subtree entirely — purging the navigation stack and every screen's
          local state — instead of leaving the former role's screens alive.
        */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>

          <Stack.Protected guard={isSignedIn && !isTenant}>
            <Stack.Screen name="(owner)" />
          </Stack.Protected>

          <Stack.Protected guard={isSignedIn && isTenant}>
            <Stack.Screen name="(tenant)" />
          </Stack.Protected>
        </Stack>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}