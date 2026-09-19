-- Phase 2: partner matching.
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run. Safe to run twice.
--
-- find_partners returns people who
--   1. can help with (native/fluent) a language the caller is practising, and
--   2. are practising a language the caller can help with,
-- newest activity first. Optional filters: p_language = the language they help with,
-- p_level = their level in the language the caller helps with.
-- Runs with the caller's own permissions, so Row Level Security still applies.

create or replace function public.find_partners(
  p_language text default null,
  p_level public.skill_level default null
)
returns table (
  id uuid,
  display_name text,
  bio text,
  avatar_url text,
  timezone text,
  last_active_at timestamptz,
  languages jsonb
)
language sql
security invoker
stable
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    p.bio,
    p.avatar_url,
    p.timezone,
    p.last_active_at,
    (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('language_code', ul.language_code, 'kind', ul.kind, 'level', ul.level)
          order by ul.kind, ul.language_code
        ),
        '[]'::jsonb
      )
      from public.user_languages ul
      where ul.user_id = p.id
    ) as languages
  from public.profiles p
  where p.id <> auth.uid()
    and p.onboarded_at is not null
    and not p.is_banned
    -- they help with a language I am practising
    and exists (
      select 1
      from public.user_languages theirs
      where theirs.user_id = p.id
        and theirs.kind <> 'learning'
        and (p_language is null or theirs.language_code = p_language)
        and theirs.language_code in (
          select mine.language_code from public.user_languages mine
          where mine.user_id = auth.uid() and mine.kind = 'learning'
        )
    )
    -- they practise a language I can help with
    and exists (
      select 1
      from public.user_languages theirs
      where theirs.user_id = p.id
        and theirs.kind = 'learning'
        and (p_level is null or theirs.level = p_level)
        and theirs.language_code in (
          select mine.language_code from public.user_languages mine
          where mine.user_id = auth.uid() and mine.kind <> 'learning'
        )
    )
  order by p.last_active_at desc
  limit 50;
$$;

revoke execute on function public.find_partners(text, public.skill_level) from public, anon;
grant execute on function public.find_partners(text, public.skill_level) to authenticated;

-- Speeds up "who practises X" lookups.
create index if not exists user_languages_user_kind_idx on public.user_languages (user_id, kind);
create index if not exists profiles_last_active_idx on public.profiles (last_active_at desc);
