import { describe, expect, it } from '@jest/globals';
import type { Message } from '@/lib/chat';
import { mergeMessage } from '@/lib/messages';

function message(id: number, body = `m${id}`): Message {
  return {
    id,
    conversation_id: 'c',
    sender_id: 'a',
    body,
    kind: 'text',
    meta: null,
    corrected_from_message_id: null,
    created_at: '2026-09-19T10:00:00.000Z',
  };
}

const ids = (list: Message[]) => list.map((m) => m.id);

describe('mergeMessage', () => {
  it('puts a newer message at the front of a newest-first list', () => {
    const list = [message(3), message(2)];
    expect(ids(mergeMessage(list, message(4)))).toEqual([4, 3, 2]);
  });

  it('puts an older message at the back', () => {
    const list = [message(3), message(2)];
    expect(ids(mergeMessage(list, message(1)))).toEqual([3, 2, 1]);
  });

  it('inserts a message that arrived out of order into the right place', () => {
    const list = [message(5), message(2)];
    expect(ids(mergeMessage(list, message(3)))).toEqual([5, 3, 2]);
  });

  it('ignores a message already in the list', () => {
    const list = [message(3), message(2)];
    const merged = mergeMessage(list, message(3, 'duplicate'));
    expect(merged).toBe(list);
    expect(ids(merged)).toEqual([3, 2]);
  });

  it('starts an empty list', () => {
    expect(ids(mergeMessage([], message(7)))).toEqual([7]);
  });

  it('merges a whole fetched page without duplicating or reordering', () => {
    const existing = [message(10), message(9)];
    const page = [message(11), message(10), message(8), message(7)];
    expect(ids(page.reduce(mergeMessage, existing))).toEqual([11, 10, 9, 8, 7]);
  });
});
