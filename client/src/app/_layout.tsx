import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AuthGate } from '@/components/auth/auth-gate';
import { ChatProvider } from '@/components/chat/chat-provider';
import { hasSession, isCaretakerSession, isTenantSession } from '@/lib/auth-routing';
import { queryClient } from '@/lib/query-client';
import { useStore } from '@/stores/use-store';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);

  const isSignedIn = hasSession(token, profile);
  const isTenant = isTenantSession(profile);
  const isCaretaker = isCaretakerSession(profile);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/*
          Conditional root navigator (RBAC).
          Only one role group is ever mounted, chosen from the server profile
          alone. When the session clears or the role flips on a cross-role
          login, expo-router unmounts the previously protected subtree entirely
          — purging the navigation stack and every screen's local state —
          instead of leaving the former role's screens alive.

          `AuthGate` wraps the stack: it holds the UI until the persisted
          session has rehydrated (no sign-in flash for a signed-in user) and
          redirects a session that is sitting on the wrong route.
        */}
        <AuthGate>
          {/*
            ChatProvider sits above the role groups rather than inside either one,
            so the socket is connected once for a session instead of once per
            mounted stack. A provider per stack would mean navigating between two
            chats reconnects the transport, which drops room subscriptions and
            can lose the acknowledgement of a send that is still in flight.
          */}
          <ChatProvider token={isSignedIn ? (token ?? null) : null}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Protected guard={!isSignedIn}>
                <Stack.Screen name="(auth)" />
              </Stack.Protected>

              <Stack.Protected guard={isSignedIn && !isTenant && !isCaretaker}>
                <Stack.Screen name="(owner)" />
              </Stack.Protected>

              <Stack.Protected guard={isSignedIn && isCaretaker}>
                <Stack.Screen name="(caretaker)" />
              </Stack.Protected>

              <Stack.Protected guard={isSignedIn && isTenant}>
                <Stack.Screen name="(tenant)" />
              </Stack.Protected>
            </Stack>
          </ChatProvider>
        </AuthGate>
        <PortalHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
