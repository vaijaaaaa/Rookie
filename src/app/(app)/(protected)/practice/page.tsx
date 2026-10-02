import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Code2, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { ProblemFilters } from "@/components/coding/problem-filters";
import { ProblemStatusIcon } from "@/components/coding/problem-status-icon";
import { requireProfile } from "@/lib/auth/session";
import { cn, percent } from "@/lib/utils";
import {
  DIFFICULTIES,
  getPracticeCatalog,
  getTopicProgress,
  listProblems,
  PROBLEMS_PAGE_SIZE,
  STATUS_FILTERS,
  type ProblemListParams,
  type StatusFilter,
} from "@/services/practice";
import type { ProblemDifficulty } from "@/types";

export const metadata: Metadata = {
  title: "Practice",
  description: "Coding problems by topic and difficulty — solve them in the browser.",
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

function parseParams(sp: SearchParams): ProblemListParams {
  const difficulty = one(sp.difficulty);
  const status = one(sp.status);
  const page = Number(one(sp.page) ?? 1);
  return {
    q: one(sp.q)?.slice(0, 100),
    difficulty: DIFFICULTIES.includes(difficulty as ProblemDifficulty) ? (difficulty as ProblemDifficulty) : undefined,
    topic: one(sp.topic),
    tag: one(sp.tag),
    status: STATUS_FILTERS.includes(status as StatusFilter) ? (status as StatusFilter) : undefined,
    page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
  };
}

function hrefWith(params: ProblemListParams, patch: Partial<Record<keyof ProblemListParams, string | number | undefined>>) {
  const merged = { ...params, ...patch };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v === undefined || v === "" || (k === "page" && Number(v) <= 1)) continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `/practice?${s}` : "/practice";
}

const DIFF_BAR: Record<ProblemDifficulty, string> = {
  easy: "bg-success",
  medium: "bg-warning",
  hard: "bg-destructive",
};

export default async function PracticePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const profile = await requireProfile();
  const params = parseParams(await searchParams);

  const [catalog, topics, list] = await Promise.all([
    getPracticeCatalog(profile.id),
    getTopicProgress(),
    listProblems(profile.id, params),
  ]);

  const filtered = Boolean(
    params.q || params.difficulty || params.topic || params.tag || params.status || (params.page ?? 1) > 1,
  );
  const from = list.count === 0 ? 0 : (list.page - 1) * PROBLEMS_PAGE_SIZE + 1;
  const to = (list.page - 1) * PROBLEMS_PAGE_SIZE + list.rows.length;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Practice"
        title="Problems"
        description="Function-style coding problems. Write, run and submit right in your browser."
      />

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Solved</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
            {catalog.solved}
            <span className="text-base font-normal text-muted-foreground"> / {catalog.total}</span>
          </p>
          <Progress value={percent(catalog.solved, catalog.total)} className="mt-3" />
        </div>
        {DIFFICULTIES.map((d) => (
          <div key={d} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{d}</p>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {percent(catalog.solvedByDifficulty[d], catalog.totalByDifficulty[d])}%
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">
              {catalog.solvedByDifficulty[d]}
              <span className="text-base font-normal text-muted-foreground"> / {catalog.totalByDifficulty[d]}</span>
            </p>
            <Progress
              value={percent(catalog.solvedByDifficulty[d], catalog.totalByDifficulty[d])}
              className="mt-3"
              indicatorClassName={DIFF_BAR[d]}
            />
          </div>
        ))}
      </div>

      {/* Topic progress strip */}
      {topics.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">Topics</p>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
            {topics.map((t) => {
              const active = params.topic === t.topic;
              return (
                <Link
                  key={t.topic}
                  href={hrefWith(params, { topic: active ? undefined : t.topic, page: undefined })}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "w-40 shrink-0 rounded-lg border bg-card px-3 py-2.5 transition-colors hover:border-foreground/20",
                    active && "border-brand/60 bg-brand/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{t.topic}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {t.solved}/{t.total}
                    </span>
                  </div>
                  <Progress value={percent(t.solved, t.total)} className="mt-2 h-1" />
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Filters + table */}
      <div className="mt-6 space-y-3">
        <ProblemFilters topics={catalog.topics} tags={catalog.tags} />

        {list.rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No problems match these filters"
              description="Try a different search or clear the filters."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/practice">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState icon={Code2} title="No problems yet" description="Problems will appear here once instructors publish them." />
          )
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 pr-0">
                    <span className="sr-only">Status</span>
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Topic</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Your attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.rows.map((p) => (
                  <TableRow key={p.id} className="group relative">
                    <TableCell className="pr-0">
                      <ProblemStatusIcon status={p.status} />
                    </TableCell>
                    <TableCell className="max-w-0 min-w-40 sm:max-w-none">
                      <Link
                        href={`/practice/${p.slug}`}
                        className="block truncate font-medium outline-none after:absolute after:inset-0 group-hover:text-brand focus-visible:text-brand"
                      >
                        {p.title}
                      </Link>
                      <span className="mt-0.5 block text-xs text-muted-foreground md:hidden">{p.topic}</span>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{p.topic}</TableCell>
                    <TableCell>
                      <DifficultyBadge value={p.difficulty} />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {p.tags.slice(0, 3).map((t) => (
                          <Badge key={t} variant="outline" className="font-mono text-[11px] font-normal">
                            {t}
                          </Badge>
                        ))}
                        {p.tags.length > 3 ? (
                          <span className="font-mono text-[11px] text-muted-foreground">+{p.tags.length - 3}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {p.attempts > 0 ? p.attempts : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {list.count > 0 ? (
          <nav className="flex items-center justify-between gap-2 pt-1" aria-label="Pagination">
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {from}–{to} of {list.count}
            </p>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                Page {list.page} / {list.pageCount}
              </span>
              {list.page > 1 ? (
                <Button asChild variant="outline" size="icon-sm">
                  <Link href={hrefWith(params, { page: list.page - 1 })} aria-label="Previous page">
                    <ChevronLeft />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="icon-sm" disabled aria-label="Previous page">
                  <ChevronLeft />
                </Button>
              )}
              {list.page < list.pageCount ? (
                <Button asChild variant="outline" size="icon-sm">
                  <Link href={hrefWith(params, { page: list.page + 1 })} aria-label="Next page">
                    <ChevronRight />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="icon-sm" disabled aria-label="Next page">
                  <ChevronRight />
                </Button>
              )}
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
