import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoadmapForm } from "@/components/instructor/roadmap-form";
import { RoadmapNodesEditor } from "@/components/instructor/roadmap-nodes";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { getManagedRoadmap, getRoadmapTree } from "@/services/instructor/roadmaps";
import { getLessonOptions } from "@/services/instructor/scope";
import { deleteRoadmap } from "../actions";

export const metadata = { title: "Edit roadmap" };

export default async function RoadmapEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const roadmap = await getManagedRoadmap(ctx, id);
  if (!roadmap) notFound();
  const [sections, coursesRes, lessons] = await Promise.all([
    getRoadmapTree(ctx, roadmap.id),
    // Any visible course may be linked (published or managed by me).
    ctx.supabase.from("courses").select("id, title").order("title").overrideTypes<{ id: string; title: string }[], { merge: false }>(),
    getLessonOptions(ctx),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/instructor/roadmaps">
          <ArrowLeft /> Roadmaps
        </Link>
      </Button>
      <PageHeader
        eyebrow={<span className="font-mono">/roadmaps/{roadmap.slug}</span>}
        title={
          <span className="flex items-center gap-2">
            {roadmap.title}
            {roadmap.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}
          </span>
        }
        actions={
          <>
            {roadmap.is_published ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/roadmaps/${roadmap.slug}`}>
                  <ExternalLink /> View
                </Link>
              </Button>
            ) : null}
            <ConfirmAction
              action={deleteRoadmap.bind(null, roadmap.id)}
              title="Delete this roadmap?"
              description="All sections, topics and learner progress on this roadmap are deleted."
              successMessage="Roadmap deleted"
              redirectTo="/instructor/roadmaps"
              trigger={
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 /> Delete
                </Button>
              }
            />
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <RoadmapForm initial={roadmap} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <RoadmapNodesEditor roadmapId={roadmap.id} sections={sections} courses={coursesRes.data ?? []} lessons={lessons} />
        </div>
      </div>
    </div>
  );
}
