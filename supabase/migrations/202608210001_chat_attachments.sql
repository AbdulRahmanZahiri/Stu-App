-- Chat attachments: add file columns + storage bucket

-- Create chat tables if they don't already exist
create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'general',
  description text,
  course_code text,
  university_name text,
  color text,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, student_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  content text not null default '',
  type text not null default 'text',
  file_url text,
  file_name text,
  file_size bigint,
  file_mime text,
  created_at timestamptz not null default now()
);

-- Add file columns to existing chat_messages table
alter table public.chat_messages
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists file_mime text;

-- Enable RLS
alter table public.chat_rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.chat_messages enable row level security;

-- RLS policies (drop+create so they're idempotent)
drop policy if exists "Authenticated read rooms" on public.chat_rooms;
create policy "Authenticated read rooms" on public.chat_rooms
  for select using (auth.uid() is not null);

drop policy if exists "Authenticated create rooms" on public.chat_rooms;
create policy "Authenticated create rooms" on public.chat_rooms
  for insert with check (auth.uid() is not null);

drop policy if exists "Read memberships" on public.room_members;
create policy "Read memberships" on public.room_members
  for select using (auth.uid() is not null);

drop policy if exists "Own membership write" on public.room_members;
create policy "Own membership write" on public.room_members
  for insert with check (student_id = auth.uid());

drop policy if exists "Own membership delete" on public.room_members;
create policy "Own membership delete" on public.room_members
  for delete using (student_id = auth.uid());

drop policy if exists "Authenticated read messages" on public.chat_messages;
create policy "Authenticated read messages" on public.chat_messages
  for select using (auth.uid() is not null);

drop policy if exists "Authenticated post messages" on public.chat_messages;
create policy "Authenticated post messages" on public.chat_messages
  for insert with check (auth.uid() = sender_id);

-- Chat attachments bucket (public so image URLs work in <img> tags)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  20971520,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf', 'text/plain'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for chat-attachments
drop policy if exists "Chat attachments public read" on storage.objects;
create policy "Chat attachments public read" on storage.objects
  for select using (bucket_id = 'chat-attachments');

drop policy if exists "Authenticated upload chat files" on storage.objects;
create policy "Authenticated upload chat files" on storage.objects
  for insert with check (bucket_id = 'chat-attachments' and auth.uid() is not null);

drop policy if exists "Own chat files delete" on storage.objects;
create policy "Own chat files delete" on storage.objects
  for delete using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- Add to Realtime publication
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_rooms'
  ) then
    alter publication supabase_realtime add table public.chat_rooms;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_members'
  ) then
    alter publication supabase_realtime add table public.room_members;
  end if;
end
$$;
