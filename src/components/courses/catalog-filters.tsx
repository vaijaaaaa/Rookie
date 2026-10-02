import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Difficulty } from "@/types";

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

function titleCase(s: string) {
  return s.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** GET form driving ?q, ?category, ?difficulty. Works without JavaScript. */
export function CatalogFilters({
  categories,
  q,
  category,
  difficulty,
}: {
  categories: string[];
  q?: string;
  category?: string;
  difficulty?: string;
}) {
  const active = !!(q || category || difficulty);
  return (
    // Keyed on the URL values so uncontrolled fields reset after "Clear filters" / back-forward.
    <form
      key={`${q ?? ""}|${category ?? ""}|${difficulty ?? ""}`}
      action="/courses"
      method="get"
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      role="search"
    >
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search courses…"
          aria-label="Search courses"
          className="pl-8"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:flex">
        <NativeSelect name="category" defaultValue={category ?? ""} aria-label="Category" className="sm:w-44">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {titleCase(c)}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="difficulty" defaultValue={difficulty ?? ""} aria-label="Difficulty" className="sm:w-40">
          <option value="">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
          Filter
        </Button>
        {active ? (
          <Button asChild variant="ghost" size="icon" aria-label="Clear filters">
            <Link href="/courses">
              <X />
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export { titleCase as formatCategory };
