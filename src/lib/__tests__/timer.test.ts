import { describe, expect, it } from '@jest/globals';
import type { Message } from '@/lib/chat';
import { formatSeconds, summarizeTimer, TIMER_MINUTES, timerPhase } from '@/lib/timer';

const base = '2026-09-19T10:00:00.000Z';

function timerMessage(id: number, sender: string, meta: Record<string, unknown>): Message {
  return {
    id,
    conversation_id: 'c',
    sender_id: sender,
    body: 'timer',
    kind: 'timer',
    meta,
    corrected_from_message_id: null,
    created_at: base,
  };
}

const request = (id: number, sender = 'a') => timerMessage(id, sender, { action: 'request', first: 'fi', second: 'en' });
const accept = (id: number, sender = 'b') => timerMessage(id, sender, { action: 'accept', first: 'fi', second: 'en', started_at: base });

describe('summarizeTimer (messages newest first)', () => {
  it('has nothing without timer messages', () => {
    expect(summarizeTimer([])).toEqual({ active: null, pending: null });
  });

  it('shows a pending request when the newest timer message is a request', () => {
    const result = summarizeTimer([request(2)]);
    expect(result.active).toBeNull();
    expect(result.pending?.action).toBe('request');
    expect(result.pending?.sender_id).toBe('a');
  });

  it('is active after an accept and inactive after a stop', () => {
    expect(summarizeTimer([accept(3), request(2)]).active).toEqual({ first: 'fi', second: 'en', started_at: base });
    const stopped = timerMessage(5, 'a', { action: 'stop' });
    expect(summarizeTimer([stopped, accept(3), request(2)]).active).toBeNull();
  });

  it('keeps running while a stop request is pending, and after a stop is declined', () => {
    const stopRequest = timerMessage(6, 'a', { action: 'stop_request' });
    const result = summarizeTimer([stopRequest, accept(3), request(2)]);
    expect(result.active).not.toBeNull();
    expect(result.pending?.action).toBe('stop_request');
    const declined = timerMessage(7, 'b', { action: 'stop_declined' });
    expect(summarizeTimer([declined, stopRequest, accept(3)]).active).not.toBeNull();
    expect(summarizeTimer([declined, stopRequest, accept(3)]).pending).toBeNull();
  });

  it('is not active when the request was declined', () => {
    const declined = timerMessage(3, 'b', { action: 'decline' });
    expect(summarizeTimer([declined, request(2)])).toEqual({ active: null, pending: null });
  });
});

describe('timerPhase', () => {
  const active = { first: 'fi', second: 'en', started_at: base };
  const start = new Date(base).getTime();
  const phaseMs = TIMER_MINUTES * 60 * 1000;

  it('starts with the first language and counts down', () => {
    const phase = timerPhase(active, start + 65_000);
    expect(phase.language).toBe('fi');
    expect(phase.next).toBe('en');
    expect(phase.secondsLeft).toBe(TIMER_MINUTES * 60 - 65);
    expect(phase.index).toBe(0);
  });

  it('alternates languages every period, forever', () => {
    expect(timerPhase(active, start + phaseMs + 1000).language).toBe('en');
    expect(timerPhase(active, start + 2 * phaseMs + 1000).language).toBe('fi');
    expect(timerPhase(active, start + 7 * phaseMs + 1000).language).toBe('en');
  });
});

describe('formatSeconds', () => {
  it('formats m:ss', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(59)).toBe('0:59');
    expect(formatSeconds(300)).toBe('5:00');
    expect(formatSeconds(605)).toBe('10:05');
  });
});
