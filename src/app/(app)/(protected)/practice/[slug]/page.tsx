import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/shared/markdown";
import { Workspace } from "@/components/coding/workspace";
import { QuickNote } from "@/components/notes/quick-note";
import { requireProfile } from "@/lib/auth/session";
import { getNotesFor } from "@/services/notes";
import { createSubmission, getMySubmissions, getProblemBySlug, getSampleTests, hasSolvedProblem } from "@/services/practice";
import type { CodingProblem } from "@/types";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const problem = await getProblemBySlug(slug);
  if (!problem) return { title: "Problem not found" };
  return {
    title: `${problem.title} · Practice`,
    description: `${problem.difficulty[0]!.toUpperCase()}${problem.difficulty.slice(1)} ${problem.topic} problem on Rookie.`,
  };
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{children}</h2>;
}

function Description({ problem }: { problem: CodingProblem }) {
  return (
    <article className="space-y-6">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{problem.topic}</Badge>
      </div>

      {problem.description.trim() ? (
        <Markdown>{problem.description}</Markdown>
      ) : (
        <p className="text-sm text-muted-foreground">No description provided.</p>
      )}

      {problem.examples.length > 0 ? (
        <section className="space-y-3">
          {problem.examples.map((ex, i) => (
            <div key={i}>
              <Eyebrow>Example {i + 1}</Eyebrow>
              <div className="rounded-md border bg-muted/40 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed">
                <p className="break-all whitespace-pre-wrap">
                  <span className="text-muted-foreground">Input: </span>
                  {ex.input}
                </p>
                <p className="break-all whitespace-pre-wrap">
                  <span className="text-muted-foreground">Output: </span>
                  {ex.output}
                </p>
                {ex.explanation ? (
                  <p className="mt-1 font-sans text-[13px] whitespace-pre-wrap text-muted-foreground">
                    <span className="font-mono text-[12.5px]">Explanation: </span>
                    {ex.explanation}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {problem.input_format.trim() ? (
        <section>
          <Eyebrow>Input format</Eyebrow>
          <Markdown className="text-sm">{problem.input_format}</Markdown>
        </section>
      ) : null}

      {problem.output_format.trim() ? (
        <section>
          <Eyebrow>Output format</Eyebrow>
          <Markdown className="text-sm">{problem.output_format}</Markdown>
        </section>
      ) : null}

      {problem.constraints.length > 0 ? (
        <section>
          <Eyebrow>Constraints</Eyebrow>
          <ul className="space-y-1.5">
            {problem.constraints.map((c, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12.5px]">{c}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {problem.tags.length > 0 ? (
        <section>
          <Eyebrow>Tags</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {problem.tags.map((t) => (
              <Badge key={t} variant="outline" className="font-mono text-[11px] font-normal">
                {t}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}

      <p className="border-t pt-4 font-mono text-[11px] text-muted-foreground">
        Implement <span className="text-foreground">{problem.function_name}</span>. Tests call it with the inputs
        above and compare the returned value as JSON.
      </p>
    </article>
  );
}

export default async function ProblemPage({ params }: Props) {
  const { slug } = await params;
  const profile = await requireProfile();
  const problem = await getProblemBySlug(slug);
  if (!problem) notFound();

  const [tests, submissions, notes, solved] = await Promise.all([
    getSampleTests(problem.id),
    getMySubmissions(problem.id, profile.id),
    getNotesFor({ problem_id: problem.id }),
    hasSolvedProblem(problem.id, profile.id),
  ]);

  return (
    <Workspace
      key={problem.id}
      problem={{
        id: problem.id,
        slug: problem.slug,
        title: problem.title,
        difficulty: problem.difficulty,
        topic: problem.topic,
        function_name: problem.function_name,
        starter_code: problem.starter_code,
      }}
      sampleTests={tests.map((t) => ({ id: t.id, input: t.input, expected: t.expected_output }))}
      initiallySolved={solved}
      initialSubmissions={submissions}
      description={<Description problem={problem} />}
      solution={problem.solution_explanation.trim() ? <Markdown>{problem.solution_explanation}</Markdown> : null}
      notes={<QuickNote attach={{ problem_id: problem.id }} initialNotes={notes} />}
      submitAction={createSubmission}
    />
  );
}
