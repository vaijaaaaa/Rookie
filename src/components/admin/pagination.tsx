import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Prev/next pagination that preserves existing search params. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="flex items-center justify-between gap-3 border-t px-3 py-2.5">
      <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
        {from}–{to} of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Button asChild variant="outline" size="icon-sm">
            <Link href={href(page - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon-sm" disabled aria-label="Previous page">
            <ChevronLeft />
          </Button>
        )}
        <span className="px-2 font-mono text-[11px] text-muted-foreground tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Button asChild variant="outline" size="icon-sm">
            <Link href={href(page + 1)} aria-label="Next page">
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon-sm" disabled aria-label="Next page">
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
