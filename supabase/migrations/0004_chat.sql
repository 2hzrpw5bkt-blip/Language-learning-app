-- Phase 3: text chat + safety (conversations, messages, blocks, reports, rate limit, realtime).
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run. Safe to run twice.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  last_message_preview text,
  constraint conversations_ordered check (user_a < user_b),
  constraint conversations_unique_pair unique (user_a, user_b)
);

create table if not exists public.conversation_participants (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  muted boolean not null default false,
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  corrected_from_message_id bigint references public.messages (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 2000)
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id, id);

create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references public.profiles (id) on delete set null,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  message_id bigint references public.messages (id) on delete set null,
  message_body text,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint reports_reason check (reason in ('harassment', 'spam', 'inappropriate', 'scam', 'other')),
  constraint reports_status check (status in ('open', 'reviewed', 'actioned', 'dismissed')),
  constraint reports_details_length check (details is null or char_length(details) <= 1000)
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so policies can check the other side's blocks
-- and participant rows without running into their own Row Level Security)
-- ---------------------------------------------------------------------------
create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.is_participant(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = p_conversation and user_id = auth.uid()
  );
$$;

create or replace function public.other_participant(p_conversation uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select user_id from public.conversation_participants
  where conversation_id = p_conversation and user_id <> auth.uid()
  limit 1;
$$;

revoke execute on function public.is_blocked_between(uuid, uuid) from public, anon;
revoke execute on function public.is_participant(uuid) from public, anon;
revoke execute on function public.other_participant(uuid) from public, anon;
grant execute on function public.is_blocked_between(uuid, uuid) to authenticated;
grant execute on function public.is_participant(uuid) to authenticated;
grant execute on function public.other_participant(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;

-- Conversations: only participants can see them; nobody writes them directly (see start_conversation).
drop policy if exists "participants read conversations" on public.conversations;
create policy "participants read conversations"
  on public.conversations for select to authenticated
  using (public.is_participant(id) and not public.is_blocked_between(user_a, user_b));

drop policy if exists "read participants of my conversations" on public.conversation_participants;
create policy "read participants of my conversations"
  on public.conversation_participants for select to authenticated
  using (public.is_participant(conversation_id));

drop policy if exists "update own participant row" on public.conversation_participants;
create policy "update own participant row"
  on public.conversation_participants for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke insert, update, delete on public.conversation_participants from anon, authenticated;
grant update (last_read_at, muted) on public.conversation_participants to authenticated;

-- Messages: participants read; participants send as themselves, unless blocked or banned.
drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages"
  on public.messages for select to authenticated
  using (
    public.is_participant(conversation_id)
    and not public.is_blocked_between(auth.uid(), public.other_participant(conversation_id))
  );

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_participant(conversation_id)
    and not public.is_blocked_between(auth.uid(), public.other_participant(conversation_id))
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
  );

revoke update, delete on public.messages from anon, authenticated;

-- Blocks: you manage your own block list only.
drop policy if exists "manage own blocks" on public.blocks;
create policy "manage own blocks"
  on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

-- Reports: users can file them; only the dashboard reads them.
drop policy if exists "users file reports" on public.reports;
create policy "users file reports"
  on public.reports for insert to authenticated
  with check (reporter_id = auth.uid() and reported_user_id <> auth.uid());

revoke select, update, delete on public.reports from anon, authenticated;

-- ---------------------------------------------------------------------------
-- New message: update the conversation summary and the sender's read marker.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at, last_message_preview = left(new.body, 80)
    where id = new.conversation_id;
  update public.conversation_participants
    set last_read_at = new.created_at
    where conversation_id = new.conversation_id and user_id = new.sender_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute function public.handle_new_message();

-- ---------------------------------------------------------------------------
-- start_conversation: the only way to create a conversation. Enforces blocks,
-- bans and a limit of 10 new conversations per person per day.
-- ---------------------------------------------------------------------------
create or replace function public.start_conversation(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  conv uuid;
  started_today int;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_other = me then raise exception 'You cannot chat with yourself.'; end if;
  if exists (select 1 from public.profiles where id = me and is_banned) then
    raise exception 'This account is suspended.';
  end if;
  if not exists (select 1 from public.profiles where id = p_other and onboarded_at is not null and not is_banned)
     or public.is_blocked_between(me, p_other) then
    raise exception 'This person is not available.';
  end if;

  a := least(me, p_other);
  b := greatest(me, p_other);
  select id into conv from public.conversations where user_a = a and user_b = b;
  if conv is not null then return conv; end if;

  select count(*) into started_today from public.conversations
    where created_by = me and created_at > now() - interval '1 day';
  if started_today >= 10 then
    raise exception 'You have reached the limit of 10 new conversations per day. Try again tomorrow.';
  end if;

  insert into public.conversations (user_a, user_b, created_by) values (a, b, me) returning id into conv;
  insert into public.conversation_participants (conversation_id, user_id) values (conv, me), (conv, p_other);
  return conv;
end;
$$;

revoke execute on function public.start_conversation(uuid) from public, anon;
grant execute on function public.start_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- list_conversations: my conversation list with the other person and unread counts.
-- ---------------------------------------------------------------------------
create or replace function public.list_conversations()
returns table (
  id uuid,
  other_id uuid,
  other_name text,
  other_avatar_url text,
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
    p.avatar_url,
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

-- ---------------------------------------------------------------------------
-- find_partners: also hide people involved in a block either way.
-- ---------------------------------------------------------------------------
create or replace function public.find_partners(
  p_language text default null,
  p_level public.skill_level default null
)
returns table (
  id uuid, display_name text, bio text, avatar_url text, timezone text, last_active_at timestamptz, languages jsonb
)
language sql security invoker stable set search_path = public as $$
  select
    p.id, p.display_name, p.bio, p.avatar_url, p.timezone, p.last_active_at,
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

-- ---------------------------------------------------------------------------
-- Realtime: the app listens for new messages. Row Level Security still applies.
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;
