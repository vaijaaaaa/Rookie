import Link from "next/link";
import { Map as MapIcon, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { LABELS } from "@/lib/utils/format";
import type { Roadmap } from "@/types";
import { deleteRoadmap } from "./actions";

export const metadata = { title: "Roadmaps" };

type Row = Pick<Roadmap, "id" | "title" | "slug" | "difficulty" | "estimated_weeks" | "goal" | "is_published"> & {
  roadmap_nodes: { count: number }[];
  roadmap_enrollments: { count: number }[];
};

export default async function RoadmapsPage() {
  const ctx = await requireStaff();
  let q = ctx.supabase
    .from("roadmaps")
    .select("id, title, slug, difficulty, estimated_weeks, goal, is_published, roadmap_nodes(count), roadmap_enrollments(count)")
    .order("created_at", { ascending: false });
  if (!ctx.isAdmin) q = q.eq("created_by", ctx.profile.id);
  const { data } = await q.overrideTypes<Row[], { merge: false }>();
  const roadmaps = data ?? [];

  const newButton = (
    <Button asChild variant="brand">
      <Link href="/admin/roadmaps/new">
        <Plus /> New roadmap
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Content" title="Roadmaps" description="Structured learning paths of sections and topics." actions={newButton} />
      {roadmaps.length === 0 ? (
        <EmptyState icon={MapIcon} title="No roadmaps yet" description="Build a path that links your courses and lessons." action={newButton} />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Roadmap</TableHead>
                <TableHead className="hidden md:table-cell">Level</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Weeks</TableHead>
                <TableHead className="text-right">Nodes</TableHead>
                <TableHead className="text-right">Learners</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {roadmaps.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="max-w-80">
                    <Link href={`/admin/roadmaps/${r.id}`} className="block truncate font-medium hover:underline">
                      {r.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{r.goal ? LABELS.learning_goal[r.goal] : "General"}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <DifficultyBadge value={r.difficulty} />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">{r.estimated_weeks}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{r.roadmap_nodes[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">{r.roadmap_enrollments[0]?.count ?? 0}</TableCell>
                  <TableCell>{r.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit roadmap">
                        <Link href={`/admin/roadmaps/${r.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmAction
                        action={deleteRoadmap.bind(null, r.id)}
                        title={`Delete "${r.title}"?`}
                        description="All sections, topics and learner progress on this roadmap are deleted."
                        successMessage="Roadmap deleted"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
