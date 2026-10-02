# rookie

**Learn Computer Science. Build Real Skills.**

Rookie is a learning platform for CS fundamentals — programming, DSA, databases, operating
systems, networking, system design and web development. It combines a classroom, a roadmap,
a coding platform and a personal learning dashboard into one daily loop:

> Open it every morning and immediately know what you're learning today, which class you have,
> what to practice, how far along your roadmap you are, and what to do next.

---

## Tech stack

| Layer      | Choice |
|------------|--------|
| Framework  | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`) |
| Language   | TypeScript (strict) |
| UI         | React 19, Tailwind CSS v4, shadcn-style components on `radix-ui`, Lucide icons, `sonner` toasts, `cmdk` command menu, Recharts |
| Forms      | React Hook Form + Zod |
| Backend    | Supabase — Postgres, Auth, Row Level Security, Realtime |
| Editor     | CodeMirror 6 (`@uiw/react-codemirror`) |

There is **no separate API server**: `Next.js → Supabase → Postgres`. Business rules that must
hold no matter who calls (permissions, activity tracking, achievements, streaks) live in Postgres
as RLS policies, triggers and RPC functions.

---

## Architecture overview

```
Browser ──► Next.js (Server Components / Server Actions) ──► Supabase (PostgREST + Auth)
   │                                                               │
   └── Client Components (browser Supabase client, Realtime) ──────┤
                                                                   ▼
                                       Postgres: tables + RLS + triggers + RPCs
```

### Key decisions

- **Authorization lives in the database.** Every table has RLS enabled; anything not explicitly
  allowed is denied. The UI also hides actions by role, and server actions re-check roles for
  better error messages, but the source of truth is `supabase/migrations/*_rls.sql`.
- **No public signup.** Admins create accounts (Admin → Users → Add user) through the
  `admin_create_user` database function, which re-checks `is_admin()`. Admins can also reset a
  user's password or delete the account. Supabase's own signup endpoint must be switched off in
  the dashboard so it can't be called directly. Email + password is the only login method.
- **Roles** are `student` and `admin` (a `user_role` enum on `profiles`). New users are
  always students. A trigger blocks role changes unless the caller is an admin; admins use the
  `admin_set_role` RPC.
- **One activity system.** Domain tables fire triggers (`student_progress`, `coding_submissions`,
  `attendance`, `assignment_submissions`, `roadmap_node_progress`) which call `log_activity()`.
  `activity_logs` has a unique `(user_id, type, entity_id)` key, so toggling a lesson on/off or
  re-solving a problem can't farm activity. Streaks, recent activity, achievements and analytics
  all read from this one log. Clients cannot write to it.
- **Achievements** are rows in `achievements` with JSON `criteria`
  (`count` of an activity type, `streak` length, `attendance_rate`). They're evaluated after each
  activity and unlocked automatically; unlocking creates a notification.
- **Streaks** count days (in the user's timezone) with at least one meaningful activity — lesson
  completed, problem solved, class attended, assignment submitted, roadmap topic completed.
  Achievement unlocks don't count.
- **Class rosters** = students enrolled in the class's course (`course_enrollments`). Classes with
  no course are open sessions visible to every student. Following a roadmap enrolls you in its
  courses.
- **Assignment statuses**: `not started` = no submission row; `in_progress`/`submitted`/`reviewed`
  are stored; `late` is derived from `due_at`. A trigger prevents students from grading themselves
  or editing reviewed work, and limits staff to grading fields.
- **Daily agenda** = personal agendas (`owner_id`) + cohort agendas created by admins for a
  course (`course_id`). Per-student completion lives in `agenda_item_progress`, so one cohort item
  can be completed individually by each student. Classes and assignment deadlines for the day are
  merged in at read time — no duplicated rows.
- **Roadmap progress** follows lesson progress: a topic linked to a lesson is complete when the
  lesson is; topics without a lesson can be checked off manually.
- **Payments** are a ledger, not a gateway: admins record monthly fees received (UPI, cash, bank
  transfer…) per student in **Admin → Payments**, see who has paid for a month, and review totals.
  Students can read only their own payments (RLS).
- **Notifications** are created by triggers (new announcement, new assignment, class scheduled,
  assignment reviewed, achievement unlocked, roadmap section finished) and pushed live to the bell
  via Supabase Realtime.

### Code execution (coding platform)

The MVP deliberately **does not run arbitrary code on the server.** Execution sits behind a
`CodeRunner` interface (`src/services/execution`):

- `browser-js-runner` — runs JavaScript in an isolated Web Worker in the student's own browser
  with a hard timeout and network APIs disabled.
- `remote-runner` — placeholder for a sandbox service (Judge0, Piston, Firecracker…). Configure
  `NEXT_PUBLIC_CODE_RUNNER_URL` to enable Java/Python. Without it, Java/Python submissions are
  stored with verdict `pending`.

Students can only read **sample** test cases (RLS). Hidden tests are staff-only and are meant to
be executed by the future server-side judge. Until then, verdicts reported by the browser runner
are trusted — fine for a learning MVP, not for competitive grading.

---

## Folder structure

```
src/
  app/
    (marketing)/          /, /about
    (auth)/               /login, /forgot-password, /reset-password (no public signup)
    auth/                 email-link confirm route handler (password recovery)
    onboarding/           3-step onboarding → recommended roadmap
    (app)/                hybrid layout: app shell if signed in, marketing chrome if not
      courses/            public catalog, course page, lesson reader
      roadmaps/           public roadmaps, visual learning path
      classes/            class schedule
      (protected)/        signed-in only (and onboarded students)
        dashboard/ agenda/ attendance/ assignments/ practice/ progress/
        notes/ achievements/ class/[id]/ profile/ settings/ notifications/
    admin/                admin workspace: teaching, classes, attendance, content, users, analytics, settings
  components/
    ui/                   design-system primitives (shadcn-style)
    shared/               PageHeader, Section, StatCard, EmptyState, Markdown, badges…
    layout/               app shell, sidebar, mobile nav, ⌘K search, notification bell
    marketing/ dashboard/ agenda/ courses/ lesson/ roadmap/ classes/ attendance/
    assignments/ coding/ progress/ notes/ instructor/ admin/ charts/ onboarding/ profile/
  lib/
    supabase/             server/browser clients + session-refreshing proxy helper
    auth/                 session helpers (requireProfile, requireRole) and sign-out action
    permissions/          UI-level role helpers
    utils/                formatting
  services/               typed data access + server actions per feature, execution layer
  types/                  domain types mirroring the schema
  proxy.ts                refreshes Supabase session, redirects anonymous users from protected routes
supabase/
  migrations/             0001 schema · 0002 functions & triggers · 0003 RLS · 0004 trigger fixes ·
                          0005 two roles · 0006 admin-managed accounts · 0007 achievements · 0008 payments
  content/                optional content scripts (e.g. java-roadmap.sql)
  bootstrap-admin.sql     creates the first admin account
  reset-all-data.sql      ⚠️ wipes all users and content (keeps schema)
scripts/
  validate-db.mjs         runs migrations + content in PGlite (in-process Postgres) and checks permissions
docs/CONVENTIONS.md       engineering conventions
```

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. **Apply the migrations** — either:
   - **SQL editor**: open *SQL Editor* and run, in order,
     `supabase/migrations/20261002000001_schema.sql`, `…0002_functions.sql`, `…0003_rls.sql`,
     `…0004_trigger_fixes.sql`, `…0005_admin_student_roles.sql`,
     `…0006_admin_user_management.sql`, `…0007_achievements.sql`, `…0008_payments.sql`; or
   - **CLI**:
     ```bash
     npx supabase login
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
3. **Content (optional)**: run any script in `supabase/content/` — e.g. `java-roadmap.sql` adds a
   18-section Java Programming roadmap. Scripts are re-runnable.
4. **Auth settings** (*Authentication*):
   - *Sign In / Providers* → turn **off** "Allow new users to sign up", and leave Google and other
     OAuth providers **disabled**. Rookie has no public signup — accounts are created by admins.
   - *URL Configuration* → set Site URL to your app URL and add `http://localhost:3000/**`
     to redirect URLs (used by password-reset emails).
5. **Create the first admin**: open `supabase/bootstrap-admin.sql`, replace the placeholder
   password, and run it in the SQL editor (don't commit your real password). Log in with that
   account and add everyone else from **Admin → Users → Add user**.
6. **Realtime**: the RLS migration adds `notifications` to the `supabase_realtime` publication.

---

## Environment variables

Copy `.env.example` to `.env.local`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_…`). Safe for the browser — RLS protects data. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Legacy anon key; used only if the publishable key is unset |
| `NEXT_PUBLIC_SITE_URL` | Public URL used in auth email links |
| `NEXT_PUBLIC_CODE_RUNNER_URL` | Optional sandbox execution service for Java/Python |

No service-role key is needed: the app always acts as the signed-in user. Never commit `.env.local`.

---

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase values
npm run dev                  # http://localhost:3000
```

Checks:

```bash
npm run typecheck
npm run lint
npm run build
node scripts/validate-db.mjs   # migrations + content + permission tests in PGlite (no Docker)
```

## Deployment

Deploy to Vercel (or any Node host):

1. Import the repo, set the environment variables above.
2. Set `NEXT_PUBLIC_SITE_URL` to the production URL and add it to Supabase Auth redirect URLs.
3. Apply migrations to the production database (`npx supabase db push`), then run
   `supabase/bootstrap-admin.sql` to create your admin.

---

## Roles

There are two roles: **student** and **admin**. Admins teach *and* run the platform — they
create courses, lessons, roadmaps and problems, schedule classes, take attendance, grade
assignments, post announcements and cohort agendas, and manage users and settings. Every
`/admin/*` page requires the admin role, and every write is enforced by RLS (`is_admin()`).

| Capability | Student | Admin |
|---|:-:|:-:|
| Dashboard, agenda, roadmaps, courses, lessons, practice, progress, notes, achievements | ✓ | ✓ |
| Read own attendance / submissions / notifications | ✓ | ✓ |
| Modify attendance | ✗ | ✓ |
| Create/edit courses, modules, lessons, roadmaps, coding problems | ✗ | ✓ |
| Schedule classes, take attendance | ✗ | ✓ |
| Assignments: create, review, grade | ✗ | ✓ |
| Announcements, cohort agendas | ✗ | ✓ |
| Manage users & roles, platform settings, analytics | ✗ | ✓ |
| Record monthly student payments | ✗ | ✓ |

> The database enum still contains `instructor` for compatibility, but migration `0005`
> converts existing instructors to admins and a check constraint prevents the value from being used.

## Known limitations / next steps

- Java/Python execution needs a sandboxed judge service (see *Code execution*).
- Deadline/“class starting soon” reminders are shown in-app; time-based push reminders would need
  `pg_cron` or a scheduled function.
