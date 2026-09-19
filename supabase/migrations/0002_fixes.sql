-- Fixes after the first test round.
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run. Safe to run twice.

-- 1. Account deletion. Supabase no longer allows deleting storage rows from SQL, so the app
--    removes avatar files through the Storage API first and this function only deletes the
--    auth user (which cascades to profiles and user_languages).
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- 2. Three skill levels instead of six CEFR levels.
do $$ begin
  create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');
exception when duplicate_object then null; end $$;

alter table public.user_languages drop constraint if exists user_languages_level_rule;

alter table public.user_languages
  alter column level type public.skill_level
  using (case level::text
           when 'A1' then 'beginner'
           when 'A2' then 'beginner'
           when 'B1' then 'intermediate'
           when 'B2' then 'intermediate'
           when 'C1' then 'advanced'
           when 'C2' then 'advanced'
           else level::text
         end)::public.skill_level;

alter table public.user_languages add constraint user_languages_level_rule check (
  (kind = 'learning' and level is not null) or (kind <> 'learning' and level is null)
);

drop type if exists public.cefr_level;
