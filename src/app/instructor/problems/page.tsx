import Link from "next/link";
import { Code2, Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmAction } from "@/components/instructor/confirm-action";
import { SearchForm } from "@/components/instructor/search-form";
import { requireStaff } from "@/services/instructor/context";
import type { CodingProblem } from "@/types";
import { deleteProblem } from "./actions";

export const metadata = { title: "Coding problems" };

type Row = Pick<CodingProblem, "id" | "slug" | "title" | "difficulty" | "topic" | "tags" | "is_published"> & {
  coding_problem_test_cases: { count: number }[];
  coding_submissions: { count: number }[];
};

export default async function ProblemsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ctx = await requireStaff();
  let query = ctx.supabase
    .from("coding_problems")
    .select("id, slug, title, difficulty, topic, tags, is_published, coding_problem_test_cases(count), coding_submissions(count)")
    .order("topic")
    .order("title")
    .limit(200);
  if (!ctx.isAdmin) query = query.eq("created_by", ctx.profile.id);
  const term = q?.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`title.ilike.%${term}%,topic.ilike.%${term}%`);
  const { data } = await query.overrideTypes<Row[], { merge: false }>();
  const problems = data ?? [];

  const newButton = (
    <Button asChild variant="brand">
      <Link href="/instructor/problems/new">
        <Plus /> New problem
      </Link>
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Content" title="Coding problems" description="Practice problems, starter code and test cases." actions={newButton} />
      <div className="mb-4">
        <SearchForm placeholder="Search by title or topic…" defaultValue={q ?? ""} />
      </div>
      {problems.length === 0 ? (
        <EmptyState
          icon={Code2}
          title={term ? "No matching problems" : "No problems yet"}
          description={term ? "Try a different search." : "Create a function-based problem with sample and hidden tests."}
          action={term ? undefined : newButton}
        />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Problem</TableHead>
                <TableHead className="hidden md:table-cell">Topic</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Tests</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Submissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-0" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {problems.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-80">
                    <Link href={`/instructor/problems/${p.id}`} className="block truncate font-medium hover:underline">
                      {p.title}
                    </Link>
                    <p className="truncate font-mono text-xs text-muted-foreground">{p.tags.join(" · ") || p.slug}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{p.topic}</TableCell>
                  <TableCell>
                    <DifficultyBadge value={p.difficulty} />
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                    {p.coding_problem_test_cases[0]?.count ?? 0}
                  </TableCell>
                  <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                    {p.coding_submissions[0]?.count ?? 0}
                  </TableCell>
                  <TableCell>{p.is_published ? <Badge variant="success">Published</Badge> : <Badge variant="outline">Draft</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button asChild variant="ghost" size="icon-sm" aria-label="Edit problem">
                        <Link href={`/instructor/problems/${p.id}`}>
                          <Pencil />
                        </Link>
                      </Button>
                      <ConfirmAction
                        action={deleteProblem.bind(null, p.id)}
                        title={`Delete "${p.title}"?`}
                        description="Test cases and every student submission for this problem are deleted."
                        successMessage="Problem deleted"
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
