-- =============================================================================
-- Helpers for the admin dashboard.
-- =============================================================================

-- Whether staff must use two-step verification (the dashboard reads this to decide
-- whether to send a newly signed-in staff member to set up an authenticator app).
create function public.staff_mfa_required()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select s.require_staff_mfa from private.security_settings s;
$$;
revoke all on function public.staff_mfa_required() from public, anon;
grant execute on function public.staff_mfa_required() to authenticated;

-- Whether the signed-in user holds any staff role (regardless of two-step status),
-- so the dashboard can tell "not staff" apart from "staff who still needs two-step".
create function public.has_staff_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.key = ur.role_key
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid()) and r.is_staff and p.is_active
  );
$$;
revoke all on function public.has_staff_role() from public, anon;
grant execute on function public.has_staff_role() to authenticated;

-- Enquiry counts per status for the dashboard overview (respects enquiries.view).
create function public.enquiry_counts()
returns table (status public.enquiry_status, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.status, count(*) from public.enquiries e group by e.status;
$$;
revoke all on function public.enquiry_counts() from public, anon;
grant execute on function public.enquiry_counts() to authenticated;
