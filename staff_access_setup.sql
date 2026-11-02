-- CUE LOUNGE STAFF ACCESS (STAFF + ADMIN SHARE ONE ROLE)
-- Run in Supabase SQL Editor AFTER existing Cue Lounge tables exist.
-- Create each staff account through the website first. Copy its UUID from
-- Supabase > Authentication > Users, then run the INSERT at the bottom.

create table if not exists public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
drop policy if exists "Staff can view own staff membership" on public.staff_members;
create policy "Staff can view own staff membership" on public.staff_members
for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;

drop policy if exists "Staff can view all reservations" on public.reservations;
create policy "Staff can view all reservations" on public.reservations
for select to authenticated using (exists (select 1 from public.staff_members sm where sm.user_id=(select auth.uid())));

drop policy if exists "Staff can update reservation status" on public.reservations;
create policy "Staff can update reservation status" on public.reservations
for update to authenticated
using (exists (select 1 from public.staff_members sm where sm.user_id=(select auth.uid())))
with check (exists (select 1 from public.staff_members sm where sm.user_id=(select auth.uid())));
revoke update on public.reservations from authenticated;
grant update (status) on public.reservations to authenticated;

-- Replace with the real UUID from Authentication > Users, then uncomment:
-- insert into public.staff_members (user_id) values ('PASTE-STAFF-USER-UUID-HERE');
