-- 360 Review SaaS: core schema
-- All tenant-scoped tables carry org_id. RLS is added in 0002_rls_policies.sql.

create extension if not exists "pgcrypto";

-- ORGANIZATIONS -------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'free',
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

-- ORG_MEMBERS -----------------------------------------------------------

create table org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  role text not null check (role in ('admin', 'manager', 'employee')),
  manager_id uuid references org_members (id) on delete set null,
  display_name text not null,
  email text not null,
  title text,
  department text,
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create index org_members_org_id_idx on org_members (org_id);
create index org_members_manager_id_idx on org_members (manager_id);

-- INVITES ---------------------------------------------------------------

create table invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'manager', 'employee')),
  token uuid not null default gen_random_uuid(),
  invited_by uuid references org_members (id),
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create unique index invites_token_idx on invites (token);

-- REVIEW_CYCLES -----------------------------------------------------------

create table review_cycles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  starts_at timestamptz,
  ends_at timestamptz,
  min_responses_for_disclosure int not null default 3,
  created_by uuid references org_members (id),
  created_at timestamptz not null default now()
);

create index review_cycles_org_id_idx on review_cycles (org_id);

-- COMPETENCIES ------------------------------------------------------------

create table competencies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0
);

create index competencies_org_id_idx on competencies (org_id);

-- QUESTIONS ---------------------------------------------------------------

create table questions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  competency_id uuid references competencies (id) on delete set null,
  text text not null,
  question_type text not null check (question_type in ('rating_1_5', 'rating_1_7', 'text')),
  applies_to text[] not null default array['self', 'manager', 'peer', 'direct_report']::text[],
  sort_order int not null default 0
);

create index questions_org_id_idx on questions (org_id);
create index questions_competency_id_idx on questions (competency_id);

-- ASSIGNMENTS ---------------------------------------------------------------
-- The reviewer <-> reviewee <-> cycle triple. org_id is denormalized here
-- (rather than requiring a join through review_cycles) to keep RLS predicates
-- on this sensitive table simple and fast.

create table assignments (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references review_cycles (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  reviewee_id uuid not null references org_members (id) on delete cascade,
  reviewer_id uuid references org_members (id) on delete cascade,
  relationship_type text not null check (relationship_type in ('self', 'manager', 'peer', 'direct_report', 'external')),
  external_email text,
  external_name text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'submitted')),
  access_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (cycle_id, reviewee_id, reviewer_id)
);

create index assignments_cycle_id_idx on assignments (cycle_id);
create index assignments_reviewee_id_idx on assignments (reviewee_id);
create index assignments_reviewer_id_idx on assignments (reviewer_id);
create unique index assignments_access_token_idx on assignments (access_token);

-- RESPONSES ---------------------------------------------------------------

create table responses (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references assignments (id) on delete cascade,
  question_id uuid not null references questions (id) on delete cascade,
  rating_value int,
  text_value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, question_id)
);

create index responses_assignment_id_idx on responses (assignment_id);
create index responses_question_id_idx on responses (question_id);
