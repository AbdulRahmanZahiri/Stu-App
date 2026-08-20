# Supabase Setup

Run these files in the Supabase SQL Editor in order:

1. `schema.sql` for a new project only.
2. `migrations/202608120001_backend_integration.sql` for every project.
3. Replace the email in `admin_setup.sql` and run it if an administrator is needed.

The integration migration is safe to re-run. It adds missing RLS policies,
automatic profile creation, storage, realtime chat, and planner persistence.
Legacy billing-compatible profile columns remain dormant while ScholarFlow has
no premium tier.

After applying the SQL, verify that the `syllabi`, `notes`, and `avatars` Storage
buckets exist. The migration also enables Realtime for all community tables.

## Verification

1. In **Authentication > URL Configuration**, add the local and production URLs.
2. Create a test account and confirm a matching `student_profiles` row appears.
3. Confirm the three Storage buckets exist with the expected public/private state.
4. Confirm `chat_rooms`, `chat_messages`, and `room_members` are enabled for Realtime.
5. Import a short TXT syllabus while signed in as a test user.
6. Confirm the syllabus, grade categories, and tasks are committed together.

`community_setup.sql` remains only as a deprecation notice. Do not run a separate
community setup after the integration migration.
