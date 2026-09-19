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
  Pick<Profile, 'display_name' | 'bio' | 'avatar_color' | 'timezone' | 'onboarded_at' | 'last_active_at'>
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

// Replaces the user's whole language list with the given choices.
export async function saveUserLanguages(
  userId: string,
  teach: TeachChoices,
  learn: LearnChoices,
): Promise<void> {
  const rows = [
    ...Object.entries(teach).map(([code, { native }]) => ({
      user_id: userId,
      language_code: code,
      kind: native ? 'native' : 'fluent',
      level: null,
    })),
    ...Object.entries(learn).map(([code, level]) => ({
      user_id: userId,
      language_code: code,
      kind: 'learning',
      level,
    })),
  ];
  const removed = await supabase.from('user_languages').delete().eq('user_id', userId);
  if (removed.error) throw removed.error;
  if (rows.length === 0) return;
  const inserted = await supabase.from('user_languages').insert(rows);
  if (inserted.error) throw inserted.error;
}

export async function touchLastActive(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ last_active_at: new Date().toISOString() })
    .eq('id', userId);
}

// Permanently deletes the signed-in user. The SQL function deletes the auth user, which
// cascades to the profile, languages, conversations and messages.
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
