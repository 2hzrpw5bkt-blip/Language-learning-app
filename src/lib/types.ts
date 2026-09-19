// Shapes of the database rows the app works with. Column names match Postgres (snake_case).

export type LanguageKind = 'native' | 'fluent' | 'learning';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export const CEFR_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export type Language = {
  code: string;
  name: string;
};

export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  timezone: string;
  onboarded_at: string | null;
  last_active_at: string;
  is_banned: boolean;
  created_at: string;
};

export type UserLanguage = {
  user_id: string;
  language_code: string;
  kind: LanguageKind;
  level: CefrLevel | null;
};

// What the user picked in the language pickers, before it is saved.
export type SpeakChoices = Record<string, { native: boolean }>;
export type LearnChoices = Record<string, CefrLevel | null>;

export function choicesFromRows(rows: UserLanguage[]): { speak: SpeakChoices; learn: LearnChoices } {
  const speak: SpeakChoices = {};
  const learn: LearnChoices = {};
  for (const row of rows) {
    if (row.kind === 'learning') {
      learn[row.language_code] = row.level;
    } else {
      speak[row.language_code] = { native: row.kind === 'native' };
    }
  }
  return { speak, learn };
}
