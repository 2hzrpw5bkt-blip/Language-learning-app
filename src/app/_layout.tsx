import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { ActivityIndicator } from 'react-native';
import { useEffect } from 'react';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Body, Title } from '@/components/typography';
import { strings } from '@/constants/strings';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { ChatProvider } from '@/lib/chat-context';

// Keep the splash screen up until we know whether the user is signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <ChatProvider>
        <StatusBar style="dark" />
        <RootStack />
      </ChatProvider>
    </AuthProvider>
  );
}

// Route groups are guarded by auth state. Expo Router redirects away from a group
// the moment its guard turns false (for example right after sign-out).
function RootStack() {
  const { session, profile, loading, loadFailed, retry } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ActivityIndicator />
      </Screen>
    );
  }

  if (session && loadFailed) {
    return (
      <Screen edges={['top', 'bottom']}>
        <Title>{strings.errors.loadFailedTitle}</Title>
        <Body>{strings.errors.loadFailedBody}</Body>
        <Button title={strings.common.retry} onPress={retry} />
      </Screen>
    );
  }

  // Signed in with no profile row at all means the account was deleted elsewhere: sign out
  // rather than sending the user back through onboarding.
  if (session && !loadFailed && !profile) {
    supabase.auth.signOut();
    return (
      <Screen edges={['top', 'bottom']}>
        <ActivityIndicator />
      </Screen>
    );
  }

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
        <Stack.Screen name="partner/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: true, headerBackButtonDisplayMode: 'minimal' }} />
        <Stack.Screen name="blocked-users" options={{ headerShown: true, title: strings.chats.blockedUsers }} />
        <Stack.Screen
          name="welcome"
          options={{ presentation: 'modal', headerShown: true, title: strings.welcome.title }}
        />
        <Stack.Screen
          name="report"
          options={{ presentation: 'modal', headerShown: true, title: strings.report.title }}
        />
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
