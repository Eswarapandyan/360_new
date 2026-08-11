-- 360 Review SaaS: Super Admin (platform_admins) access rules
--
-- Grants platform admins full read/write across every company's setup
-- metadata (organizations, contacts, projects, dimensions, competencies,
-- questions, org_members, assignments, review_cycles) -- everything needed
-- to onboard a company and roll out a review on their behalf.
--
-- Deliberately excluded: `responses`. A platform admin gets no policy on
-- that table at all, same as company admins -- individual peer/direct-
-- report feedback stays behind the aggregate_results() anonymity gate no
-- matter who is asking. "Super Admin" means "can operate any company's
-- setup," not "can read anyone's raw feedback."

-- Company location, captured during onboarding alongside the SPOC contacts.
alter table organizations add column location text;

create or replace function app_private.is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

grant execute on function app_private.is_platform_admin() to authenticated;

-- PLATFORM_ADMINS -----------------------------------------------------------
-- Anyone can see their own row (so the app can check "am I a Super Admin");
-- admins can see the full roster. No insert/update/delete policy for
-- `authenticated` -- adding a new Super Admin stays a manual SQL step for
-- now, since it's a small, trusted operator team, not something end users
-- should ever be able to grant themselves.

alter table platform_admins enable row level security;

create policy platform_admins_self_select on platform_admins
  for select
  using (user_id = auth.uid());

create policy platform_admins_admin_select on platform_admins
  for select
  using (app_private.is_platform_admin());

grant select on platform_admins to authenticated;

-- ORGANIZATIONS ---------------------------------------------------------
-- Company admins already have select/update from earlier migrations.
-- Platform admins additionally get insert/delete, so onboarding a new
-- company (an insert) doesn't need a special bootstrap RPC this time --
-- unlike self-serve signup, a platform admin already exists in
-- platform_admins before any company does, so a direct policy is enough.

create policy organizations_platform_admin_all on organizations
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

grant insert, delete on organizations to authenticated;

-- COMPANY_CONTACTS (SPOC) ---------------------------------------------------

alter table company_contacts enable row level security;

create policy company_contacts_org_member_select on company_contacts
  for select
  using (app_private.is_org_member(org_id));

create policy company_contacts_platform_admin_all on company_contacts
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

grant select, insert, update, delete on company_contacts to authenticated;

-- PROJECTS -------------------------------------------------------------

alter table projects enable row level security;

create policy projects_org_member_select on projects
  for select
  using (app_private.is_org_member(org_id));

create policy projects_platform_admin_all on projects
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

grant select, insert, update, delete on projects to authenticated;

-- DIMENSIONS ---------------------------------------------------------------

alter table dimensions enable row level security;

create policy dimensions_org_member_select on dimensions
  for select
  using (app_private.is_org_member(org_id));

create policy dimensions_platform_admin_all on dimensions
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

grant select, insert, update, delete on dimensions to authenticated;

-- EXISTING TABLES: extend with a platform-admin "can do anything" policy.
-- These already have RLS enabled and their own org-scoped policies from
-- migration 0002; Postgres combines multiple permissive policies with OR,
-- so this simply adds a second way in, it doesn't replace the existing
-- company-admin/reviewer rules.

create policy competencies_platform_admin_all on competencies
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

create policy questions_platform_admin_all on questions
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

create policy review_cycles_platform_admin_all on review_cycles
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

create policy org_members_platform_admin_all on org_members
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());

create policy assignments_platform_admin_all on assignments
  for all
  using (app_private.is_platform_admin())
  with check (app_private.is_platform_admin());
