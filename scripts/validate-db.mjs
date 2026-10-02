#!/usr/bin/env node
// Validates supabase/migrations/*.sql + supabase/seed.sql against an in-process
// Postgres (PGlite) — no Docker needed.  Usage: node scripts/validate-db.mjs
//
// A minimal stand-in for Supabase's `auth` schema, roles and `extensions`
// schema is created first, so the migrations and the seed run unmodified.
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'supabase', 'migrations');
const seedPath = join(root, 'supabase', 'seed.sql');
const seedOnly = process.argv.includes('--no-seed') ? false : true;
const runSeedTwice = process.argv.includes('--twice');

const STUB = `
set timezone = 'UTC';
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
create schema if not exists extensions;
create schema if not exists auth;

create table auth.users (
  instance_id uuid,
  id uuid primary key,
  aud varchar(255),
  role varchar(255),
  email varchar(255),
  encrypted_password varchar(255),
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token varchar(255),
  recovery_sent_at timestamptz,
  email_change_token_new varchar(255),
  email_change varchar(255),
  email_change_sent_at timestamptz,
  email_change_token_current varchar(255) default '',
  email_change_confirm_status smallint default 0,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz,
  updated_at timestamptz,
  phone text unique default null,
  phone_confirmed_at timestamptz,
  phone_change text default '',
  phone_change_token varchar(255) default '',
  reauthentication_token varchar(255) default '',
  is_sso_user boolean not null default false,
  is_anonymous boolean not null default false,
  deleted_at timestamptz
);

create table auth.identities (
  provider_id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  identity_data jsonb not null,
  provider text not null,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  email text generated always as (lower(identity_data ->> 'email')) stored,
  id uuid primary key default gen_random_uuid(),
  unique (provider_id, provider)
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '')
$$;
`;

const db = await PGlite.create({ extensions: { pgcrypto } });

async function run(label, sql) {
  const t = Date.now();
  try {
    await db.exec(sql);
    console.log(`ok   ${label} (${Date.now() - t} ms)`);
  } catch (e) {
    console.error(`FAIL ${label}: ${e.message}`);
    if (e.position) {
      const pos = Number(e.position);
      const before = sql.slice(0, pos);
      const line = before.split('\n').length;
      console.error(`     at line ${line}: ${sql.split('\n')[line - 1]?.trim()}`);
    }
    if (e.where) console.error(`     where: ${e.where}`);
    if (e.detail) console.error(`     detail: ${e.detail}`);
    process.exit(1);
  }
}

await run('auth/roles/extensions stub', STUB);
for (const f of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
  await run(`migration ${f}`, readFileSync(join(migrationsDir, f), 'utf8'));
}
if (!seedOnly) process.exit(0);

const seed = readFileSync(seedPath, 'utf8');
await run('seed.sql', seed);
if (runSeedTwice) await run('seed.sql (re-run)', seed);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const tables = [
  'auth.users', 'auth.identities', 'profiles', 'courses', 'course_modules', 'lessons', 'lesson_resources',
  'course_enrollments', 'student_progress', 'roadmaps', 'roadmap_nodes', 'roadmap_enrollments',
  'roadmap_node_progress', 'classes', 'attendance', 'assignments', 'assignment_submissions',
  'coding_problems', 'coding_problem_test_cases', 'coding_submissions', 'daily_agendas',
  'agenda_items', 'agenda_item_progress', 'notes', 'announcements', 'notifications',
  'achievements', 'user_achievements', 'activity_logs', 'platform_settings',
];
console.log('\nRow counts');
for (const t of tables) {
  const name = t.includes('.') ? t : `public.${t}`;
  const { rows } = await db.query(`select count(*)::int as n from ${name}`);
  console.log(`  ${t.padEnd(28)} ${rows[0].n}`);
}

const { rows: [vaiju] } = await db.query(`select id, full_name, role, learning_goal, primary_roadmap_id from public.profiles where email = 'student@rookie.dev'`);
if (vaiju) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${vaiju.id}', false)`);
  const { rows: streak } = await db.query(`select * from public.user_streak(auth.uid())`);
  const { rows: [stats] } = await db.query(`select public.get_my_stats() as s`);
  const { rows: days } = await db.query(`select day::text, count from public.get_my_activity(14)`);
  const { rows: ach } = await db.query(`select a.code from public.user_achievements ua join public.achievements a on a.id = ua.achievement_id where ua.user_id = auth.uid() order by a.position`);
  const { rows: courses } = await db.query(`select c.title, p.completed_lessons, p.total_lessons, p.percent from public.get_course_progress() p join public.courses c on c.id = p.course_id where p.completed_lessons > 0 order by c.position`);
  const { rows: rms } = await db.query(`select r.title, p.completed_topics, p.total_topics, p.percent from public.get_roadmaps_progress() p join public.roadmaps r on r.id = p.roadmap_id order by r.title`);
  const { rows: [notif] } = await db.query(`select count(*)::int total, count(*) filter (where read_at is null)::int unread from public.notifications where user_id = auth.uid()`);
  await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  console.log(`\nVaiju (${vaiju.id}) role=${vaiju.role} goal=${vaiju.learning_goal}`);
  console.log('  user_streak:', JSON.stringify(streak[0]));
  console.log('  get_my_stats:', JSON.stringify(stats.s, null, 2).replace(/\n/g, '\n  '));
  console.log('  activity last 14d:', days.map((d) => `${d.day}:${d.count}`).join(' '));
  console.log('  achievements:', ach.map((a) => a.code).join(', '));
  console.log('  course progress:', courses.map((c) => `${c.title} ${c.completed_lessons}/${c.total_lessons}`).join('; '));
  console.log('  roadmap progress:', rms.map((r) => `${r.title} ${r.completed_topics}/${r.total_topics}`).join('; '));
  console.log('  notifications:', JSON.stringify(notif));
}

const { rows: [admin] } = await db.query(`select id from public.profiles where email = 'admin@rookie.dev'`);
if (admin) {
  await db.exec(`select set_config('request.jwt.claim.sub', '${admin.id}', false)`);
  const { rows: [ps] } = await db.query(`select public.get_platform_stats() as s`);
  await db.exec(`select set_config('request.jwt.claim.sub', '', false)`);
  const s = ps.s;
  console.log('\nPlatform stats (admin):');
  for (const k of ['total_students', 'total_instructors', 'active_courses', 'classes_this_week', 'avg_attendance', 'assignments_completed', 'active_users_7d']) {
    console.log(`  ${k}: ${s[k]}`);
  }
  console.log('  student_growth:', s.student_growth.map((w) => `${w.week}:${w.count}`).join(' '));
}
console.log('\nAll good.');
await db.close();
