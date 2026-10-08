import { Stack } from 'expo-router';

export default function TenantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="account"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="tenancy/terminate"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="pay/[invoiceId]"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="maintenance/new"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="maintenance/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="notices/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      {/* Outside the tab bar: the inbox is a tab, but a thread is pushed onto the
          stack so the composer sits above the keyboard instead of behind it. */}
      <Stack.Screen
        name="chats/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
