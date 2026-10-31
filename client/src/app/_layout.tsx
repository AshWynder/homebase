import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

import { AuthGate } from '@/components/auth/auth-gate';
import { ChatProvider } from '@/components/chat/chat-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useDisplayPreferences } from '@/hooks/use-display-preferences';
import { hasSession, isCaretakerSession, isTenantSession } from '@/lib/auth-routing';
import { queryClient } from '@/lib/query-client';
import { useStore } from '@/stores/use-store';

export default function RootLayout() {
  // Applies the persisted theme + text-size preferences to NativeWind.
  useDisplayPreferences();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const colorScheme = useColorScheme();

  const token = useStore((s) => s.token);
  const profile = useStore((s) => s.profile);

  const isSignedIn = hasSession(token, profile);
  const isTenant = isTenantSession(profile);
  const isCaretaker = isCaretakerSession(profile);

  const customDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#0B0F17',
      card: '#131A26',
      text: '#F1F5F9',
      border: 'rgba(255,255,255,0.08)',
      primary: '#34D399',
      notification: '#10B981',
    },
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? customDarkTheme : DefaultTheme}>
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
            {colorScheme === 'dark' ? <StatusBar barStyle="light-content" backgroundColor="#0B0F17" /> : <StatusBar barStyle="dark-content" />}
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
