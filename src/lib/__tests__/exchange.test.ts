import { describe, expect, it } from '@jest/globals';
import { exchangeLanguages } from '@/lib/exchange';

const me = {
  id: 'me',
  name: 'Burri',
  languages: [
    { language_code: 'fi', kind: 'native' as const, level: null },
    { language_code: 'en', kind: 'learning' as const, level: 'intermediate' as const },
    { language_code: 'sv', kind: 'learning' as const, level: 'beginner' as const },
  ],
};
const sam = {
  id: 'sam',
  name: 'Sam',
  languages: [
    { language_code: 'en', kind: 'native' as const, level: null },
    { language_code: 'fi', kind: 'learning' as const, level: 'beginner' as const },
  ],
};

describe('exchangeLanguages', () => {
  it('finds both directions of a match', () => {
    expect(exchangeLanguages(me, sam)).toEqual([
      { code: 'en', learnerId: 'me', learnerName: 'Burri', level: 'intermediate' },
      { code: 'fi', learnerId: 'sam', learnerName: 'Sam', level: 'beginner' },
    ]);
  });

  it('ignores languages the other person does not speak', () => {
    const result = exchangeLanguages(me, sam);
    expect(result.find((item) => item.code === 'sv')).toBeUndefined();
  });

  it('returns nothing when there is no overlap', () => {
    const carla = {
      id: 'carla',
      name: 'Carla',
      languages: [
        { language_code: 'es', kind: 'native' as const, level: null },
        { language_code: 'de', kind: 'learning' as const, level: 'intermediate' as const },
      ],
    };
    expect(exchangeLanguages(me, carla)).toEqual([]);
  });
});
