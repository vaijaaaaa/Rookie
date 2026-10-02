import type { Metadata } from "next";
import Link from "next/link";
import {
  Award, Bell, BellOff, CalendarClock, CheckCheck, ClipboardCheck, ClipboardList, ClipboardPen, Megaphone, Milestone,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { formatDate, timeAgo } from "@/lib/utils/format";
import { safeLink } from "@/lib/utils/links";
import type { Notification, NotificationType } from "@/types";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

export const metadata: Metadata = { title: "Notifications" };

const PAGE_SIZE = 30;

const ICONS: Record<NotificationType, LucideIcon> = {
  class_upcoming: CalendarClock,
  assignment_new: ClipboardList,
  assignment_due: ClipboardPen,
  assignment_reviewed: ClipboardCheck,
  announcement: Megaphone,
  achievement: Award,
  roadmap_milestone: Milestone,
  system: Bell,
};

function href(filter: "all" | "unread", page: number) {
  const params = new URLSearchParams();
  if (filter === "unread") params.set("filter", "unread");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return `/notifications${qs ? `?${qs}` : ""}`;
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const filter: "all" | "unread" = sp.filter === "unread" ? "unread" : "all";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const profile = await requireProfile();
  const supabase = await createClient();

  let listQuery = supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at", { count: "exact" })
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (filter === "unread") listQuery = listQuery.is("read_at", null);

  const [listRes, unreadRes] = await Promise.all([
    listQuery.overrideTypes<Omit<Notification, "user_id">[], { merge: false }>(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .is("read_at", null),
  ]);

  const items = listRes.data ?? [];
  const total = listRes.count ?? 0;
  const unread = unreadRes.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "You're all caught up."}
        actions={
          unread > 0 ? (
            <form action={markAllNotificationsRead}>
              <SubmitButton variant="outline" size="sm" pendingLabel="Marking…">
                <CheckCheck /> Mark all read
              </SubmitButton>
            </form>
          ) : null
        }
      />

      <nav aria-label="Filter notifications" className="mb-4 inline-flex rounded-lg bg-muted p-1 text-sm">
        {(["all", "unread"] as const).map((f) => (
          <Link
            key={f}
            href={href(f, 1)}
            aria-current={filter === f ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition-colors",
              filter === f ? "bg-background text-foreground shadow-sm dark:bg-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f === "all" ? "All" : "Unread"}
            {f === "unread" && unread > 0 ? (
              <span className="ml-1.5 rounded bg-brand/15 px-1 font-mono text-[11px] text-brand tabular-nums">{unread}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          icon={filter === "unread" ? CheckCheck : BellOff}
          title={filter === "unread" ? "No unread notifications" : page > 1 ? "Nothing on this page" : "No notifications yet"}
          description={
            filter === "unread"
              ? "You've read everything. Nice."
              : "Class reminders, new assignments, reviews and achievements will show up here."
          }
          action={
            page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={href(filter, 1)}>Back to first page</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const link = safeLink(n.link);
            const isUnread = !n.read_at;
            return (
              <li key={n.id} className={cn("flex gap-3 p-4", isUnread && "bg-brand/[0.03]")}>
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                    isUnread ? "border-brand/30 text-brand" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className={cn("text-sm", isUnread ? "font-semibold" : "font-medium")}>
                      {isUnread ? <span className="sr-only">Unread: </span> : null}
                      {link ? (
                        <Link href={link} className="underline-offset-4 hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                    <time
                      dateTime={n.created_at}
                      title={formatDate(n.created_at, "PPpp")}
                      className="shrink-0 font-mono text-[11px] text-muted-foreground"
                    >
                      {timeAgo(n.created_at)}
                    </time>
                  </div>
                  {n.body ? <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p> : null}
                  {isUnread ? (
                    <form action={markNotificationRead} className="mt-2">
                      <input type="hidden" name="id" value={n.id} />
                      <SubmitButton variant="ghost" size="sm" className="-ml-2 h-7 text-xs text-muted-foreground">
                        Mark as read
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <nav aria-label="Pagination" className="mt-4 flex items-center justify-between">
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(filter, page - 1)} rel="prev">
                Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}
          <p className="font-mono text-xs text-muted-foreground">
            page {page} / {pageCount}
          </p>
          {page < pageCount ? (
            <Button asChild variant="outline" size="sm">
              <Link href={href(filter, page + 1)} rel="next">
                Next
              </Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
