import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ProblemForm } from "@/components/instructor/problem-form";
import { requireStaff } from "@/services/instructor/context";
import { getProblemTopics } from "../topics";

export const metadata = { title: "New problem" };

export default async function NewProblemPage() {
  const ctx = await requireStaff();
  const topics = await getProblemTopics(ctx);
  return (
    <div className="mx-auto max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/instructor/problems">
          <ArrowLeft /> Problems
        </Link>
      </Button>
      <PageHeader eyebrow="New" title="Create a coding problem" description="Add test cases after creating it." />
      <ProblemForm initial={null} topics={topics} />
    </div>
  );
}
