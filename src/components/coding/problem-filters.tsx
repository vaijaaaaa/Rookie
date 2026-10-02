"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

/** URL-driven filters for the problem list (?q, difficulty, topic, tag, status). Resets ?page. */
export function ProblemFilters({ topics, tags }: { topics: string[]; tags: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  // Resync the box when the URL's ?q changes from outside (Clear, back/forward, links),
  // without clobbering what the user is mid-typing (e.g. a trailing space).
  const current = params.get("q") ?? "";
  const [prevCurrent, setPrevCurrent] = useState(current);
  const [typed, setTyped] = useState(false);
  if (current !== prevCurrent) {
    setPrevCurrent(current);
    if (q.trim() !== current) setQ(current);
    setTyped(false);
  }

  // Debounced search — only pushes when the user actually typed.
  const updateRef = useRef(update);
  useEffect(() => {
    updateRef.current = update;
  });
  useEffect(() => {
    if (!typed || q.trim() === current) return;
    const id = setTimeout(() => updateRef.current({ q: q.trim() || null }), 300);
    return () => clearTimeout(id);
  }, [q, current, typed]);

  // "/" focuses search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const active = ["q", "difficulty", "topic", "tag", "status"].some((k) => params.get(k));

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setTyped(true);
          }}
          placeholder="Search problems…"
          aria-label="Search problems"
          className="pr-10 pl-8"
        />
        {pending ? (
          <Loader2 className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground sm:block">
            /
          </kbd>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex">
        <NativeSelect
          aria-label="Difficulty"
          value={params.get("difficulty") ?? ""}
          onChange={(e) => update({ difficulty: e.target.value || null })}
          className="lg:w-36"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </NativeSelect>
        <NativeSelect
          aria-label="Topic"
          value={params.get("topic") ?? ""}
          onChange={(e) => update({ topic: e.target.value || null })}
          className="lg:w-40"
        >
          <option value="">All topics</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Tag"
          value={params.get("tag") ?? ""}
          onChange={(e) => update({ tag: e.target.value || null })}
          className="lg:w-36"
        >
          <option value="">All tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Status"
          value={params.get("status") ?? ""}
          onChange={(e) => update({ status: e.target.value || null })}
          className="lg:w-32"
        >
          <option value="">Any status</option>
          <option value="solved">Solved</option>
          <option value="attempted">Attempted</option>
          <option value="todo">To do</option>
        </NativeSelect>
      </div>
      {active ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start text-muted-foreground lg:self-auto"
          onClick={() => {
            setQ("");
            setTyped(false);
            startTransition(() => router.replace(pathname, { scroll: false }));
          }}
        >
          <X /> Clear
        </Button>
      ) : null}
    </div>
  );
}
