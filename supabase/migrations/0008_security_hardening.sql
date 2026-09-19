-- Security and moderation hardening after the code review. Safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. Ban evasion: a banned person could delete their account and sign up again.
--    Banned emails are remembered; new accounts with such an email start banned;
--    banned accounts cannot delete themselves.
-- ---------------------------------------------------------------------------
create table if not exists public.banned_emails (
  email text primary key,
  banned_at timestamptz not null default now()
);
alter table public.banned_emails enable row level security;

create or replace function public.record_ban()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_banned and not old.is_banned then
    insert into public.banned_emails (email)
      select lower(u.email) from auth.users u where u.id = new.id and u.email is not null
      on conflict (email) do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists on_profile_banned on public.profiles;
create trigger on_profile_banned after update of is_banned on public.profiles
  for each row execute function public.record_ban();

-- Consent is copied once from sign-up metadata into columns the user cannot edit.
alter table public.profiles add column if not exists terms_accepted_at timestamptz;
alter table public.profiles add column if not exists terms_version text;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, is_banned, terms_accepted_at, terms_version)
  values (
    new.id,
    exists (select 1 from public.banned_emails b where b.email = lower(new.email)),
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'terms_version', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.is_caller_banned()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_banned);
$$;
revoke execute on function public.is_caller_banned() from public, anon;
grant execute on function public.is_caller_banned() to authenticated;

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if public.is_caller_banned() then raise exception 'ACCOUNT_SUSPENDED' using errcode = 'check_violation'; end if;
  delete from auth.users where id = uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Reports survive account deletion, and evidence is copied by the server,
--    never supplied by the client.
-- ---------------------------------------------------------------------------
alter table public.reports alter column reported_user_id drop not null;
alter table public.reports drop constraint if exists reports_reported_user_id_fkey;
alter table public.reports add constraint reports_reported_user_id_fkey
  foreign key (reported_user_id) references public.profiles (id) on delete set null;
alter table public.reports add column if not exists reported_name text;
alter table public.reports add column if not exists reported_email text;
alter table public.reports drop constraint if exists reports_message_body_length;
alter table public.reports add constraint reports_message_body_length
  check (message_body is null or char_length(message_body) <= 2000);

drop policy if exists "users file reports" on public.reports;
revoke insert, select, update, delete on public.reports from anon, authenticated;

create or replace function public.report_user(
  p_reported uuid,
  p_reason text,
  p_details text default null,
  p_message_id bigint default null
)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  quoted text;
  report_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_reported = me then raise exception 'You cannot report yourself.'; end if;
  if not exists (select 1 from public.profiles where id = p_reported) then
    raise exception 'This person is not available.';
  end if;
  if p_message_id is not null then
    select m.body into quoted
      from public.messages m
      where m.id = p_message_id
        and m.sender_id = p_reported
        and exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = m.conversation_id and cp.user_id = me
        );
    if quoted is null then raise exception 'That message cannot be reported.'; end if;
  end if;
  insert into public.reports (reporter_id, reported_user_id, reported_name, reported_email, message_id, message_body, reason, details)
  select me, p.id, p.display_name, lower(u.email), p_message_id, quoted, p_reason, nullif(trim(coalesce(p_details, '')), '')
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.id = p_reported
  returning id into report_id;
  return report_id;
end;
$$;
revoke execute on function public.report_user(uuid, text, text, bigint) from public, anon;
grant execute on function public.report_user(uuid, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Block helper that only ever answers about the caller; banned callers see nothing.
-- ---------------------------------------------------------------------------
create or replace function public.is_blocked_with(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_blocked_between(auth.uid(), other);
$$;
revoke execute on function public.is_blocked_with(uuid) from public, anon;
grant execute on function public.is_blocked_with(uuid) to authenticated;
revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon, authenticated;

create or replace function public.other_participant(p_conversation uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.conversation_participants
  where conversation_id = p_conversation
    and user_id <> auth.uid()
    and public.is_participant(p_conversation)
  limit 1;
$$;

drop policy if exists "participants read conversations" on public.conversations;
create policy "participants read conversations"
  on public.conversations for select to authenticated
  using (
    public.is_participant(id)
    and not public.is_caller_banned()
    and not public.is_blocked_with(case when user_a = auth.uid() then user_b else user_a end)
  );

drop policy if exists "read participants of my conversations" on public.conversation_participants;
create policy "read participants of my conversations"
  on public.conversation_participants for select to authenticated
  using (public.is_participant(conversation_id) and not public.is_caller_banned());

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages"
  on public.messages for select to authenticated
  using (
    public.is_participant(conversation_id)
    and not public.is_caller_banned()
    and not public.is_blocked_with(public.other_participant(conversation_id))
  );

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_participant(conversation_id)
    and not public.is_caller_banned()
    and not public.is_blocked_with(public.other_participant(conversation_id))
    and (corrected_from_message_id is null or public.can_correct(corrected_from_message_id, conversation_id))
  );

-- Profiles: your own row, plus onboarded, unbanned people who are not blocked either way.
drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or (onboarded_at is not null and not is_banned and not public.is_blocked_with(id))
  );

-- ---------------------------------------------------------------------------
-- 4. Clients may only write the columns they should. Timestamps and status are server-set.
-- ---------------------------------------------------------------------------
revoke insert, update on public.messages from anon, authenticated;
grant insert (conversation_id, sender_id, body, kind, meta, corrected_from_message_id) on public.messages to authenticated;

revoke insert, update on public.blocks from anon, authenticated;
grant insert (blocker_id, blocked_id) on public.blocks to authenticated;

alter table public.profiles drop column if exists avatar_url;
revoke insert, update on public.profiles from anon, authenticated;
grant insert (id, display_name, bio, avatar_color, timezone, onboarded_at) on public.profiles to authenticated;
grant update (display_name, bio, avatar_color, timezone, onboarded_at) on public.profiles to authenticated;

create or replace function public.touch_last_active()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_active_at = now() where id = auth.uid();
$$;
revoke execute on function public.touch_last_active() from public, anon;
grant execute on function public.touch_last_active() to authenticated;

-- Photos are gone: nobody may write to the avatars bucket any more.
drop policy if exists "users upload own avatar" on storage.objects;
drop policy if exists "users update own avatar" on storage.objects;
drop policy if exists "users delete own avatar" on storage.objects;
drop policy if exists "avatars publicly readable" on storage.objects;

-- ---------------------------------------------------------------------------
-- 5. Languages are replaced in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.set_user_languages(p_rows jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  delete from public.user_languages where user_id = auth.uid();
  insert into public.user_languages (user_id, language_code, kind, level)
  select auth.uid(), r.language_code, r.kind::public.language_kind, nullif(r.level, '')::public.skill_level
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(language_code text, kind text, level text);
end;
$$;
revoke execute on function public.set_user_languages(jsonb) from public, anon;
grant execute on function public.set_user_languages(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Word filter: every message kind, safe word list, fewer false positives.
-- ---------------------------------------------------------------------------
delete from public.banned_words where word in ('hora', 'retard', 'kike', 'troia', 'porra', 'dick', 'cock', 'puto');
alter table public.banned_words drop constraint if exists banned_words_format;
alter table public.banned_words add constraint banned_words_format
  check (word = lower(word) and word ~ '^[[:alpha:]]([[:alpha:]''-]*[[:alpha:]])?$');

create or replace function public.check_message_words()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.contains_banned_words(new.body) then
    raise exception 'BANNED_WORDS' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Abuse limits: message size, 40 messages per minute, and indexes.
-- ---------------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_meta_size;
alter table public.messages add constraint messages_meta_size check (meta is null or pg_column_size(meta) <= 4096);

create or replace function public.check_message_rate()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.messages
        where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 40 then
    raise exception 'RATE_LIMITED' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
drop trigger if exists check_message_rate on public.messages;
create trigger check_message_rate before insert on public.messages
  for each row execute function public.check_message_rate();

create index if not exists conversation_participants_user_idx on public.conversation_participants (user_id);
create index if not exists messages_sender_created_idx on public.messages (sender_id, created_at);

-- Sending a message counts as being active.
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message_preview = case new.kind
          when 'correction' then 'Correction: ' || left(new.body, 68)
          when 'topic' then 'Topic: ' || left(new.body, 73)
          else left(new.body, 80)
        end
    where id = new.conversation_id;
  update public.conversation_participants
    set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  update public.profiles set last_active_at = new.created_at where id = new.sender_id;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. RPCs: hide blocked people via the caller-only helper; banned callers get nothing.
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
    and not public.is_caller_banned()
    and p.onboarded_at is not null
    and not p.is_banned
    and not public.is_blocked_with(p.id)
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
  where not public.is_caller_banned()
    and not public.is_blocked_with(other.user_id)
  order by coalesce(c.last_message_at, c.created_at) desc;
$$;
revoke execute on function public.list_conversations() from public, anon;
grant execute on function public.list_conversations() to authenticated;
