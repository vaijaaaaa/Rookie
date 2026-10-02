# Engineering conventions (Rookie)

Stack: Next.js 16 App Router (proxy.ts, not middleware), React 19, TypeScript strict, Tailwind v4,
shadcn-style UI in `src/components/ui`, Supabase via `@supabase/ssr`.

## Data access
- Server Components / Server Actions: `import { createClient } from "@/lib/supabase/server"` (async).
- Client Components: `import { createClient } from "@/lib/supabase/client"`.
- The client is untyped. Type table queries with `.overrideTypes<T[], { merge: false }>()` for arrays and
  `.single<T>()` / `.maybeSingle<T>()` for one row. Domain types live in `src/types/index.ts`.
  **RPC calls**: do NOT use overrideTypes on `.rpc()` (untyped RPCs resolve to a single object). Cast instead: `const rows = (data ?? []) as CourseProgressRow[]`.
- Auth: `requireProfile()`, `requireRole([...])`, `getProfile()` from `@/lib/auth/session`.
- **All authorization is enforced by Postgres RLS** (`supabase/migrations/*_rls.sql`). Still check
  role in server actions for good error messages.
- Mutations = Server Actions in `actions.ts` files next to the route (or `src/services/<area>.ts`),
  validated with Zod, returning `ActionResult` from `@/types`, then `revalidatePath(...)`.
- Do not fetch whole tables for dashboards: select only needed columns, use `limit`, `count: "exact", head: true`.
- Progress/stats come from RPCs: `get_course_progress`, `get_roadmaps_progress`, `get_roadmap_progress(p_roadmap_id)`,
  `get_my_stats`, `get_my_activity(p_days)`, `get_topic_progress`, `user_streak(p_user)`,
  `enroll_in_roadmap(p_roadmap_id, p_make_primary)`, `enroll_in_course(p_course_id)`,
  `complete_onboarding(p_goal, p_experience, p_interests)`, `admin_set_role(p_user, p_role)`,
  `get_platform_stats`, `get_instructor_stats`, `get_student_overview`, `search_content(p_query)`.
- Activity logs / achievements / notifications are written by DB triggers. Never insert into
  `activity_logs` or `user_achievements` from the app.
- No hardcoded numbers in UI — everything derives from DB rows.

## Next.js 16 specifics
- `params` and `searchParams` are Promises: `{ params }: { params: Promise<{ slug: string }> }` then `await params`.
- `cookies()`/`headers()` are async.

## UI
- Dark-first, neutral, one accent: `brand` (text-brand, bg-brand, variant="brand").
- Monospace eyebrow labels: `font-mono text-[11px] uppercase tracking-wider text-muted-foreground`.
- Reuse: `PageHeader`, `Section`, `StatCard`, `EmptyState`, `Markdown`, `SubmitButton`,
  `DifficultyBadge`, `StatusBadge` from `src/components/shared`.
- UI primitives: button, card, badge, input, textarea, label, native-select, progress, skeleton,
  separator, avatar (UserAvatar), checkbox, switch, tabs, dialog, sheet, dropdown-menu, popover,
  tooltip, command, table, sonner (`import { toast } from "sonner"`).
- Every list has an empty state; every route segment with data has `loading.tsx` using Skeleton.
- Client Components only where interactivity requires it. Keep them small, pass data from server.
- Dense but readable; subtle borders (`border`, `bg-card`), `rounded-lg` max. No big gradients.
- Mobile: layouts collapse to one column; bottom nav is provided by the shell (content has pb-24).
