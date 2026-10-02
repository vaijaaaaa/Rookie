import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, SearchX } from "lucide-react";
import { CatalogFilters, formatCategory } from "@/components/courses/catalog-filters";
import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/auth/session";
import { listCatalog, listCourseCategories } from "@/services/courses";
import type { Difficulty } from "@/types";

export const metadata: Metadata = {
  title: "Courses",
  description: "Structured computer science courses: modules, lessons, and hands-on practice.",
};

const DIFFICULTIES: Difficulty[] = ["beginner", "intermediate", "advanced"];

function one(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = one(sp.q);
  const category = one(sp.category);
  const rawDifficulty = one(sp.difficulty);
  const difficulty = DIFFICULTIES.includes(rawDifficulty as Difficulty) ? (rawDifficulty as Difficulty) : undefined;

  const profile = await getProfile();
  const [courses, categories] = await Promise.all([
    listCatalog({ q, category, difficulty }, profile?.id ?? null),
    listCourseCategories(),
  ]);

  const filtered = !!(q || category || difficulty);
  const enrolled = profile ? courses.filter((c) => c.enrolled) : [];
  const others = profile && !filtered ? courses.filter((c) => !c.enrolled) : courses;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Catalog"
        title="Courses"
        description="Structured, self-paced courses. Read, practice, and track every lesson."
      />

      <CatalogFilters categories={categories} q={q} category={category} difficulty={difficulty} />

      {categories.length > 1 ? (
        <nav aria-label="Categories" className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <CategoryChip href={hrefWith({ q, difficulty })} active={!category} label="All" />
          {categories.map((c) => (
            <CategoryChip
              key={c}
              href={hrefWith({ q, difficulty, category: c })}
              active={category === c}
              label={formatCategory(c)}
            />
          ))}
        </nav>
      ) : null}

      <div className="mt-6 space-y-8">
        {courses.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title="No courses match your filters"
              description="Try a different search term or clear the filters."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/courses">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState icon={BookOpen} title="No courses yet" description="Published courses will appear here." />
          )
        ) : (
          <>
            {profile && !filtered && enrolled.length > 0 ? (
              <CourseGrid label="Your courses" count={enrolled.length}>
                {enrolled.map((c) => (
                  <CourseCard key={c.id} course={c} signedIn />
                ))}
              </CourseGrid>
            ) : null}
            {others.length > 0 ? (
              <CourseGrid
                label={filtered ? "Results" : profile && enrolled.length > 0 ? "Explore" : "All courses"}
                count={others.length}
              >
                {others.map((c) => (
                  <CourseCard key={c.id} course={c} signedIn={!!profile} />
                ))}
              </CourseGrid>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function hrefWith(params: Record<string, string | undefined>) {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) usp.set(k, v);
  const s = usp.toString();
  return s ? `/courses?${s}` : "/courses";
}

function CategoryChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "shrink-0 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
          : "shrink-0 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}

function CourseGrid({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
        <span className="rounded border px-1 tabular-nums">{count}</span>
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}
