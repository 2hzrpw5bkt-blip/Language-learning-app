-- Fixes from the second code review. Safe to run twice.

-- ---------------------------------------------------------------------------
-- 1. You can still see the people YOU blocked, so the Blocked users screen works
--    and blocks can be undone. Someone who blocked you stays hidden from you.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles readable by signed-in users" on public.profiles;
create policy "profiles readable by signed-in users"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or exists (select 1 from public.blocks b where b.blocker_id = auth.uid() and b.blocked_id = profiles.id)
    or (onboarded_at is not null and not is_banned and not public.is_blocked_with(id))
  );

-- ---------------------------------------------------------------------------
-- 2. report_user: validate inputs BEFORE the insert, so a rejected row can never
--    echo its contents (including the reported person's email) back to the caller.
--    Also limit how many reports one account can file per day.
-- ---------------------------------------------------------------------------
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
  begin
    insert into public.reports (reporter_id, reported_user_id, reported_name, reported_email, message_id, message_body, reason, details)
    select me, p.id, left(p.display_name, 200), lower(u.email), p_message_id, left(quoted, 2000), p_reason,
           left(nullif(trim(coalesce(p_details, '')), ''), 1000)
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = p_reported
    returning id into report_id;
  exception when others then
    -- Never let a database error carry row contents back to the caller.
    raise exception 'Could not file this report.';
  end;
  return report_id;
end;
$$;
revoke execute on function public.report_user(uuid, text, text, bigint) from public, anon;
grant execute on function public.report_user(uuid, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Bans: ignore dots and +suffixes so a trivial variation of the same address
--    does not get through; forget the email when someone is unbanned; and let a
--    banned person still delete their data (their email stays on the ban list).
-- ---------------------------------------------------------------------------
create or replace function public.normalize_email(raw text)
returns text language sql immutable set search_path = public as $$
  select case
    when raw is null then null
    else regexp_replace(split_part(lower(raw), '@', 1), '\+.*$', '') || '@' || split_part(lower(raw), '@', 2)
  end;
$$;

-- Re-normalise anything already stored.
update public.banned_emails set email = public.normalize_email(email)
  where email <> public.normalize_email(email)
    and public.normalize_email(email) not in (select email from public.banned_emails);
delete from public.banned_emails where email <> public.normalize_email(email);

create or replace function public.record_ban()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_banned and not old.is_banned then
    insert into public.banned_emails (email)
      select public.normalize_email(u.email) from auth.users u where u.id = new.id and u.email is not null
      on conflict (email) do nothing;
  elsif old.is_banned and not new.is_banned then
    delete from public.banned_emails
      where email = (select public.normalize_email(u.email) from auth.users u where u.id = new.id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, is_banned, terms_accepted_at, terms_version)
  values (
    new.id,
    exists (select 1 from public.banned_emails b where b.email = public.normalize_email(new.email)),
    nullif(new.raw_user_meta_data ->> 'terms_accepted_at', '')::timestamptz,
    nullif(new.raw_user_meta_data ->> 'terms_version', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- A banned person may still erase their data (GDPR). The ban lives on in banned_emails,
-- so signing up again with the same address lands them straight back on the banned screen.
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  insert into public.banned_emails (email)
    select public.normalize_email(u.email)
      from auth.users u join public.profiles p on p.id = u.id
      where u.id = uid and p.is_banned and u.email is not null
    on conflict (email) do nothing;
  delete from auth.users where id = uid;
end;
$$;
