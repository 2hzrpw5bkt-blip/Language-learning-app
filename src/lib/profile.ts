// All reads and writes for profiles, languages and avatars. Screens call these, never Supabase directly.
import { supabase } from '@/lib/supabase';
import type { Language, LearnChoices, Profile, TeachChoices, UserLanguage } from '@/lib/types';

export async function fetchLanguages(): Promise<Language[]> {
  const { data, error } = await supabase.from('languages').select('code, name').order('name');
  if (error) throw error;
  return data as Language[];
}

export type ProfileData = { profile: Profile | null; languages: UserLanguage[] };

export async function fetchProfile(userId: string): Promise<ProfileData> {
  const [profileResult, languagesResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('user_languages').select('*').eq('user_id', userId),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (languagesResult.error) throw languagesResult.error;
  return {
    profile: profileResult.data as Profile | null,
    languages: languagesResult.data as UserLanguage[],
  };
}

export type ProfilePatch = Partial<
  Pick<Profile, 'display_name' | 'bio' | 'avatar_color' | 'timezone' | 'onboarded_at'>
>;

// Updates the profile row, or creates it if it is missing (accounts made before the trigger existed).
// Not an upsert: that would need update rights on every column, which users deliberately lack.
export async function saveProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const updated = await supabase.from('profiles').update(patch).eq('id', userId).select('id');
  if (updated.error) throw updated.error;
  if (updated.data.length > 0) return;
  const inserted = await supabase.from('profiles').insert({ id: userId, ...patch });
  if (inserted.error) throw inserted.error;
}

// Replaces the user's whole language list in one database transaction.
export async function saveUserLanguages(
  _userId: string,
  teach: TeachChoices,
  learn: LearnChoices,
): Promise<void> {
  const rows = [
    ...Object.entries(teach).map(([code, { native }]) => ({
      language_code: code,
      kind: native ? 'native' : 'fluent',
      level: null,
    })),
    ...Object.entries(learn).map(([code, level]) => ({ language_code: code, kind: 'learning', level })),
  ];
  const { error } = await supabase.rpc('set_user_languages', { p_rows: rows });
  if (error) throw error;
}

// True if the text contains a word from the banned list (same check the server applies).
export async function containsBannedWords(text: string): Promise<boolean> {
  if (text.trim().length === 0) return false;
  const { data, error } = await supabase.rpc('contains_banned_words', { txt: text });
  if (error) return false;
  return data === true;
}

export async function touchLastActive(): Promise<void> {
  await supabase.rpc('touch_last_active');
}

// Permanently deletes the signed-in user. The SQL function deletes the auth user, which
// cascades to the profile, languages, conversations and messages.
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
