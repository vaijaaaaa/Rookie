"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Code2, FileText, Map, Search, Video } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { createClient } from "@/lib/supabase/client";
import { NAV } from "./nav-config";
import type { SearchResult, UserRole } from "@/types";

const KIND_META: Record<SearchResult["kind"], { label: string; icon: typeof BookOpen }> = {
  course: { label: "Courses", icon: BookOpen },
  lesson: { label: "Lessons", icon: FileText },
  roadmap: { label: "Roadmaps", icon: Map },
  problem: { label: "Problems", icon: Code2 },
  class: { label: "Classes", icon: Video },
};

export function CommandMenu({ role }: { role: UserRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const supabase = createClient();
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_content", { p_query: q });
      startTransition(() => setResults((data as SearchResult[] | null) ?? []));
    }, 180);
    return () => clearTimeout(t);
  }, [query]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  const visible = query.trim().length >= 2 ? results : [];
  const grouped = (Object.keys(KIND_META) as SearchResult["kind"][])
    .map((kind) => ({ kind, items: visible.filter((r) => r.kind === kind) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted"
      >
        <Search className="size-3.5" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden rounded border bg-background px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl overflow-hidden p-0 [&>button]:hidden">
          <DialogTitle className="sr-only">Search</DialogTitle>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search courses, lessons, problems, classes…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {query.trim().length >= 2 ? <CommandEmpty>No results for “{query}”.</CommandEmpty> : null}
              {grouped.map((g) => {
                const Icon = KIND_META[g.kind].icon;
                return (
                  <CommandGroup key={g.kind} heading={KIND_META[g.kind].label}>
                    {g.items.map((r) => (
                      <CommandItem key={`${r.kind}-${r.id}`} value={`${r.kind}-${r.id}`} onSelect={() => go(r.href)}>
                        <Icon />
                        <span className="truncate">{r.title}</span>
                        {r.subtitle ? (
                          <span className="ml-auto truncate text-xs text-muted-foreground">{r.subtitle}</span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
              {query.trim().length < 2 ? (
                <CommandGroup heading="Go to">
                  {NAV[role].main.map((item) => (
                    <CommandItem key={item.href} value={item.href} onSelect={() => go(item.href)}>
                      <item.icon />
                      {item.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
