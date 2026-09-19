import { Stack } from 'expo-router';

import { strings } from '@/constants/strings';

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="sign-in" options={{ title: strings.auth.signInTitle }} />
      <Stack.Screen name="sign-up" options={{ title: strings.auth.signUpTitle }} />
    </Stack>
  );
}
