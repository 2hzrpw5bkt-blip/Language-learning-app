// Which languages two people practise with each other, and at what level.
import type { PartnerLanguage } from '@/lib/partners';
import type { SkillLevel, UserLanguage } from '@/lib/types';

export type ExchangeLanguage = {
  code: string;
  // Who is practising this language.
  learnerId: string;
  learnerName: string;
  level: SkillLevel;
};

type Person = { id: string; name: string; languages: Pick<UserLanguage, 'language_code' | 'kind' | 'level'>[] | PartnerLanguage[] };

export function exchangeLanguages(me: Person, partner: Person): ExchangeLanguage[] {
  const result: ExchangeLanguage[] = [];
  const speaks = (person: Person, code: string) =>
    person.languages.some((row) => row.language_code === code && row.kind !== 'learning');
  for (const row of me.languages) {
    if (row.kind === 'learning' && row.level && speaks(partner, row.language_code)) {
      result.push({ code: row.language_code, learnerId: me.id, learnerName: me.name, level: row.level });
    }
  }
  for (const row of partner.languages) {
    if (row.kind === 'learning' && row.level && speaks(me, row.language_code)) {
      result.push({ code: row.language_code, learnerId: partner.id, learnerName: partner.name, level: row.level });
    }
  }
  return result;
}
