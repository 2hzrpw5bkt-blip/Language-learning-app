// Holds the signed-in session and the user's profile, and hands them to every screen.
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { fetchLanguages, fetchProfile, touchLastActive, type ProfileData } from '@/lib/profile';
import { supabase } from '@/lib/supabase';
import type { Language, Profile, UserLanguage } from '@/lib/types';

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  userLanguages: UserLanguage[];
  languages: Language[];
  loading: boolean;
  // True when the profile could not be loaded (offline, server down). Use retry().
  loadFailed: boolean;
  retry: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const EMPTY: ProfileData = { profile: null, languages: [] };

type LoadResult = ProfileData & { failed: boolean };

async function loadProfileData(userId: string | null): Promise<LoadResult> {
  if (!userId) return { ...EMPTY, failed: false };
  try {
    const data = await fetchProfile(userId);
    if (data.profile) touchLastActive();
    return { ...data, failed: false };
  } catch (error) {
    console.warn('Could not load profile', error);
    // Never treat a network failure as "new user": that would send them back through onboarding.
    return { ...EMPTY, failed: true };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>(EMPTY);
  // Which user the current profileData belongs to. `undefined` means nothing loaded yet.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  // Load the language list once, and try again on each sign-in if an earlier attempt failed
  // (for example because the app was opened before the database was ready).
  const haveLanguages = languages.length > 0;
  useEffect(() => {
    if (haveLanguages) return;
    let cancelled = false;
    fetchLanguages()
      .then((list) => {
        if (!cancelled) setLanguages(list);
      })
      .catch((error) => console.warn('Could not load languages', error));
    return () => {
      cancelled = true;
    };
  }, [haveLanguages, userId]);

  useEffect(() => {
    if (!sessionLoaded) return;
    let cancelled = false;
    loadProfileData(userId).then(({ failed, ...data }) => {
      if (cancelled) return;
      setProfileData(data);
      setLoadFailed(failed);
      setLoadedFor(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId, sessionLoaded, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setProfileData(await fetchProfile(userId));
  }, [userId]);

  const value: AuthContextValue = {
    session,
    profile: profileData.profile,
    userLanguages: profileData.languages,
    languages,
    loading: !sessionLoaded || loadedFor !== userId,
    loadFailed,
    retry,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
