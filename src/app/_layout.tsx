import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { strings } from '@/constants/strings';
import { AuthProvider, useAuth } from '@/lib/auth';

// Keep the splash screen up until we know whether the user is signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootStack />
    </AuthProvider>
  );
}

// Route groups are guarded by auth state. Expo Router redirects away from a group
// the moment its guard turns false (for example right after sign-out).
function RootStack() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  const signedIn = session !== null;
  const banned = profile?.is_banned === true;
  const onboarded = profile?.onboarded_at != null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && banned}>
        <Stack.Screen name="banned" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !banned && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !banned && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="edit-profile"
          options={{ presentation: 'modal', headerShown: true, title: strings.editProfile.title }}
        />
      </Stack.Protected>
      <Stack.Screen
        name="legal/terms"
        options={{ presentation: 'modal', headerShown: true, title: strings.legal.termsTitle }}
      />
      <Stack.Screen
        name="legal/privacy"
        options={{ presentation: 'modal', headerShown: true, title: strings.legal.privacyTitle }}
      />
    </Stack>
  );
}
