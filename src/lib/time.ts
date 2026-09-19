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

const pad = (n: number) => String(n).padStart(2, '0');

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "14:05" for a message bubble.
export function messageTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// "14:05" today, "Yesterday", or "19.9." for the chat list.
export function listTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (sameDay(date, now)) return messageTime(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return strings.chats.yesterday;
  return `${date.getDate()}.${date.getMonth() + 1}.`;
}
