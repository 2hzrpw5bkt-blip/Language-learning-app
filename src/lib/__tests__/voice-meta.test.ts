import { describe, expect, it } from '@jest/globals';
import type { Message } from '@/lib/chat';
import { formatClip, voiceClipPath, voiceMeta } from '@/lib/voice-meta';

const base: Message = {
  id: 1,
  conversation_id: 'c',
  sender_id: 'a',
  body: 'Voice message',
  kind: 'voice',
  meta: { path: 'a/c/x.m4a', duration_ms: 4200 },
  corrected_from_message_id: null,
  created_at: '2026-09-19T10:00:00.000Z',
};

describe('voiceMeta', () => {
  it('reads a valid clip', () => {
    expect(voiceMeta(base)).toEqual({ path: 'a/c/x.m4a', duration_ms: 4200 });
  });
  it('rejects other kinds and missing paths', () => {
    expect(voiceMeta({ ...base, kind: 'text' })).toBeNull();
    expect(voiceMeta({ ...base, meta: { duration_ms: 1 } })).toBeNull();
    expect(voiceMeta({ ...base, meta: null })).toBeNull();
  });
  it('tolerates a missing duration', () => {
    expect(voiceMeta({ ...base, meta: { path: 'p' } })?.duration_ms).toBe(0);
  });
});

describe('formatClip and voiceClipPath', () => {
  it('formats as m:ss', () => {
    expect(formatClip(0)).toBe('0:00');
    expect(formatClip(4200)).toBe('0:04');
    expect(formatClip(60_000)).toBe('1:00');
    expect(formatClip(-5)).toBe('0:00');
  });
  it('builds the storage path', () => {
    expect(voiceClipPath('me', 'conv', 'u1')).toBe('me/conv/u1.m4a');
  });
});
