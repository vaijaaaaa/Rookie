import { Megaphone, Pin } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { AnnouncementDialog } from "@/components/instructor/announcement-form";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { LocalTime } from "@/components/instructor/local-time";
import { requireStaff } from "@/services/instructor/context";
import { getCourseOptions } from "@/services/instructor/scope";
import type { Announcement } from "@/types";
import { deleteAnnouncement } from "./actions";

export const metadata = { title: "Announcements" };

type Row = Announcement & {
  courses: { title: string } | null;
  profiles: { full_name: string } | null;
};

export default async function AnnouncementsPage() {
  const ctx = await requireStaff();
  const [{ data }, courses] = await Promise.all([
    ctx.supabase
      .from("announcements")
      .select("*, courses(title), profiles!announcements_author_id_fkey(full_name)")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100)
      .overrideTypes<Row[], { merge: false }>(),
    getCourseOptions(ctx),
  ]);
  const items = data ?? [];
  const canEdit = (a: Row) => ctx.isAdmin || a.author_id === ctx.profile.id;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Communication"
        title="Announcements"
        description="Shown on student dashboards and pushed to their notification center."
        actions={<AnnouncementDialog courses={courses} />}
      />
      {items.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Let students know about schedule changes, new assignments and more." />
      ) : (
        <ul className="space-y-3">
          {items.map((a) => (
            <li key={a.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned ? <Pin className="size-3.5 text-brand" aria-label="Pinned" /> : null}
                    <h2 className="font-medium">{a.title}</h2>
                    <Badge variant="outline">{a.courses?.title ?? "Everyone"}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm whitespace-pre-line text-muted-foreground">{a.body}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    {a.profiles?.full_name ?? "Unknown"} · <LocalTime value={a.created_at} format="relative" />
                  </p>
                </div>
                {canEdit(a) ? (
                  <div className="flex shrink-0 gap-1">
                    <AnnouncementDialog initial={a} courses={courses} />
                    <ConfirmAction
                      action={deleteAnnouncement.bind(null, a.id)}
                      title="Delete this announcement?"
                      successMessage="Announcement deleted"
                    />
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
