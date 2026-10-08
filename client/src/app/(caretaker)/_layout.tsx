import { Stack } from 'expo-router';

export default function CaretakerLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="property/[id]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="unit/[id]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      {/* Activity drill-downs, pushed on top of the tabs. */}
      <Stack.Screen name="maintenance/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="maintenance/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="notices/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="notices/[id]"
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen name="chats/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="chats/[id]"
        options={{ animation: 'slide_from_right' }}
      />
    </Stack>
  );
}
