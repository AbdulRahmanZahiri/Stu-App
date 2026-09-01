-- Add owner tracking and member roles to community chat

-- Add created_by to rooms for owner identification
alter table public.chat_rooms
  add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Add role and display name to members
alter table public.room_members
  add column if not exists role text not null default 'member',
  add column if not exists member_name text;

-- Owner can update room details
drop policy if exists "Owner update room" on public.chat_rooms;
create policy "Owner update room" on public.chat_rooms
  for update using (created_by = auth.uid());

-- Owner can delete their room
drop policy if exists "Owner delete room" on public.chat_rooms;
create policy "Owner delete room" on public.chat_rooms
  for delete using (created_by = auth.uid());

-- Owner can remove any member from their rooms (in addition to self-leave)
drop policy if exists "Own membership delete" on public.room_members;
create policy "Own membership delete" on public.room_members
  for delete using (
    student_id = auth.uid()
    or exists (
      select 1 from public.chat_rooms
      where id = room_members.room_id and created_by = auth.uid()
    )
  );

-- Allow updating own member_name; owner can update any member's role
drop policy if exists "Member update" on public.room_members;
create policy "Member update" on public.room_members
  for update using (
    student_id = auth.uid()
    or exists (
      select 1 from public.chat_rooms
      where id = room_members.room_id and created_by = auth.uid()
    )
  );
