import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    // `animation: 'none'` makes the Log In / Sign Up toggle feel in-place.
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}