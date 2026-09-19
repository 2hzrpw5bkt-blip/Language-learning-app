import { describe, expect, it } from '@jest/globals';
import { wordDiff } from '@/lib/diff';

describe('wordDiff', () => {
  it('returns one equal segment for identical text', () => {
    expect(wordDiff('hello world', 'hello world')).toEqual([{ kind: 'equal', text: 'hello world' }]);
  });

  it('marks a changed word as removed then added', () => {
    expect(wordDiff('I goes home', 'I go home')).toEqual([
      { kind: 'equal', text: 'I' },
      { kind: 'removed', text: 'goes' },
      { kind: 'added', text: 'go' },
      { kind: 'equal', text: 'home' },
    ]);
  });

  it('handles insertions and deletions', () => {
    expect(wordDiff('I like', 'I really like')).toEqual([
      { kind: 'equal', text: 'I' },
      { kind: 'added', text: 'really' },
      { kind: 'equal', text: 'like' },
    ]);
    expect(wordDiff('a very big dog', 'a dog')).toEqual([
      { kind: 'equal', text: 'a' },
      { kind: 'removed', text: 'very big' },
      { kind: 'equal', text: 'dog' },
    ]);
  });

  it('ignores extra whitespace', () => {
    expect(wordDiff('  hi   there ', 'hi there')).toEqual([{ kind: 'equal', text: 'hi there' }]);
  });
});
