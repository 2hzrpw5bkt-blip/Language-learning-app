-- Phase 5: voice messages. Safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. A new message kind. The body is a fixed placeholder; the clip lives in Storage and
--    meta holds { path, duration_ms }.
-- ---------------------------------------------------------------------------
alter table public.messages drop constraint if exists messages_kind;
alter table public.messages add constraint messages_kind
  check (kind in ('text', 'topic', 'timer', 'correction', 'voice'));

-- ---------------------------------------------------------------------------
-- 2. Private bucket. Paths are  <sender id>/<conversation id>/<file>.m4a
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('voice', 'voice', false, 5242880, array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

-- The conversation a clip belongs to, read from its path; null if the path is not ours.
create or replace function public.voice_conversation(object_name text)
returns uuid language sql immutable set search_path = public as $$
  select case
    when (storage.foldername(object_name))[2] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then ((storage.foldername(object_name))[2])::uuid
    else null
  end;
$$;

drop policy if exists "voice clips readable by participants" on storage.objects;
create policy "voice clips readable by participants"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'voice'
    and not public.is_caller_banned()
    and public.is_participant(public.voice_conversation(name))
    and not public.is_blocked_with(public.other_participant(public.voice_conversation(name)))
  );

drop policy if exists "voice clips uploaded by the sender" on storage.objects;
create policy "voice clips uploaded by the sender"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'voice'
    and not public.is_caller_banned()
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_participant(public.voice_conversation(name))
    and not public.is_blocked_with(public.other_participant(public.voice_conversation(name)))
  );

drop policy if exists "voice clips deleted by the sender" on storage.objects;
create policy "voice clips deleted by the sender"
  on storage.objects for delete to authenticated
  using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 3. Chat-list preview, and reports keep the clip's path so a moderator can listen.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = new.created_at,
        last_message_preview = case new.kind
          when 'correction' then 'Correction: ' || left(new.body, 68)
          when 'topic' then 'Topic: ' || left(new.body, 73)
          when 'voice' then 'Voice message'
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

alter table public.reports add column if not exists message_meta jsonb;

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
  quoted_meta jsonb;
  report_id bigint;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_reported = me then raise exception 'You cannot report yourself.'; end if;
  if p_reason is null or p_reason not in ('harassment', 'spam', 'inappropriate', 'scam', 'other') then
    raise exception 'Unknown report reason.';
  end if;
  if (select count(*) from public.reports
        where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'RATE_LIMITED' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.profiles where id = p_reported) then
    raise exception 'This person is not available.';
  end if;
  if p_message_id is not null then
    select m.body, m.meta into quoted, quoted_meta
      from public.messages m
      where m.id = p_message_id
        and m.sender_id = p_reported
        and exists (
          select 1 from public.conversation_participants cp
          where cp.conversation_id = m.conversation_id and cp.user_id = me
        );
    if quoted is null then raise exception 'That message cannot be reported.'; end if;
  end if;
  begin
    insert into public.reports (reporter_id, reported_user_id, reported_name, reported_email, message_id, message_body, message_meta, reason, details)
    select me, p.id, left(p.display_name, 200), lower(u.email), p_message_id, left(quoted, 2000), quoted_meta, p_reason,
           left(nullif(trim(coalesce(p_details, '')), ''), 1000)
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = p_reported
    returning id into report_id;
  exception when others then
    raise exception 'Could not file this report.';
  end;
  return report_id;
end;
$$;
revoke execute on function public.report_user(uuid, text, text, bigint) from public, anon;
grant execute on function public.report_user(uuid, text, text, bigint) to authenticated;
