// Finding partners and viewing other people's profiles.
import { supabase } from '@/lib/supabase';
import type { Profile, SkillLevel, UserLanguage } from '@/lib/types';

export type PartnerLanguage = Pick<UserLanguage, 'language_code' | 'kind' | 'level'>;

export type Partner = Pick<
  Profile,
  'id' | 'display_name' | 'bio' | 'avatar_color' | 'timezone' | 'last_active_at'
> & { languages: PartnerLanguage[] };

export type PartnerFilters = {
  // Only people who help with this language (code), or null for any.
  language: string | null;
  // Only people at this level in the language I help with, or null for any.
  level: SkillLevel | null;
};

export async function findPartners(filters: PartnerFilters): Promise<Partner[]> {
  const { data, error } = await supabase.rpc('find_partners', {
    p_language: filters.language,
    p_level: filters.level,
  });
  if (error) throw error;
  return data as Partner[];
}

export async function fetchPartner(id: string): Promise<Partner | null> {
  const [profileResult, languagesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, bio, avatar_color, timezone, last_active_at')
      .eq('id', id)
      .maybeSingle(),
    supabase.from('user_languages').select('language_code, kind, level').eq('user_id', id),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (languagesResult.error) throw languagesResult.error;
  if (!profileResult.data) return null;
  return { ...(profileResult.data as Omit<Partner, 'languages'>), languages: languagesResult.data as PartnerLanguage[] };
}
