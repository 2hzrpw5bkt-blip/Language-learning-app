-- Avatar colours instead of photos, and a banned-word filter. Safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. Avatar colour
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists avatar_color text not null default '#208AEF';
alter table public.profiles drop constraint if exists profiles_avatar_color_format;
alter table public.profiles add constraint profiles_avatar_color_format check (avatar_color ~ '^#[0-9A-Fa-f]{6}$');
grant insert (avatar_color), update (avatar_color) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Banned words. Edit this table in the dashboard: one row per word, lower case.
--    Matching is whole-word and case-insensitive.
-- ---------------------------------------------------------------------------
create table if not exists public.banned_words (
  word text primary key,
  language text
);
alter table public.banned_words enable row level security;
-- No policies on purpose: only the checker function below (running as the owner) reads it.

insert into public.banned_words (word, language) values
  ('fuck', 'en'), ('fucking', 'en'), ('motherfucker', 'en'), ('cunt', 'en'), ('nigger', 'en'), ('nigga', 'en'),
  ('faggot', 'en'), ('retard', 'en'), ('whore', 'en'), ('slut', 'en'), ('bitch', 'en'), ('dick', 'en'),
  ('cock', 'en'), ('pussy', 'en'), ('kike', 'en'), ('spic', 'en'), ('chink', 'en'), ('tranny', 'en'),
  ('vittu', 'fi'), ('vitun', 'fi'), ('vitut', 'fi'), ('huora', 'fi'), ('hintti', 'fi'), ('neekeri', 'fi'),
  ('ryssä', 'fi'), ('mutakuono', 'fi'), ('kusipää', 'fi'), ('paskiainen', 'fi'), ('pillu', 'fi'), ('kyrpä', 'fi'),
  ('runkkari', 'fi'),
  ('fitta', 'sv'), ('kuk', 'sv'), ('hora', 'sv'), ('neger', 'sv'), ('blatte', 'sv'), ('bög', 'sv'), ('knulla', 'sv'),
  ('svartskalle', 'sv'),
  ('puta', 'es'), ('puto', 'es'), ('cabrón', 'es'), ('coño', 'es'), ('polla', 'es'), ('maricón', 'es'),
  ('gilipollas', 'es'), ('sudaca', 'es'),
  ('pute', 'fr'), ('salope', 'fr'), ('enculé', 'fr'), ('connard', 'fr'), ('connasse', 'fr'), ('niquer', 'fr'),
  ('bougnoule', 'fr'), ('négro', 'fr'), ('pédé', 'fr'),
  ('fotze', 'de'), ('hurensohn', 'de'), ('schlampe', 'de'), ('wichser', 'de'), ('arschloch', 'de'), ('ficken', 'de'),
  ('kanake', 'de'), ('schwuchtel', 'de'),
  ('cazzo', 'it'), ('stronzo', 'it'), ('puttana', 'it'), ('troia', 'it'), ('vaffanculo', 'it'), ('frocio', 'it'),
  ('minchia', 'it'),
  ('caralho', 'pt'), ('porra', 'pt'), ('viado', 'pt'), ('foda', 'pt'), ('foder', 'pt'), ('buceta', 'pt'), ('crioulo', 'pt')
on conflict (word) do nothing;

create or replace function public.contains_banned_words(txt text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.banned_words
    where lower(coalesce(txt, '')) ~ ('\m' || word || '\M')
  );
$$;
revoke execute on function public.contains_banned_words(text) from public, anon;
grant execute on function public.contains_banned_words(text) to authenticated;

-- Messages: block before they are stored. The app turns 'BANNED_WORDS' into a friendly message.
create or replace function public.check_message_words()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.kind in ('text', 'correction') and public.contains_banned_words(new.body) then
    raise exception 'BANNED_WORDS' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists check_message_words on public.messages;
create trigger check_message_words before insert on public.messages
  for each row execute function public.check_message_words();

-- Profiles: names and bios too.
create or replace function public.check_profile_words()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.contains_banned_words(new.display_name) or public.contains_banned_words(new.bio) then
    raise exception 'BANNED_WORDS' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists check_profile_words on public.profiles;
create trigger check_profile_words before insert or update of display_name, bio on public.profiles
  for each row execute function public.check_profile_words();

-- ---------------------------------------------------------------------------
-- 3. Functions that returned avatar_url now return avatar_color.
-- ---------------------------------------------------------------------------
drop function if exists public.find_partners(text, public.skill_level);
create function public.find_partners(
  p_language text default null,
  p_level public.skill_level default null
)
returns table (
  id uuid, display_name text, bio text, avatar_color text, timezone text, last_active_at timestamptz, languages jsonb
)
language sql security invoker stable set search_path = public as $$
  select
    p.id, p.display_name, p.bio, p.avatar_color, p.timezone, p.last_active_at,
    (
      select coalesce(jsonb_agg(jsonb_build_object('language_code', ul.language_code, 'kind', ul.kind, 'level', ul.level)
                                order by ul.kind, ul.language_code), '[]'::jsonb)
      from public.user_languages ul where ul.user_id = p.id
    ) as languages
  from public.profiles p
  where p.id <> auth.uid()
    and p.onboarded_at is not null
    and not p.is_banned
    and not public.is_blocked_between(auth.uid(), p.id)
    and exists (
      select 1 from public.user_languages theirs
      where theirs.user_id = p.id and theirs.kind <> 'learning'
        and (p_language is null or theirs.language_code = p_language)
        and theirs.language_code in (
          select mine.language_code from public.user_languages mine
          where mine.user_id = auth.uid() and mine.kind = 'learning')
    )
    and exists (
      select 1 from public.user_languages theirs
      where theirs.user_id = p.id and theirs.kind = 'learning'
        and (p_level is null or theirs.level = p_level)
        and theirs.language_code in (
          select mine.language_code from public.user_languages mine
          where mine.user_id = auth.uid() and mine.kind <> 'learning')
    )
  order by p.last_active_at desc
  limit 50;
$$;
revoke execute on function public.find_partners(text, public.skill_level) from public, anon;
grant execute on function public.find_partners(text, public.skill_level) to authenticated;

drop function if exists public.list_conversations();
create function public.list_conversations()
returns table (
  id uuid,
  other_id uuid,
  other_name text,
  other_avatar_color text,
  last_message_at timestamptz,
  last_message_preview text,
  unread_count bigint,
  muted boolean
)
language sql security invoker stable set search_path = public as $$
  select
    c.id,
    other.user_id,
    p.display_name,
    p.avatar_color,
    c.last_message_at,
    c.last_message_preview,
    (select count(*) from public.messages m
       where m.conversation_id = c.id and m.sender_id <> auth.uid() and m.created_at > me.last_read_at),
    me.muted
  from public.conversations c
  join public.conversation_participants me on me.conversation_id = c.id and me.user_id = auth.uid()
  join public.conversation_participants other on other.conversation_id = c.id and other.user_id <> auth.uid()
  join public.profiles p on p.id = other.user_id
  where not public.is_blocked_between(auth.uid(), other.user_id)
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
revoke execute on function public.list_conversations() from public, anon;
grant execute on function public.list_conversations() to authenticated;
