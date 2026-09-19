// All reads and writes for profiles, languages and avatars. Screens call these, never Supabase directly.
import { supabase } from '@/lib/supabase';
import type { Language, LearnChoices, Profile, SpeakChoices, UserLanguage } from '@/lib/types';

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
  Pick<Profile, 'display_name' | 'bio' | 'avatar_url' | 'timezone' | 'onboarded_at' | 'last_active_at'>
>;

export async function saveProfile(userId: string, patch: ProfilePatch): Promise<void> {
  const { error } = await supabase.from('profiles').upsert({ id: userId, ...patch });
  if (error) throw error;
}

// Replaces the user's whole language list with the given choices.
export async function saveUserLanguages(
  userId: string,
  speak: SpeakChoices,
  learn: LearnChoices,
): Promise<void> {
  const rows = [
    ...Object.entries(speak).map(([code, { native }]) => ({
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

// Uploads a picked image as the user's avatar and returns its public URL.
export async function uploadAvatar(
  userId: string,
  localUri: string,
  mimeType: string | undefined,
): Promise<string> {
  const contentType = mimeType ?? 'image/jpeg';
  const extension = contentType.split('/')[1] === 'png' ? 'png' : 'jpg';
  const path = `${userId}/avatar.${extension}`;
  const body = await fetch(localUri).then((response) => response.arrayBuffer());
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, body, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // The query string makes the app refetch the image after a change.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function removeAvatarFiles(userId: string): Promise<void> {
  const { data, error } = await supabase.storage.from('avatars').list(userId);
  if (error) throw error;
  if (!data || data.length === 0) return;
  const paths = data.map((file) => `${userId}/${file.name}`);
  const removed = await supabase.storage.from('avatars').remove(paths);
  if (removed.error) throw removed.error;
}

// Permanently deletes the signed-in user and everything they own (see the SQL function).
export async function deleteOwnAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
