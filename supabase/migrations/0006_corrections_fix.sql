-- Fix: the correction check inside the messages insert policy did not evaluate as intended.
-- A helper function (running as the database owner) now checks that the corrected message
-- exists, is in the same conversation, and was written by the other person.
-- Safe to run twice.

create or replace function public.can_correct(p_message_id bigint, p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.messages m
    where m.id = p_message_id
      and m.conversation_id = p_conversation
      and m.sender_id <> auth.uid()
      and m.kind = 'text'
  );
$$;

revoke execute on function public.can_correct(bigint, uuid) from public, anon;
grant execute on function public.can_correct(bigint, uuid) to authenticated;

drop policy if exists "participants send messages" on public.messages;
create policy "participants send messages"
  on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_participant(conversation_id)
    and not public.is_blocked_between(auth.uid(), public.other_participant(conversation_id))
    and not exists (select 1 from public.profiles where id = auth.uid() and is_banned)
    and (
      corrected_from_message_id is null
      or public.can_correct(corrected_from_message_id, conversation_id)
    )
  );

-- Remove the test row left by the check that found this bug.
delete from public.messages where kind = 'correction' and body = 'probe A';
