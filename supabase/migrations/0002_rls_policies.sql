-- 360 Review SaaS: RLS helper functions + policies
--
-- Helper functions live in app_private and are SECURITY DEFINER so they can
-- read org_members without themselves being blocked by org_members' own RLS
-- (avoids the classic recursive-policy trap). They are STABLE and take no
-- app-controlled row data other than an org_id/assignment_id argument, so
-- they're safe to call from any policy.

create schema if not exists app_private;
grant usage on schema app_private to authenticated;

create or replace function app_private.org_role(p_org_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.org_role(p_org_id) is not null;
$$;

create or replace function app_private.is_org_admin(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select app_private.org_role(p_org_id) = 'admin';
$$;

create or replace function app_private.current_org_member_id(p_org_id uuid)
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select id from org_members
  where org_id = p_org_id and user_id = auth.uid()
  limit 1;
$$;

create or replace function app_private.owns_assignment(p_assignment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from assignments a
    join org_members m on m.id = a.reviewer_id
    where a.id = p_assignment_id and m.user_id = auth.uid()
  );
$$;

grant execute on all functions in schema app_private to authenticated;

-- ORGANIZATIONS ---------------------------------------------------------
-- No INSERT policy for `authenticated`: org creation only happens through
-- the create_organization() RPC (0003), a SECURITY DEFINER function owned by
-- the table owner, which is exempt from RLS by default. This deliberately
-- avoids the "must already be a member to create the org" bootstrap problem.

alter table organizations enable row level security;

create policy organizations_select on organizations
  for select
  using (app_private.is_org_member(id));

create policy organizations_update on organizations
  for update
  using (app_private.is_org_admin(id));

-- ORG_MEMBERS -------------------------------------------------------------

alter table org_members enable row level security;

create policy org_members_select on org_members
  for select
  using (app_private.is_org_member(org_id));

create policy org_members_admin_write on org_members
  for all
  using (app_private.is_org_admin(org_id))
  with check (app_private.is_org_admin(org_id));

-- INVITES -----------------------------------------------------------------
-- No policy grants anon/authenticated direct access. Creating an invite goes
-- through create_invite() (admin-checked inside the RPC); accepting one goes
-- through accept_invite(token), which validates the token server-side. Both
-- are SECURITY DEFINER, so RLS on this table is intentionally a closed door.

alter table invites enable row level security;

create policy invites_admin_select on invites
  for select
  using (app_private.is_org_admin(org_id));

-- REVIEW_CYCLES / COMPETENCIES / QUESTIONS ---------------------------------

alter table review_cycles enable row level security;

create policy review_cycles_select on review_cycles
  for select
  using (app_private.is_org_member(org_id));

create policy review_cycles_admin_write on review_cycles
  for all
  using (app_private.is_org_admin(org_id))
  with check (app_private.is_org_admin(org_id));

alter table competencies enable row level security;

create policy competencies_select on competencies
  for select
  using (app_private.is_org_member(org_id));

create policy competencies_admin_write on competencies
  for all
  using (app_private.is_org_admin(org_id))
  with check (app_private.is_org_admin(org_id));

alter table questions enable row level security;

create policy questions_select on questions
  for select
  using (app_private.is_org_member(org_id));

create policy questions_admin_write on questions
  for all
  using (app_private.is_org_admin(org_id))
  with check (app_private.is_org_admin(org_id));

-- ASSIGNMENTS ---------------------------------------------------------------
-- Reviewees deliberately get NO select policy here. If they could read
-- assignments directly, a peer/direct_report reviewer's identity would leak
-- before aggregation ever happens. Reviewees only ever consume results
-- through get_my_results() (0003), which never returns reviewer_id for
-- non-attributable relationship types.

alter table assignments enable row level security;

create policy assignments_reviewer_select on assignments
  for select
  using (
    reviewer_id = app_private.current_org_member_id(org_id)
  );

create policy assignments_admin_select on assignments
  for select
  using (app_private.is_org_admin(org_id));

create policy assignments_admin_write on assignments
  for all
  using (app_private.is_org_admin(org_id))
  with check (app_private.is_org_admin(org_id));

create policy assignments_reviewer_update_status on assignments
  for update
  using (app_private.owns_assignment(id))
  with check (app_private.owns_assignment(id));

-- RESPONSES -----------------------------------------------------------------
-- Only the reviewer who owns the assignment can read/write their own answers.
-- No admin select policy, and no reviewee select policy: this table is never
-- read directly by app code for results display, only through the
-- aggregation RPCs in 0003. That's what makes the anonymity guarantee hold
-- even if a future feature forgets the threshold rule.

alter table responses enable row level security;

create policy responses_reviewer_select on responses
  for select
  using (app_private.owns_assignment(assignment_id));

create policy responses_reviewer_write on responses
  for insert
  with check (
    app_private.owns_assignment(assignment_id)
    and exists (
      select 1 from assignments a
      join review_cycles c on c.id = a.cycle_id
      where a.id = assignment_id and c.status = 'active'
    )
  );

create policy responses_reviewer_update on responses
  for update
  using (app_private.owns_assignment(assignment_id))
  with check (
    app_private.owns_assignment(assignment_id)
    and exists (
      select 1 from assignments a
      join review_cycles c on c.id = a.cycle_id
      where a.id = assignment_id and c.status = 'active'
    )
  );
