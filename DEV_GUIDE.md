# 360 Review SaaS — Developer Reference

This file is for you (Eswar), the project owner, who is learning to code
through this project. It's also auto-loaded by Claude Code every time you
open this folder (see the `@DEV_GUIDE.md` line in `CLAUDE.md`), so a fresh
session already has this context without you having to re-explain it.

Last updated: 2026-08-11.

## What this is

A 360-degree employee review tool, replacing a manual Google
Forms/Sheets/Apps Script process. Built as a real web app: Next.js +
Supabase (Postgres + Auth) + Resend (email), all on free tiers.

The core product promise: peer/direct-report feedback is only shown to the
person being reviewed as an **anonymous aggregate**, and only once enough
people have responded (default: 3). This rule is enforced in the database
(see "Core concepts" below), not in app code, on purpose.

## Live links

- **Live app:** https://360-new-sigma.vercel.app
- **GitHub repo:** https://github.com/Eswarapandyan/360_new
- **Vercel project:** log into vercel.com, project is `360_new`
- **Supabase project:** log into supabase.com, project connected to
  `bvbwibqsdgwriwhjagnp.supabase.co`
- **Resend:** log into resend.com — this is where invite/magic-link emails
  actually get sent from, and where you can check delivery logs if an email
  doesn't arrive

## How to resume local development

Local development uses a free, throwaway practice copy of the database on
your own laptop (via Docker), completely separate from the real Supabase
project. Nothing you do locally affects the live site until you deliberately
copy a change over (see "Database migrations" below).

```bash
cd /Users/eswar/Downloads/360_saas

# 1. Make sure Docker Desktop is running (open the Docker app if not)

# 2. Start the local practice database
supabase start

# 3. Start the app
npm run dev
```

Then open:
- **The app:** http://127.0.0.1:3000 (use this, not `localhost`)
- **Fake inbox (Mailpit):** http://127.0.0.1:54324 — local sign-in/invite
  emails land here instead of a real inbox
- **Local database admin UI (Supabase Studio):** http://127.0.0.1:54323

When you're done for the session:
```bash
supabase stop
```
(Ctrl+C stops `npm run dev`.)

## Where things live

```
src/app/                     Pages and their backend logic (Next.js routes)
  login/                     Magic-link sign-in
  onboarding/                Create-your-org flow (self-serve path)
  invite/[token]/            Accept a team invite
  o/[orgSlug]/dashboard/     Company dashboard (org admin view)
  o/[orgSlug]/cycles/...     Review cycles, assignments, review forms, results

  Inside most route folders:
    page.tsx           the screen itself
    actions.ts          backend logic for that screen (Server Actions —
                         this code only ever runs on the server)
    _components/         small supporting pieces used only by this page
                         (forms, buttons, charts) — the underscore means
                         "not a page, just organization"

src/lib/
  server/               backend-only helpers (email sending, permission
                         checks) — must never run in the browser
  supabase/             the Supabase client setup (browser + server variants)
  types.ts              shared TypeScript types
  slug.ts, utils.ts     small shared helpers

supabase/
  migrations/           the database structure, as numbered SQL files —
                         this is the real source of truth for the schema
  templates/            custom email templates (e.g. the magic-link email)
  config.toml           local Supabase configuration
```

## Core concepts (vocabulary)

- **Organization (org / company)** — one client company using the tool.
- **Super Admin (`platform_admins` table)** — you (the platform operator).
  Can onboard any company and set up their projects. Does **not** get to
  read raw individual peer feedback — same anonymity rule applies to you.
- **Org Admin** — a person inside a client company with admin rights over
  just that one company (the self-serve path's equivalent of you).
- **Project** — the reusable review-program setup for a company: its
  dimensions, competencies, and questions. Can be rolled out more than once
  over time.
- **Dimension → Competency → Question** — a Dimension (e.g. "Leadership")
  groups Competencies (e.g. "Delegation"), each of which has Questions.
- **Review Cycle (a "round")** — one actual rollout of a Project — has a
  status (draft/active/closed) and its own anonymity threshold setting.
- **Assignment** — one reviewer reviewing one reviewee in one cycle, with a
  relationship type: `self`, `manager`, `peer`, `direct_report`, or
  `external`.
- **The anonymity rule** — self and manager feedback is always shown
  attributed. Peer and direct-report feedback is only shown as an
  aggregate, and only once the cycle's threshold (default 3) is met — this
  is enforced inside database functions (`get_my_results`,
  `get_manager_team_results`), not in the app's page code, so it can't be
  accidentally bypassed by a future feature.

## Database migrations — how this actually works

The `supabase/migrations/*.sql` files are numbered, permanent instructions
for building the database structure. **Never edit an old migration file** —
always add a new numbered one for any change (this keeps a real history and
matches how every professional team does it).

The process for any future database change:
1. Write the new file as `supabase/migrations/00XX_description.sql`
2. Test it locally first: `supabase start` (if not already running), then
   `supabase db reset` — this wipes the local practice database and
   reapplies every migration from scratch, so you know it works cleanly
3. Once confirmed working locally, copy the SQL and run it in the **real**
   Supabase project's SQL Editor (dashboard → SQL Editor → New query → paste
   → Run) — this is the step that actually changes the live database
4. Commit and push the migration file to GitHub either way, so the history
   stays in sync with what's actually live

Current migrations, in order:
- `0001` — core tables (organizations, members, invites, cycles,
  competencies, questions, assignments, responses)
- `0002` — security rules (RLS) for multi-company data isolation
- `0003` — the anonymity-aggregation functions + org creation/invite logic
- `0004` — base table permissions (a gotcha: RLS alone isn't enough, tables
  also need an explicit GRANT — see "Known gotchas" below)
- `0005` — Projects, Dimensions, Platform Admins (Super Admin), Company
  Contacts (SPOC) tables
- `0006` — security rules letting a Super Admin operate across any company,
  without ever bypassing the anonymity rule on individual responses

## Environment variables

Real values live in `.env.local` (local dev, never committed) and in
Vercel's project settings (live site). Never paste real secret values into
a file that gets committed to GitHub.

| Name | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → Data API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page, "anon / public" key (never the `service_role` one) |
| `RESEND_API_KEY` | resend.com → API Keys |
| `RESEND_FROM_EMAIL` | Currently `onboarding@resend.dev` (Resend's free testing address — only reliably delivers to your own Resend signup email until you verify your own domain) |
| `NEXT_PUBLIC_SITE_URL` | `https://360-new-sigma.vercel.app` (live) or `http://127.0.0.1:3000` (local) |

## Known gotchas (things that already bit us once)

- **Raw SQL migrations don't get automatic table permissions.** Any new
  table needs an explicit `grant select/insert/update/delete ... to
  authenticated` — RLS policies alone only restrict rows, they don't grant
  access to the table in the first place.
- **Use `127.0.0.1`, not `localhost`**, for local dev — matches
  `supabase/config.toml`'s `site_url`, otherwise login cookies get split
  across what the browser treats as two different sites.
- **Real email delivery needs a verified domain.** `onboarding@resend.dev`
  only works reliably for sending to your own Resend account's email.
  Inviting real teammates won't work until a real domain (e.g.
  `krupaharam.com`, purchased but not yet connected as of this writing) is
  verified in Resend.
- **Supabase's magic-link email defaults to its own generic page.** We
  customized it (`supabase/templates/magic_link.html` +
  `[auth.email.template.magic_link]` in `config.toml`) to point at our own
  `/auth/confirm` route instead.

## What's built vs. what's next

**Done:**
- Self-serve signup, org creation, team invites, review cycles, assignments,
  review-response form, results page with anonymity gate + radar chart
- Super Admin role + cross-company database access (schema + security rules)
- Live on Vercel + real Supabase, with real email sending (Resend)

**Next milestone (not yet built):**
1. **Bulk upload** — two-file import (employee roster CSV + reviewer-mapping
   CSV) to set up a whole company's review round at once, instead of
   clicking one assignment at a time
2. **Rollout email logic** — each person gets at most 2 emails per round:
   one for their own self-review, one combined email listing every other
   review they've been assigned
3. **Super Admin screens** — the actual UI for onboarding a company,
   building a project's dimensions/competencies/questions, uploading the
   two files, and clicking "roll out"

## How to resume a session with Claude Code

Just open a terminal in this folder and start Claude Code — this file loads
automatically. A good way to pick back up:

> "Continue from DEV_GUIDE.md — let's build [whichever 'next milestone' item
> you want]."

If something on the live site seems broken, a good first message is:

> "Something's wrong with [feature] on the live site — here's what I did
> and what happened: [...]. Let's debug it."
