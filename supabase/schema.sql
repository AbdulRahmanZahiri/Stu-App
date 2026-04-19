-- ScholarFlow Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── Universities ─────────────────────────────────────────────────────────────
create table universities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  country text not null default 'Canada',
  email_domain text,
  created_at timestamptz default now()
);

-- ─── Student Profiles ─────────────────────────────────────────────────────────
-- Note: extends Supabase auth.users
create table student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_id text unique,
  name text not null,
  email text not null,
  university_id uuid references universities(id),
  university_name text,
  major text,
  year_of_study int check (year_of_study between 1 and 10),
  semester text,
  gpa numeric(3, 2),
  avatar_url text,
  bio text,
  goals text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Courses ──────────────────────────────────────────────────────────────────
create table courses (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  code text not null,
  name text not null,
  instructor text,
  credits int not null default 3,
  semester text not null,
  year int not null,
  color text not null default '#6366f1',
  schedule text,
  room text,
  status text not null default 'active' check (status in ('active', 'completed', 'dropped')),
  created_at timestamptz default now()
);

-- ─── Syllabi ──────────────────────────────────────────────────────────────────
create table syllabi (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_size int,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'processing', 'completed', 'failed')),
  extracted_data jsonb,
  uploaded_at timestamptz default now(),
  parsed_at timestamptz
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────
create table tasks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  description text,
  type text not null default 'assignment' check (type in ('assignment', 'quiz', 'exam', 'project', 'reading', 'lab', 'other')),
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'overdue')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date timestamptz,
  completed_at timestamptz,
  estimated_hours numeric(4, 1),
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Grade Categories ─────────────────────────────────────────────────────────
create table grade_categories (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  name text not null,
  weight numeric(5, 2) not null check (weight between 0 and 100),
  count int,
  color text,
  created_at timestamptz default now()
);

-- ─── Grade Entries ────────────────────────────────────────────────────────────
create table grade_entries (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  category_id uuid references grade_categories(id) on delete cascade,
  title text not null,
  score numeric(6, 2),
  max_score numeric(6, 2) not null default 100,
  feedback text,
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz default now()
);

-- ─── Calendar Events ──────────────────────────────────────────────────────────
create table calendar_events (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  title text not null,
  type text not null default 'deadline' check (type in ('deadline', 'exam', 'class', 'reminder', 'personal')),
  start_date timestamptz not null,
  end_date timestamptz,
  all_day boolean default false,
  color text,
  description text,
  location text,
  created_at timestamptz default now()
);

-- ─── Notes ────────────────────────────────────────────────────────────────────
create table notes (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references student_profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete set null,
  course_code text,
  title text not null,
  content text not null,
  excerpt text,
  type text not null default 'personal' check (type in ('personal', 'shared', 'archived')),
  tags text[],
  subject text,
  semester text,
  year int,
  university_name text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  is_verified boolean default false,
  view_count int default 0,
  download_count int default 0,
  file_url text,
  file_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Chat Rooms ───────────────────────────────────────────────────────────────
create table chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  type text not null check (type in ('course', 'major', 'general', 'direct')),
  description text,
  course_code text,
  university_name text,
  member_count int default 0,
  color text,
  created_at timestamptz default now()
);

-- ─── Chat Messages ────────────────────────────────────────────────────────────
create table chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references chat_rooms(id) on delete cascade,
  sender_id uuid references student_profiles(id) on delete set null,
  sender_name text not null,
  content text not null,
  type text not null default 'text' check (type in ('text', 'file', 'image', 'system')),
  reactions jsonb default '[]',
  created_at timestamptz default now()
);

-- ─── Room Memberships ─────────────────────────────────────────────────────────
create table room_members (
  room_id uuid references chat_rooms(id) on delete cascade,
  student_id uuid references student_profiles(id) on delete cascade,
  joined_at timestamptz default now(),
  last_read_at timestamptz default now(),
  primary key (room_id, student_id)
);

-- ─── Academic Plans ───────────────────────────────────────────────────────────
create table academic_plans (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  major text not null,
  university_name text,
  start_year int,
  expected_grad_year int,
  completed_courses jsonb default '[]',
  in_progress_courses jsonb default '[]',
  planned_courses jsonb default '[]',
  requirements jsonb default '[]',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Reminders ────────────────────────────────────────────────────────────────
create table reminders (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  task_id uuid references tasks(id) on delete set null,
  title text not null,
  message text,
  scheduled_for timestamptz not null,
  type text not null default 'in-app' check (type in ('email', 'push', 'in-app')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'dismissed')),
  created_at timestamptz default now()
);

-- ─── Audio Study Items ────────────────────────────────────────────────────────
create table audio_study_items (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references student_profiles(id) on delete cascade,
  title text not null,
  source_note_id uuid references notes(id) on delete set null,
  duration_seconds int,
  script text,
  audio_url text,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  created_at timestamptz default now()
);

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table student_profiles enable row level security;
alter table courses enable row level security;
alter table tasks enable row level security;
alter table grade_entries enable row level security;
alter table calendar_events enable row level security;
alter table notes enable row level security;
alter table chat_messages enable row level security;
alter table academic_plans enable row level security;
alter table reminders enable row level security;
alter table audio_study_items enable row level security;

-- Students can only read/write their own data
create policy "Own profile only" on student_profiles
  for all using (auth.uid() = id);

create policy "Own courses only" on courses
  for all using (auth.uid() = student_id);

create policy "Own tasks only" on tasks
  for all using (auth.uid() = student_id);

create policy "Own grades only" on grade_entries
  for all using (auth.uid() = student_id);

create policy "Own calendar" on calendar_events
  for all using (auth.uid() = student_id);

-- Notes: personal notes are private, shared notes are public
create policy "Own or public notes" on notes
  for select using (auth.uid() = author_id or type = 'shared');

create policy "Own notes write" on notes
  for insert with check (auth.uid() = author_id);

-- Chat: authenticated users can read all messages in rooms they belong to
create policy "Room messages readable" on chat_messages
  for select using (
    exists (
      select 1 from room_members
      where room_id = chat_messages.room_id
        and student_id = auth.uid()
    )
  );

create policy "Own messages write" on chat_messages
  for insert with check (auth.uid() = sender_id);

create policy "Own plan only" on academic_plans
  for all using (auth.uid() = student_id);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index idx_courses_student on courses(student_id);
create index idx_tasks_student on tasks(student_id);
create index idx_tasks_due_date on tasks(due_date) where status != 'completed';
create index idx_grade_entries_course on grade_entries(course_id);
create index idx_chat_messages_room on chat_messages(room_id, created_at desc);
create index idx_notes_type on notes(type) where status = 'published';
create index idx_calendar_student_date on calendar_events(student_id, start_date);
