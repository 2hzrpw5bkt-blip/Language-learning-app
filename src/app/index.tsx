import { Redirect } from 'expo-router';

import { useAuth } from '@/lib/auth';

// The app's entry point: send the user to the right place for their state.
export default function Index() {
  const { session, profile } = useAuth();
  if (!session) return <Redirect href="/sign-in" />;
  if (profile?.is_banned) return <Redirect href="/banned" />;
  if (!profile?.onboarded_at) return <Redirect href="/onboarding" />;
  return <Redirect href="/partners" />;
}
