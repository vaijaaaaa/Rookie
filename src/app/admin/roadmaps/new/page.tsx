import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { RoadmapForm } from "@/components/instructor/roadmap-form";
import { requireStaff } from "@/services/instructor/context";

export const metadata = { title: "New roadmap" };

export default async function NewRoadmapPage() {
  await requireStaff();
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/roadmaps">
          <ArrowLeft /> Roadmaps
        </Link>
      </Button>
      <PageHeader eyebrow="New" title="Create a roadmap" description="Add sections and topics after creating it." />
      <RoadmapForm initial={null} />
    </div>
  );
}
