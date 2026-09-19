// Pure helpers for voice messages, kept free of native modules so they can be unit tested.
import type { Message } from '@/lib/chat';

export const VOICE_MAX_MS = 60_000;

export type VoiceMeta = { path: string; duration_ms: number };

export function voiceMeta(message: Message): VoiceMeta | null {
  if (message.kind !== 'voice' || !message.meta) return null;
  const meta = message.meta as Partial<VoiceMeta>;
  if (typeof meta.path !== 'string' || meta.path.length === 0) return null;
  const duration = typeof meta.duration_ms === 'number' && meta.duration_ms >= 0 ? meta.duration_ms : 0;
  return { path: meta.path, duration_ms: duration };
}

// "0:07" style clock for a clip length or position.
export function formatClip(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

// Storage path for a new clip: <sender>/<conversation>/<unique>.m4a
export function voiceClipPath(senderId: string, conversationId: string, unique: string): string {
  return `${senderId}/${conversationId}/${unique}.m4a`;
}
