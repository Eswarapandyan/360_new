-- 360 Review SaaS: Projects, Dimensions, Platform Admins, Company Contacts
--
-- Introduces a "Project" layer between a company (organizations) and a
-- rollout round (review_cycles): a Project owns the reusable setup
-- (dimensions -> competencies -> questions), and can be rolled out multiple
-- times over as separate review_cycles rows.
--
-- Also introduces Platform Admins: an operator role that exists outside any
-- single company, able to onboard companies and set up their projects. This
-- is intentionally a *separate* table from org_members -- a platform admin
-- is not an employee of any client company, and (per RLS in the next
-- migration) does not get to bypass the anonymity rule on responses.

-- PLATFORM_ADMINS -----------------------------------------------------------

create table platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

-- COMPANY_CONTACTS (SPOC) ---------------------------------------------------
-- A named point of contact at a client company. Deliberately not a login
-- account -- just a contact record captured during onboarding. A company
-- can have more than one.

create table company_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  title text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index company_contacts_org_id_idx on company_contacts (org_id);

-- PROJECTS -------------------------------------------------------------
-- The reusable review-program setup for a company. Dimensions,
-- competencies, and questions all belong to a project (not directly to the
-- org), so two projects for the same company can have entirely different
-- frameworks if needed.

create table projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  created_by uuid references platform_admins (id),
  created_at timestamptz not null default now()
);

create index projects_org_id_idx on projects (org_id);

-- DIMENSIONS ---------------------------------------------------------------
-- Sits above competencies, e.g. dimension "Leadership" containing
-- competencies "Delegation" and "Decision-Making".

create table dimensions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  org_id uuid not null references organizations (id) on delete cascade,
  name text not null,
  description text,
  sort_order int not null default 0
);

create index dimensions_project_id_idx on dimensions (project_id);

-- Hook competencies/questions/review_cycles into the project hierarchy.
-- Nullable for now (rather than not null) so any rows created during the
-- earlier prototype/testing phase, before Projects existed, don't break
-- this migration -- new rows going forward should always set these.

alter table competencies add column project_id uuid references projects (id) on delete cascade;
alter table competencies add column dimension_id uuid references dimensions (id) on delete set null;
create index competencies_project_id_idx on competencies (project_id);
create index competencies_dimension_id_idx on competencies (dimension_id);

alter table questions add column project_id uuid references projects (id) on delete cascade;
create index questions_project_id_idx on questions (project_id);

alter table review_cycles add column project_id uuid references projects (id) on delete cascade;
create index review_cycles_project_id_idx on review_cycles (project_id);

-- Tracks whether each assignment's reviewer has already been emailed about
-- it, so the rollout step can be re-run safely without spamming people
-- (e.g. rolling out to a second batch of employees added later).
alter table assignments add column notified_at timestamptz;
