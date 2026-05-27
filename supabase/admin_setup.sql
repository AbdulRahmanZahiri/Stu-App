-- ─── ScholarFlow Admin Setup ──────────────────────────────────────────────────
-- Run this once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fdukxpiskgvbjghmeick/sql

-- Step 1: Add is_admin column (safe to re-run)
alter table student_profiles
  add column if not exists is_admin boolean not null default false;

-- Step 2: Security-definer helper — avoids recursive RLS when policies
--         call back into student_profiles to check is_admin
create or replace function is_current_user_admin()
returns boolean
language plpgsql
security definer
stable
as $$
begin
  return coalesce(
    (select is_admin from student_profiles where id = auth.uid()),
    false
  );
end;
$$;

-- Step 3: Allow admins to SELECT all profiles
--         (existing "Own profile only" policy stays and covers INSERT/UPDATE/DELETE)
drop policy if exists "Admin reads all profiles" on student_profiles;
create policy "Admin reads all profiles" on student_profiles
  for select using (
    auth.uid() = id or is_current_user_admin()
  );

-- Step 4: Grant yourself admin rights
--         (your email is already pre-filled — just run this)
update student_profiles
  set is_admin = true
  where email = 'abdulrahmanzahiri534@gmail.com';
