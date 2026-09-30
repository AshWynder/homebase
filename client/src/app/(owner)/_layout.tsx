import { Stack } from 'expo-router';

export default function OwnerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="tenancy/[id]"
        options={{
          animation: 'slide_from_right',
          gestureEnabled: true,
        }}
      />
      {/* Activity drill-downs. These are pushed on top of the tabs rather than
          rendered as tab screens, so the hub stays a single scrolling list. */}
      <Stack.Screen name="maintenance/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notices/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="chats/[id]" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
