// Shapes of the database rows the app works with. Column names match Postgres (snake_case).

export type LanguageKind = 'native' | 'fluent' | 'learning';

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export const SKILL_LEVELS: SkillLevel[] = ['beginner', 'intermediate', 'advanced'];

export type Language = {
  code: string;
  name: string;
};

export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  avatar_color: string;
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
  level: SkillLevel | null;
};

// What the user picked in the language pickers, before it is saved.
export type TeachChoices = Record<string, { native: boolean }>;
export type LearnChoices = Record<string, SkillLevel | null>;

export function choicesFromRows(rows: UserLanguage[]): { teach: TeachChoices; learn: LearnChoices } {
  const teach: TeachChoices = {};
  const learn: LearnChoices = {};
  for (const row of rows) {
    if (row.kind === 'learning') {
      learn[row.language_code] = row.level;
    } else {
      teach[row.language_code] = { native: row.kind === 'native' };
    }
  }
  return { teach, learn };
}
