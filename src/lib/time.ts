import { strings } from '@/constants/strings';

// "Active today", "Active 3 days ago", ... for a timestamp.
export function activeLabel(iso: string, now: number = Date.now()): string {
  const hours = (now - new Date(iso).getTime()) / 3_600_000;
  if (hours < 1) return strings.partners.activeNow;
  if (hours < 24) return strings.partners.activeToday;
  const days = Math.floor(hours / 24);
  if (days < 7) return strings.partners.activeDaysAgo(days);
  if (days < 30) return strings.partners.activeWeeksAgo(Math.floor(days / 7));
  return strings.partners.activeLongAgo;
}
