-- Fix: Supabase no longer allows deleting storage rows from SQL. The app now removes the
-- avatar files through the Storage API first, and this function only deletes the auth user
-- (which cascades to profiles and user_languages).
-- How to apply: Supabase dashboard > SQL Editor > New query > paste > Run.

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
