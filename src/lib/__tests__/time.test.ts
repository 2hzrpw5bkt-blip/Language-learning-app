import { describe, expect, it } from '@jest/globals';
import { activeLabel, listTime, messageTime } from '@/lib/time';

const now = new Date('2026-09-19T12:00:00');

describe('activeLabel', () => {
  const at = (hoursAgo: number) => new Date(now.getTime() - hoursAgo * 3_600_000).toISOString();
  it('buckets by recency', () => {
    expect(activeLabel(at(0.5), now.getTime())).toBe('Active just now');
    expect(activeLabel(at(5), now.getTime())).toBe('Active today');
    expect(activeLabel(at(30), now.getTime())).toBe('Active yesterday');
    expect(activeLabel(at(24 * 3), now.getTime())).toBe('Active 3 days ago');
    expect(activeLabel(at(24 * 8), now.getTime())).toBe('Active last week');
    expect(activeLabel(at(24 * 20), now.getTime())).toBe('Active 2 weeks ago');
    expect(activeLabel(at(24 * 60), now.getTime())).toBe('Active a while ago');
  });
});

describe('listTime and messageTime', () => {
  it('shows the clock time for today, Yesterday, or a short date', () => {
    expect(listTime(new Date('2026-09-19T09:05:00').toISOString(), now)).toBe('09:05');
    expect(listTime(new Date('2026-09-18T23:30:00').toISOString(), now)).toBe('Yesterday');
    expect(listTime(new Date('2026-09-01T10:00:00').toISOString(), now)).toBe('1.9.');
    expect(messageTime(new Date('2026-09-19T14:07:00').toISOString())).toBe('14:07');
  });
});
