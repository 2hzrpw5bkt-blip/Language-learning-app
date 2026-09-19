// The language-switch timer is agreed between the two people through messages of kind 'timer':
//   request -> accept | decline        (start it)
//   stop_request -> stop | stop_declined (end it)
// Once accepted it switches language every TIMER_MINUTES until both agree to stop.
import type { Message } from '@/lib/chat';

export const TIMER_MINUTES = 5;

export type TimerAction = 'request' | 'accept' | 'decline' | 'stop_request' | 'stop' | 'stop_declined';

export type TimerMeta = {
  action: TimerAction;
  first?: string;
  second?: string;
  started_at?: string;
  requester_name?: string;
};

export type ActiveTimer = { first: string; second: string; started_at: string };

export type PendingRequest = {
  action: 'request' | 'stop_request';
  sender_id: string;
  message: Message;
  meta: TimerMeta;
};

export type TimerSummary = { active: ActiveTimer | null; pending: PendingRequest | null };

export function timerMeta(message: Message): TimerMeta | null {
  if (message.kind !== 'timer' || !message.meta) return null;
  const meta = message.meta as Partial<TimerMeta>;
  return typeof meta.action === 'string' ? (meta as TimerMeta) : null;
}

// messages are newest first.
export function summarizeTimer(messages: Message[]): TimerSummary {
  let pending: PendingRequest | null = null;
  let first = true;
  for (const message of messages) {
    const meta = timerMeta(message);
    if (!meta) continue;
    if (first) {
      first = false;
      if (meta.action === 'request' || meta.action === 'stop_request') {
        pending = { action: meta.action, sender_id: message.sender_id, message, meta };
        continue;
      }
    }
    if (meta.action === 'stop') return { active: null, pending };
    if (meta.action === 'accept' && meta.first && meta.second && meta.started_at) {
      return { active: { first: meta.first, second: meta.second, started_at: meta.started_at }, pending };
    }
  }
  return { active: null, pending };
}

export type TimerPhase = { language: string; next: string; secondsLeft: number; index: number };

export function timerPhase(active: ActiveTimer, now: number = Date.now()): TimerPhase {
  const elapsed = Math.max(0, Math.floor((now - new Date(active.started_at).getTime()) / 1000));
  const phaseSeconds = TIMER_MINUTES * 60;
  const index = Math.floor(elapsed / phaseSeconds);
  const even = index % 2 === 0;
  return {
    language: even ? active.first : active.second,
    next: even ? active.second : active.first,
    secondsLeft: phaseSeconds - (elapsed % phaseSeconds),
    index,
  };
}

export function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
