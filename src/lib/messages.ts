// Pure helpers for the message list. Kept free of the Supabase client so it stays testable.
import type { Message } from '@/lib/chat';

// Adds a message to a newest-first list (what the inverted chat list expects), ignoring one that
// is already there. Realtime events, the initial fetch, a refetch after reconnecting and older
// pages all flow through here, so duplicates and out-of-order arrivals are handled in one place.
export function mergeMessage(list: Message[], message: Message): Message[] {
  if (list.some((item) => item.id === message.id)) return list;
  const index = list.findIndex((item) => item.id < message.id);
  if (index === -1) return [...list, message];
  return [...list.slice(0, index), message, ...list.slice(index)];
}
