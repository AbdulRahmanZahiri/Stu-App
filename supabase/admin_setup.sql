-- Apply migrations/202608120001_backend_integration.sql first.
-- Replace this placeholder with the intended administrator's account email.

update public.student_profiles
set is_admin = true,
    updated_at = now()
where email = 'admin@example.com';
