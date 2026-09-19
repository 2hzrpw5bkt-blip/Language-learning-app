// Uploading, fetching and deleting voice clips in the private `voice` bucket.
import { supabase } from '@/lib/supabase';
import { voiceClipPath, type VoiceMeta } from '@/lib/voice-meta';

const BUCKET = 'voice';

export async function uploadVoiceClip(
  senderId: string,
  conversationId: string,
  localUri: string,
  durationMs: number,
): Promise<VoiceMeta> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = voiceClipPath(senderId, conversationId, unique);
  const body = await fetch(localUri).then((response) => response.arrayBuffer());
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'audio/mp4' });
  if (error) throw error;
  return { path, duration_ms: Math.round(durationMs) };
}

// A short-lived URL the player can stream from. Only participants can get one (storage policy).
export async function signedVoiceUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

// Removes every clip this user ever sent (used before deleting the account).
export async function removeVoiceFiles(userId: string): Promise<void> {
  const { data: folders, error } = await supabase.storage.from(BUCKET).list(userId, { limit: 1000 });
  if (error) throw error;
  const paths: string[] = [];
  for (const folder of folders ?? []) {
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(`${userId}/${folder.name}`, { limit: 1000 });
    if (listError) throw listError;
    for (const file of files ?? []) paths.push(`${userId}/${folder.name}/${file.name}`);
  }
  for (let start = 0; start < paths.length; start += 100) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove(paths.slice(start, start + 100));
    if (removeError) throw removeError;
  }
}
