-- Phase 1: languages, profiles, user_languages, avatars bucket, account deletion.
-- How to apply: Supabase dashboard > SQL Editor > New query > paste this whole file > Run.
-- Safe to run more than once.

-- The Phase 0 test table is no longer needed.
drop table if exists public.hello;

-- ---------------------------------------------------------------------------
-- languages: the list users pick from. Adding a language = adding one row.
-- ---------------------------------------------------------------------------
create table if not exists public.languages (
  code text primary key,
  name text not null
);

insert into public.languages (code, name) values
  ('en', 'English'),
  ('fi', 'Finnish'),
  ('es', 'Spanish'),
  ('fr', 'French'),
  ('de', 'German'),
  ('it', 'Italian'),
  ('pt', 'Portuguese'),
  ('sv', 'Swedish')
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created automatically at signup.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  bio text not null default '',
  avatar_url text,
  timezone text not null default 'UTC',
  onboarded_at timestamptz,
  last_active_at timestamptz not null default now(),
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 40),
  constraint profiles_bio_length check (char_length(bio) <= 300)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- user_languages: what each user speaks (native / fluent) and learns (with level).
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.language_kind as enum ('native', 'fluent', 'learning');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cefr_level as enum ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
exception when duplicate_object then null; end $$;

create table if not exists public.user_languages (
  user_id uuid not null references public.profiles (id) on delete cascade,
  language_code text not null references public.languages (code),
  kind public.language_kind not null,
  level public.cefr_level,
  primary key (user_id, language_code),
  constraint user_languages_level_rule check (
    (kind = 'learning' and level is not null) or (kind <> 'learning' and level is null)
  )
);

create index if not exists user_languages_language_kind_idx
  on public.user_languages (language_code, kind);

-- ---------------------------------------------------------------------------
-- Row Level Security. Default deny; only the policies below open access.
-- ---------------------------------------------------------------------------
alter table public.languages enable row level security;
alter table public.profiles enable row level security;
alter table public.user_languages enable row level security;

drop policy if exists "languages readable by everyone" on public.languages;
create policy "languages readable by everyone"
  on public.languages for select using (true);

drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated using (true);

drop policy if exists "users insert own profile" on public.profiles;
create policy "users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

drop policy if exists "users update own profile" on public.profiles;
create policy "users update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Users may never touch is_banned or created_at, even on their own row.
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, bio, avatar_url, timezone, onboarded_at, last_active_at)
  on public.profiles to authenticated;
grant update (display_name, bio, avatar_url, timezone, onboarded_at, last_active_at)
  on public.profiles to authenticated;

drop policy if exists "user_languages readable by signed-in users" on public.user_languages;
create policy "user_languages readable by signed-in users"
  on public.user_languages for select to authenticated using (true);

drop policy if exists "users manage own user_languages" on public.user_languages;
create policy "users manage own user_languages"
  on public.user_languages for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- avatars: public bucket, each user may only write inside a folder named by their id.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "avatars publicly readable" on storage.objects;
create policy "avatars publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- delete_own_account(): the signed-in user deletes themselves. Deleting the auth
-- user cascades to profiles and user_languages; avatar files are removed first.
-- ---------------------------------------------------------------------------
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
  delete from storage.objects
    where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
