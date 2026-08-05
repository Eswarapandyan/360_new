-- 360 Review SaaS: bootstrap + invite + aggregation RPCs
--
-- Every function here is SECURITY DEFINER and owned by the migration role
-- (table owner), which is exempt from RLS by default -- that's what lets
-- these narrow, single-purpose functions do things a plain authenticated
-- client never could (create the very first row of an org, read another
-- member's aggregated-but-anonymized results). Each function hardcodes its
-- own authorization check internally rather than trusting a client-supplied
-- id, so passing a different argument can't widen access.

-- SEED_DEFAULT_QUESTIONS (private helper) ----------------------------------
-- Gives every new org a usable starter template so an admin can launch a
-- review cycle immediately. A full competency/question editor is Phase 2.

create or replace function app_private.seed_default_questions(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp_id uuid;
begin
  insert into competencies (org_id, name, description, sort_order)
  values (p_org_id, 'Communication', 'Shares information clearly and listens well.', 1)
  returning id into v_comp_id;
  insert into questions (org_id, competency_id, text, question_type, sort_order)
  values (p_org_id, v_comp_id, 'How effectively does this person communicate?', 'rating_1_5', 1);

  insert into competencies (org_id, name, description, sort_order)
  values (p_org_id, 'Collaboration', 'Works well with others across the team.', 2)
  returning id into v_comp_id;
  insert into questions (org_id, competency_id, text, question_type, sort_order)
  values (p_org_id, v_comp_id, 'How well does this person collaborate with others?', 'rating_1_5', 2);

  insert into competencies (org_id, name, description, sort_order)
  values (p_org_id, 'Ownership', 'Takes responsibility and follows through.', 3)
  returning id into v_comp_id;
  insert into questions (org_id, competency_id, text, question_type, sort_order)
  values (p_org_id, v_comp_id, 'How reliably does this person take ownership of their work?', 'rating_1_5', 3);

  insert into competencies (org_id, name, description, sort_order)
  values (p_org_id, 'Growth', 'Open, actionable feedback for development.', 4)
  returning id into v_comp_id;
  insert into questions (org_id, competency_id, text, question_type, sort_order)
  values (p_org_id, v_comp_id, 'What should this person keep doing, and what should they start doing?', 'text', 4);
end;
$$;

-- CREATE_ORGANIZATION -------------------------------------------------------
-- Solves the bootstrap problem: you can't satisfy "must already be an org
-- member to write to organizations" for the very first insert.

create or replace function create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_display_name text;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  select coalesce(raw_user_meta_data ->> 'full_name', email), email
    into v_display_name, v_email
  from auth.users
  where id = auth.uid();

  insert into organizations (name, slug, created_by)
  values (p_name, p_slug, auth.uid())
  returning id into v_org_id;

  insert into org_members (org_id, user_id, role, display_name, email, status)
  values (v_org_id, auth.uid(), 'admin', coalesce(v_display_name, v_email), v_email, 'active');

  -- Starter competency/question set so a new org can launch a cycle
  -- immediately, without building a template editor first (that's Phase 2).
  perform app_private.seed_default_questions(v_org_id);

  return v_org_id;
end;
$$;

revoke all on function create_organization(text, text) from public;
grant execute on function create_organization(text, text) to authenticated;

-- CREATE_INVITE ---------------------------------------------------------
-- Admin-only, checked inside the function (not just trusted from the
-- client). Re-inviting the same email refreshes the token/expiry instead of
-- creating a duplicate row.

create or replace function create_invite(p_org_id uuid, p_email text, p_role text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter_id uuid;
  v_token uuid;
begin
  if not app_private.is_org_admin(p_org_id) then
    raise exception 'only org admins can invite members';
  end if;

  v_inviter_id := app_private.current_org_member_id(p_org_id);

  insert into invites (org_id, email, role, invited_by)
  values (p_org_id, lower(p_email), p_role, v_inviter_id)
  on conflict (org_id, email) do update
    set role = excluded.role,
        token = gen_random_uuid(),
        status = 'pending',
        expires_at = now() + interval '14 days',
        accepted_at = null
  returning token into v_token;

  return v_token;
end;
$$;

revoke all on function create_invite(uuid, text, text) from public;
grant execute on function create_invite(uuid, text, text) to authenticated;

-- GET_INVITE_BY_TOKEN -------------------------------------------------------
-- Callable by anon: the accept-invite page needs to show "you're joining
-- Acme Corp as an employee" before the user has signed in. Returns only the
-- single row matching the exact token -- never a general invites listing.

create or replace function get_invite_by_token(p_token uuid)
returns table (
  org_id uuid,
  org_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select i.org_id, o.name, i.email, i.role, i.status, i.expires_at
  from invites i
  join organizations o on o.id = i.org_id
  where i.token = p_token;
$$;

revoke all on function get_invite_by_token(uuid) from public;
grant execute on function get_invite_by_token(uuid) to anon, authenticated;

-- ACCEPT_INVITE ---------------------------------------------------------
-- Requires the caller to already be authenticated (they sign in via magic
-- link to the invited email first), and cross-checks that the authenticated
-- user's email matches the invite -- the token is the bearer credential, but
-- this closes the gap where a token could otherwise leak to the wrong inbox.

create or replace function accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_user_email text;
  v_display_name text;
begin
  if auth.uid() is null then
    raise exception 'must be authenticated';
  end if;

  select * into v_invite from invites where token = p_token for update;

  if v_invite.id is null then
    raise exception 'invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'invite already used or expired';
  end if;

  if v_invite.expires_at < now() then
    update invites set status = 'expired' where id = v_invite.id;
    raise exception 'invite expired';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();

  if lower(v_user_email) <> lower(v_invite.email) then
    raise exception 'invite email does not match the signed-in account';
  end if;

  select coalesce(raw_user_meta_data ->> 'full_name', email)
    into v_display_name
  from auth.users
  where id = auth.uid();

  insert into org_members (org_id, user_id, role, display_name, email, status)
  values (v_invite.org_id, auth.uid(), v_invite.role, coalesce(v_display_name, v_invite.email), v_invite.email, 'active')
  on conflict (org_id, user_id) do update set status = 'active';

  update invites set status = 'accepted', accepted_at = now() where id = v_invite.id;

  return v_invite.org_id;
end;
$$;

revoke all on function accept_invite(uuid) from public;
grant execute on function accept_invite(uuid) to authenticated;

-- AGGREGATE_RESULTS (private helper) ---------------------------------------
-- Shared aggregation logic for both get_my_results and
-- get_manager_team_results. This is the one place the anonymity rule is
-- implemented: self/manager are always attributed; peer/direct_report are
-- only unlocked once >= p_threshold distinct reviewers have submitted, and
-- when locked the result is an identical {"locked": true} regardless of
-- whether it's 0 responses in or N-1 -- the count itself is never leaked.
-- Free-text comments are pooled and shuffled (order by random()) so
-- submission order can't be used to infer who said what.

create or replace function app_private.aggregate_results(p_cycle_id uuid, p_reviewee_id uuid, p_threshold int)
returns table (
  competency_id uuid,
  competency_name text,
  self jsonb,
  manager jsonb,
  peer jsonb,
  direct_report jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  with rated as (
    select q.competency_id, a.relationship_type, r.rating_value, r.text_value, a.reviewer_id
    from assignments a
    join responses r on r.assignment_id = a.id
    join questions q on q.id = r.question_id
    where a.cycle_id = p_cycle_id
      and a.reviewee_id = p_reviewee_id
      and a.status = 'submitted'
  ),
  agg as (
    select
      competency_id,
      relationship_type,
      avg(rating_value) filter (where rating_value is not null) as avg_rating,
      array_agg(text_value order by random()) filter (where text_value is not null and text_value <> '') as comments,
      count(distinct reviewer_id) as reviewer_count
    from rated
    group by competency_id, relationship_type
  )
  select
    comp.id,
    comp.name,
    (select jsonb_build_object('attributed', true, 'avg_rating', a.avg_rating, 'comments', coalesce(a.comments, array[]::text[]))
       from agg a where a.competency_id = comp.id and a.relationship_type = 'self'),
    (select jsonb_build_object('attributed', true, 'avg_rating', a.avg_rating, 'comments', coalesce(a.comments, array[]::text[]))
       from agg a where a.competency_id = comp.id and a.relationship_type = 'manager'),
    coalesce(
      (select case
         when a.reviewer_count >= p_threshold
           then jsonb_build_object('locked', false, 'avg_rating', a.avg_rating, 'comments', coalesce(a.comments, array[]::text[]))
         else jsonb_build_object('locked', true)
       end
       from agg a where a.competency_id = comp.id and a.relationship_type = 'peer'),
      jsonb_build_object('locked', true)
    ),
    coalesce(
      (select case
         when a.reviewer_count >= p_threshold
           then jsonb_build_object('locked', false, 'avg_rating', a.avg_rating, 'comments', coalesce(a.comments, array[]::text[]))
         else jsonb_build_object('locked', true)
       end
       from agg a where a.competency_id = comp.id and a.relationship_type = 'direct_report'),
      jsonb_build_object('locked', true)
    )
  from competencies comp
  where comp.org_id = (select org_id from review_cycles where id = p_cycle_id)
  order by comp.sort_order;
$$;

-- GET_MY_RESULTS ----------------------------------------------------------
-- Hardcodes reviewee = caller. Deliberately takes no reviewee_id argument --
-- a flexible "get results for any id" function is one missing check away
-- from a leak; this one physically cannot return anyone else's data.

create or replace function get_my_results(p_cycle_id uuid)
returns table (
  competency_id uuid,
  competency_name text,
  self jsonb,
  manager jsonb,
  peer jsonb,
  direct_report jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid;
  v_reviewee_id uuid;
  v_threshold int;
begin
  select org_id, min_responses_for_disclosure into v_org_id, v_threshold
  from review_cycles where id = p_cycle_id;

  v_reviewee_id := app_private.current_org_member_id(v_org_id);

  if v_reviewee_id is null then
    raise exception 'not a member of this organization';
  end if;

  return query select * from app_private.aggregate_results(p_cycle_id, v_reviewee_id, v_threshold);
end;
$$;

revoke all on function get_my_results(uuid) from public;
grant execute on function get_my_results(uuid) to authenticated;

-- GET_MANAGER_TEAM_RESULTS --------------------------------------------------
-- Takes a reviewee_id, but the authorization check (is this person actually
-- a direct report of the caller?) happens inside the function against
-- org_members.manager_id -- not trusted from the client -- so it can't be
-- used to fetch an arbitrary member's results.

create or replace function get_manager_team_results(p_cycle_id uuid, p_reviewee_id uuid)
returns table (
  competency_id uuid,
  competency_name text,
  self jsonb,
  manager jsonb,
  peer jsonb,
  direct_report jsonb
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_org_id uuid;
  v_manager_member_id uuid;
  v_threshold int;
begin
  select org_id, min_responses_for_disclosure into v_org_id, v_threshold
  from review_cycles where id = p_cycle_id;

  v_manager_member_id := app_private.current_org_member_id(v_org_id);

  if v_manager_member_id is null then
    raise exception 'not a member of this organization';
  end if;

  if not exists (
    select 1 from org_members
    where id = p_reviewee_id and manager_id = v_manager_member_id
  ) then
    raise exception 'not authorized to view this member''s results';
  end if;

  return query select * from app_private.aggregate_results(p_cycle_id, p_reviewee_id, v_threshold);
end;
$$;

revoke all on function get_manager_team_results(uuid, uuid) from public;
grant execute on function get_manager_team_results(uuid, uuid) to authenticated;
