-- Phase 4: conversation helpers. Messages get a kind (text, topic, timer, correction) and
-- structured meta. Corrections must point at a message from the other person in the same chat.
-- Safe to run twice.

alter table public.messages add column if not exists kind text not null default 'text';
alter table public.messages add column if not exists meta jsonb;

alter table public.messages drop constraint if exists messages_kind;
alter table public.messages add constraint messages_kind
  check (kind in ('text', 'topic', 'timer', 'correction'));

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
      or exists (
        select 1 from public.messages original
        where original.id = corrected_from_message_id
          and original.conversation_id = messages.conversation_id
          and original.sender_id <> auth.uid()
      )
    )
  );

-- Chat list previews that make sense for each kind of message.
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
  return new;
end;
$$;
