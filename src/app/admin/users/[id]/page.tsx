import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, ArrowLeft, BookOpen, CalendarCheck } from "lucide-react";
import { RoleBadge } from "@/components/admin/role-badge";
import { RoleMenu } from "@/components/admin/role-menu";
import { UserAccountActions } from "@/components/admin/user-account-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Section } from "@/components/shared/section";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { requireRole } from "@/lib/auth/session";
import { percent } from "@/lib/utils";
import { LABELS, formatDate, timeAgo } from "@/lib/utils/format";
import { ACTIVITY_LABELS, ACTIVITY_TYPES, getUserDetail } from "@/services/admin";
import { getStudentPayments } from "@/services/payments";
import { PaymentDialog } from "@/components/admin/payment-dialog";
import { formatMoney, METHOD_LABEL, monthToPeriod, periodLabel } from "@/lib/utils/money";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: UUID_RE.test(id) ? "User" : "Not found" };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-right text-sm">{children}</dd>
    </div>
  );
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(["admin"]);
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const detail = await getUserDetail(id);
  if (!detail) notFound();
  const { profile, enrollments, attendance, activityCounts, recentActivity } = detail;

  const attended = attendance.present + attendance.late;
  const counted = attended + attendance.absent;
  const attendanceRate = percent(attended, counted);
  const isSelf = profile.id === me.id;
  const { payments, total: paidTotal } =
    profile.role === "student" ? await getStudentPayments(profile.id) : { payments: [], total: 0 };
  const thisMonth = monthToPeriod(undefined).slice(0, 7);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link href="/admin/users">
          <ArrowLeft /> Users
        </Link>
      </Button>

      <PageHeader
        eyebrow="User"
        title={
          <span className="flex items-center gap-3">
            <UserAvatar name={profile.full_name} src={profile.avatar_url} className="size-10" />
            <span className="min-w-0 truncate">{profile.full_name || "Unnamed"}</span>
            <RoleBadge role={profile.role} />
          </span>
        }
        description={profile.email ?? undefined}
        actions={
          <>
            <RoleMenu
              userId={profile.id}
              userName={profile.full_name || profile.email || "This user"}
              role={profile.role}
              isSelf={isSelf}
              size="default"
            />
            <UserAccountActions
              userId={profile.id}
              userName={profile.full_name || profile.email || "this user"}
              isSelf={isSelf}
            />
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Lessons" value={activityCounts.lesson_completed} hint="Completed" icon={BookOpen} />
        <StatCard label="Problems" value={activityCounts.problem_solved} hint="Solved" />
        <StatCard
          label="Attendance"
          value={counted > 0 ? `${attendanceRate}%` : "—"}
          hint={counted > 0 ? `${attended} of ${counted} classes` : "No classes marked"}
          icon={CalendarCheck}
        />
        <StatCard label="Assignments" value={activityCounts.assignment_submitted} hint="Submitted" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="space-y-4">
          <Section title="Profile">
            <dl className="divide-y">
              <Field label="Username">{profile.username ? `@${profile.username}` : "—"}</Field>
              <Field label="Joined">{formatDate(profile.created_at)}</Field>
              <Field label="Onboarded">
                {profile.onboarded_at ? formatDate(profile.onboarded_at) : <span className="text-muted-foreground">Pending</span>}
              </Field>
              <Field label="Goal">{profile.learning_goal ? LABELS.learning_goal[profile.learning_goal] : "—"}</Field>
              <Field label="Experience">{profile.experience ? LABELS.experience[profile.experience] : "—"}</Field>
              <Field label="Timezone">
                <span className="font-mono text-xs">{profile.timezone}</span>
              </Field>
            </dl>
            {profile.interests.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1">
                {profile.interests.map((i) => (
                  <Badge key={i} variant="outline">
                    {i}
                  </Badge>
                ))}
              </div>
            ) : null}
            {profile.bio ? <p className="mt-3 text-sm text-muted-foreground">{profile.bio}</p> : null}
          </Section>

          <Section title="Activity totals">
            <dl className="divide-y">
              {ACTIVITY_TYPES.map((t) => (
                <Field key={t} label={ACTIVITY_LABELS[t]}>
                  <span className="font-mono tabular-nums">{activityCounts[t] ?? 0}</span>
                </Field>
              ))}
            </dl>
          </Section>

          <Section title="Attendance">
            {counted + attendance.excused === 0 ? (
              <p className="text-sm text-muted-foreground">No attendance has been marked for this user.</p>
            ) : (
              <dl className="grid grid-cols-4 gap-2 text-center">
                {(["present", "late", "absent", "excused"] as const).map((s) => (
                  <div key={s} className="rounded-md border px-2 py-2">
                    <dd className="text-lg font-semibold tabular-nums">{attendance[s]}</dd>
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{s}</dt>
                  </div>
                ))}
              </dl>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title={`Enrolled courses · ${enrollments.length}`} contentClassName="p-0">
            {enrollments.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={BookOpen} title="Not enrolled in any course" />
              </div>
            ) : (
              <ul className="divide-y">
                {enrollments.map((e) => {
                  const pct = percent(e.completed, e.total);
                  return (
                    <li key={e.course_id} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                          {e.completed}/{e.total} · {pct}%
                        </span>
                      </div>
                      <Progress value={pct} className="mt-2 h-1.5" />
                      <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">
                        Enrolled {formatDate(e.enrolled_at)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>

          <Section title="Recent activity" contentClassName="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={Activity} title="No activity yet" description="Completed lessons, problems and classes show up here." />
              </div>
            ) : (
              <ul className="divide-y">
                {recentActivity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-brand" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{a.title || ACTIVITY_LABELS[a.type]}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{ACTIVITY_LABELS[a.type]}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{timeAgo(a.occurred_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {profile.role === "student" ? (
        <Section
          title={`Payments · ${formatMoney(paidTotal)} total`}
          contentClassName="p-0"
          action={
            <PaymentDialog
              students={[{ id: profile.id, name: profile.full_name || profile.email || "Student" }]}
              defaultStudentId={profile.id}
              defaultMonth={thisMonth}
              defaultAmount={payments[0]?.amount}
              trigger="row"
            />
          }
        >
          {payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="divide-y">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="font-medium">{periodLabel(p.period)}</span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {METHOD_LABEL[p.method]} · paid {p.paid_on}{p.reference ? ` · ${p.reference}` : ""}
                  </span>
                  <span className="font-mono tabular-nums">{formatMoney(p.amount, p.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      ) : null}
    </div>
  );
}
