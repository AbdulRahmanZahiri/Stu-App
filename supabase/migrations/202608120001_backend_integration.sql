-- ScholarFlow production data integration
-- Safe to run after supabase/schema.sql. Statements are idempotent where possible.

create extension if not exists "uuid-ossp";

alter table if exists public.student_profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists subscription_status text,
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists expected_graduation text,
  add column if not exists preferences jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'student_profiles_subscription_plan_check'
  ) then
    alter table public.student_profiles
      add constraint student_profiles_subscription_plan_check
      check (subscription_plan in ('free', 'pro'));
  end if;
end
$$;

alter table if exists public.academic_plans
  add column if not exists planner_state jsonb not null default '{"scenarios":[],"activeScenarioId":"","wizardDone":false}'::jsonb;

alter table if exists public.syllabi
  alter column file_url drop not null;

alter table if exists public.universities enable row level security;
alter table if exists public.student_profiles enable row level security;
alter table if exists public.courses enable row level security;
alter table if exists public.syllabi enable row level security;
alter table if exists public.tasks enable row level security;
alter table if exists public.grade_categories enable row level security;
alter table if exists public.grade_entries enable row level security;
alter table if exists public.calendar_events enable row level security;
alter table if exists public.notes enable row level security;
alter table if exists public.chat_rooms enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.room_members enable row level security;
alter table if exists public.academic_plans enable row level security;
alter table if exists public.reminders enable row level security;
alter table if exists public.audio_study_items enable row level security;

drop policy if exists "Public university directory" on public.universities;
create policy "Public university directory" on public.universities
  for select using (true);

drop policy if exists "Own profile only" on public.student_profiles;
create policy "Own profile only" on public.student_profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.student_profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists "Admin reads all profiles" on public.student_profiles;
create policy "Admin reads all profiles" on public.student_profiles
  for select using (auth.uid() = id or public.is_current_user_admin());

drop policy if exists "Own courses only" on public.courses;
create policy "Own courses only" on public.courses
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own syllabi only" on public.syllabi;
create policy "Own syllabi only" on public.syllabi
  for all
  using (
    exists (
      select 1 from public.courses
      where courses.id = syllabi.course_id
        and courses.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = syllabi.course_id
        and courses.student_id = auth.uid()
    )
  );

drop policy if exists "Own tasks only" on public.tasks;
create policy "Own tasks only" on public.tasks
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own grade categories only" on public.grade_categories;
create policy "Own grade categories only" on public.grade_categories
  for all
  using (
    exists (
      select 1 from public.courses
      where courses.id = grade_categories.course_id
        and courses.student_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.courses
      where courses.id = grade_categories.course_id
        and courses.student_id = auth.uid()
    )
  );

drop policy if exists "Own grades only" on public.grade_entries;
create policy "Own grades only" on public.grade_entries
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own calendar" on public.calendar_events;
create policy "Own calendar" on public.calendar_events
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own or public notes" on public.notes;
create policy "Own or public notes" on public.notes
  for select using (auth.uid() = author_id or type = 'shared');

drop policy if exists "Own notes write" on public.notes;
create policy "Own notes write" on public.notes
  for insert with check (auth.uid() = author_id);

drop policy if exists "Own notes update" on public.notes;
create policy "Own notes update" on public.notes
  for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "Own notes delete" on public.notes;
create policy "Own notes delete" on public.notes
  for delete using (auth.uid() = author_id);

drop policy if exists "Own plan only" on public.academic_plans;
create policy "Own plan only" on public.academic_plans
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own reminders only" on public.reminders;
create policy "Own reminders only" on public.reminders
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Own audio only" on public.audio_study_items;
create policy "Own audio only" on public.audio_study_items
  for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

drop policy if exists "Room messages readable" on public.chat_messages;
drop policy if exists "Own messages write" on public.chat_messages;
drop policy if exists "Authenticated read rooms" on public.chat_rooms;
drop policy if exists "Authenticated create rooms" on public.chat_rooms;
drop policy if exists "Read memberships" on public.room_members;
drop policy if exists "Own membership" on public.room_members;
drop policy if exists "Own membership write" on public.room_members;
drop policy if exists "Own membership delete" on public.room_members;
drop policy if exists "Authenticated read messages" on public.chat_messages;
drop policy if exists "Authenticated post messages" on public.chat_messages;

create policy "Authenticated read rooms" on public.chat_rooms
  for select using (auth.uid() is not null);

create policy "Authenticated create rooms" on public.chat_rooms
  for insert with check (auth.uid() is not null);

create policy "Read memberships" on public.room_members
  for select using (auth.uid() is not null);

create policy "Own membership write" on public.room_members
  for insert with check (student_id = auth.uid());

create policy "Own membership delete" on public.room_members
  for delete using (student_id = auth.uid());

create policy "Authenticated read messages" on public.chat_messages
  for select using (auth.uid() is not null);

create policy "Authenticated post messages" on public.chat_messages
  for insert with check (auth.uid() = sender_id);

create or replace function public.save_syllabus_import(
  p_course_id uuid,
  p_file_name text,
  p_file_url text,
  p_file_size integer,
  p_extracted_data jsonb,
  p_categories jsonb,
  p_tasks jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  syllabus_id uuid;
begin
  if not exists (
    select 1 from public.courses
    where id = p_course_id and student_id = auth.uid()
  ) then
    raise exception 'Course not found or not owned by current user';
  end if;

  insert into public.syllabi (
    course_id,
    file_name,
    file_url,
    file_size,
    parse_status,
    extracted_data,
    parsed_at
  ) values (
    p_course_id,
    p_file_name,
    p_file_url,
    p_file_size,
    'completed',
    p_extracted_data,
    now()
  ) returning id into syllabus_id;

  update public.courses
  set instructor = coalesce(nullif(p_extracted_data ->> 'instructor', ''), instructor)
  where id = p_course_id;

  if jsonb_array_length(coalesce(p_categories, '[]'::jsonb)) > 0 then
    delete from public.grade_categories category
    where category.course_id = p_course_id
      and not exists (
        select 1
        from jsonb_to_recordset(p_categories) as incoming(name text, weight numeric)
        where lower(incoming.name) = lower(category.name)
      );

    update public.grade_categories category
    set weight = incoming.weight
    from jsonb_to_recordset(p_categories) as incoming(name text, weight numeric)
    where category.course_id = p_course_id
      and lower(category.name) = lower(incoming.name);

    insert into public.grade_categories (course_id, name, weight)
    select p_course_id, incoming.name, incoming.weight
    from jsonb_to_recordset(p_categories) as incoming(name text, weight numeric)
    where not exists (
      select 1 from public.grade_categories category
      where category.course_id = p_course_id
        and lower(category.name) = lower(incoming.name)
    );
  end if;

  delete from public.tasks
  where course_id = p_course_id
    and tags @> array['syllabus-import']::text[];

  insert into public.tasks (
    id,
    student_id,
    course_id,
    title,
    description,
    type,
    status,
    priority,
    due_date,
    estimated_hours,
    tags
  )
  select
    incoming.id,
    auth.uid(),
    p_course_id,
    incoming.title,
    incoming.description,
    incoming.type,
    incoming.status,
    incoming.priority,
    incoming.due_date,
    incoming.estimated_hours,
    coalesce(incoming.tags, array['syllabus-import']::text[])
  from jsonb_to_recordset(coalesce(p_tasks, '[]'::jsonb)) as incoming(
    id uuid,
    title text,
    description text,
    type text,
    status text,
    priority text,
    due_date timestamptz,
    estimated_hours numeric,
    tags text[]
  );

  return syllabus_id;
end;
$$;

revoke all on function public.save_syllabus_import(uuid, text, text, integer, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_syllabus_import(uuid, text, text, integer, jsonb, jsonb, jsonb) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_profiles (
    id,
    name,
    email,
    student_id,
    university_name,
    major,
    year_of_study,
    semester,
    goals
  )
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, 'Student'), '@', 1)),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'student_id', ''),
    nullif(new.raw_user_meta_data ->> 'university_name', ''),
    nullif(new.raw_user_meta_data ->> 'major', ''),
    case
      when (new.raw_user_meta_data ->> 'year_of_study') ~ '^[0-9]+$'
      then (new.raw_user_meta_data ->> 'year_of_study')::int
      else null
    end,
    nullif(new.raw_user_meta_data ->> 'semester', ''),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'goals', '[]'::jsonb))),
      '{}'::text[]
    )
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    student_id = coalesce(excluded.student_id, student_profiles.student_id),
    university_name = coalesce(excluded.university_name, student_profiles.university_name),
    major = coalesce(excluded.major, student_profiles.major),
    year_of_study = coalesce(excluded.year_of_study, student_profiles.year_of_study),
    semester = coalesce(excluded.semester, student_profiles.semester),
    goals = case when cardinality(excluded.goals) > 0 then excluded.goals else student_profiles.goals end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of raw_user_meta_data, email on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.student_profiles (id, name, email)
select
  users.id,
  coalesce(nullif(users.raw_user_meta_data ->> 'name', ''), split_part(coalesce(users.email, 'Student'), '@', 1)),
  coalesce(users.email, '')
from auth.users
left join public.student_profiles profiles on profiles.id = users.id
where profiles.id is null
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'syllabi',
  'syllabi',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'notes',
  'notes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Own syllabus files read" on storage.objects;
create policy "Own syllabus files read" on storage.objects
  for select using (
    bucket_id = 'syllabi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own syllabus files insert" on storage.objects;
create policy "Own syllabus files insert" on storage.objects
  for insert with check (
    bucket_id = 'syllabi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own syllabus files update" on storage.objects;
create policy "Own syllabus files update" on storage.objects
  for update
  using (
    bucket_id = 'syllabi'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'syllabi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own syllabus files delete" on storage.objects;
create policy "Own syllabus files delete" on storage.objects
  for delete using (
    bucket_id = 'syllabi'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own note files read" on storage.objects;
create policy "Own note files read" on storage.objects
  for select using (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Shared note files read" on storage.objects;
create policy "Shared note files read" on storage.objects
  for select using (
    bucket_id = 'notes'
    and exists (
      select 1 from public.notes
      where notes.file_url = storage.objects.name
        and notes.type = 'shared'
        and notes.status = 'published'
    )
  );

drop policy if exists "Own note files insert" on storage.objects;
create policy "Own note files insert" on storage.objects
  for insert with check (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own note files update" on storage.objects;
create policy "Own note files update" on storage.objects
  for update
  using (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own note files delete" on storage.objects;
create policy "Own note files delete" on storage.objects
  for delete using (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own avatar files insert" on storage.objects;
create policy "Own avatar files insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own avatar files update" on storage.objects;
create policy "Own avatar files update" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own avatar files delete" on storage.objects;
create policy "Own avatar files delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.delete_current_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  delete from storage.objects
  where bucket_id in ('syllabi', 'notes', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_current_account() from public;
grant execute on function public.delete_current_account() to authenticated;

create or replace function public.protect_profile_billing_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and (
    new.subscription_plan is distinct from old.subscription_plan
    or new.subscription_status is distinct from old.subscription_status
    or new.subscription_current_period_end is distinct from old.subscription_current_period_end
    or new.subscription_cancel_at_period_end is distinct from old.subscription_cancel_at_period_end
    or new.stripe_customer_id is distinct from old.stripe_customer_id
    or new.stripe_subscription_id is distinct from old.stripe_subscription_id
  ) then
    raise exception 'Billing fields can only be changed by the billing service';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_billing_fields on public.student_profiles;
create trigger protect_profile_billing_fields
  before update on public.student_profiles
  for each row execute procedure public.protect_profile_billing_fields();

create index if not exists idx_syllabi_course on public.syllabi(course_id);
create index if not exists idx_grade_categories_course on public.grade_categories(course_id);
create index if not exists idx_academic_plans_student on public.academic_plans(student_id);
create unique index if not exists idx_profiles_stripe_customer
  on public.student_profiles(stripe_customer_id)
  where stripe_customer_id is not null;
create unique index if not exists idx_profiles_stripe_subscription
  on public.student_profiles(stripe_subscription_id)
  where stripe_subscription_id is not null;

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
