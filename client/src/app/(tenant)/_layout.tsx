import { Stack } from 'expo-router';

export default function TenantLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
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
    </Stack>
  );
}
