import { Stack } from 'expo-router';

import { strings } from '@/constants/strings';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: strings.appName }} />
    </Stack>
  );
}
