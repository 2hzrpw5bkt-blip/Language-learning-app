// The language-switch timer lives in the chat as a message of kind 'timer', so both
// phones count down from the same start time.
import type { Message } from '@/lib/chat';

export type TimerMeta = {
  first: string;
  second: string;
  minutes: number;
  started_at: string;
  stopped?: boolean;
};

export type TimerState =
  | { phase: 'first' | 'second'; language: string; secondsLeft: number; meta: TimerMeta }
  | { phase: 'done'; meta: TimerMeta };

export function timerMeta(message: Message): TimerMeta | null {
  if (message.kind !== 'timer' || !message.meta) return null;
  const meta = message.meta as Partial<TimerMeta>;
  if (typeof meta.first !== 'string' || typeof meta.second !== 'string' || typeof meta.minutes !== 'number' || typeof meta.started_at !== 'string') {
    return null;
  }
  return meta as TimerMeta;
}

// Newest timer message decides; a stopped or finished timer shows nothing.
export function latestTimer(messages: Message[]): TimerMeta | null {
  for (const message of messages) {
    const meta = timerMeta(message);
    if (meta) return meta.stopped ? null : meta;
  }
  return null;
}

export function timerState(meta: TimerMeta, now: number = Date.now()): TimerState {
  const elapsed = Math.floor((now - new Date(meta.started_at).getTime()) / 1000);
  const phaseSeconds = meta.minutes * 60;
  if (elapsed < phaseSeconds) {
    return { phase: 'first', language: meta.first, secondsLeft: phaseSeconds - elapsed, meta };
  }
  if (elapsed < phaseSeconds * 2) {
    return { phase: 'second', language: meta.second, secondsLeft: phaseSeconds * 2 - elapsed, meta };
  }
  return { phase: 'done', meta };
}

export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
