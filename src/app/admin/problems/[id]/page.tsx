import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProblemForm } from "@/components/instructor/problem-form";
import { TestCasesEditor } from "@/components/instructor/test-cases";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { requireStaff } from "@/services/instructor/context";
import { getManagedProblem } from "@/services/instructor/problems";
import type { TestCase } from "@/types";
import { deleteProblem } from "../actions";
import { getProblemTopics } from "../topics";

export const metadata = { title: "Edit problem" };

export default async function ProblemEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireStaff();
  const problem = await getManagedProblem(ctx, id);
  if (!problem) notFound();
  const [topics, testsRes] = await Promise.all([
    getProblemTopics(ctx),
    ctx.supabase
      .from("coding_problem_test_cases")
      .select("*")
      .eq("problem_id", problem.id)
      .order("position")
      .overrideTypes<TestCase[], { merge: false }>(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
        <Link href="/admin/problems">
          <ArrowLeft /> Problems
        </Link>
      </Button>
      <PageHeader
        eyebrow={<span className="font-mono">/practice/{problem.slug}</span>}
        title={
          <span className="flex items-center gap-2">
            {problem.title}
            {problem.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}
          </span>
        }
        actions={
          <>
            {problem.is_published ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/practice/${problem.slug}`}>
                  <ExternalLink /> Open workspace
                </Link>
              </Button>
            ) : null}
            <ConfirmAction
              action={deleteProblem.bind(null, problem.id)}
              title="Delete this problem?"
              description="Test cases and every student submission for this problem are deleted."
              successMessage="Problem deleted"
              redirectTo="/admin/problems"
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
        <ProblemForm initial={problem} topics={topics} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <TestCasesEditor problemId={problem.id} testCases={testsRes.data ?? []} />
        </div>
      </div>
    </div>
  );
}
