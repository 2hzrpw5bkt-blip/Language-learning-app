import { describe, expect, it } from '@jest/globals';
import { strings } from '@/constants/strings';
import { errorMessage } from '@/lib/errors';

describe('errorMessage', () => {
  it('uses Error messages and Supabase-style objects', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage({ message: 'permission denied', code: '42501' })).toBe('permission denied');
  });

  it('maps server codes to friendly text', () => {
    expect(errorMessage({ message: 'BANNED_WORDS' })).toBe(strings.errors.bannedWords);
    expect(errorMessage({ message: 'RATE_LIMITED' })).toBe(strings.errors.rateLimited);
  });

  it('falls back to the generic text', () => {
    expect(errorMessage(undefined)).toBe(strings.errors.generic);
    expect(errorMessage({ message: '' })).toBe(strings.errors.generic);
    expect(errorMessage('a string')).toBe(strings.errors.generic);
  });
});
