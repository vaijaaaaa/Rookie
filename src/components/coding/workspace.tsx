"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, CircleCheck, Code2, FileText, Loader2, Play, RotateCcw, Send, TerminalSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DifficultyBadge } from "@/components/shared/difficulty-badge";
import { cn } from "@/lib/utils";
import { canExecute, DEFAULT_TIMEOUT_MS, getRunner, MAX_CODE_LENGTH, SANDBOX_NOT_CONFIGURED } from "@/services/execution";
import type { RunResult, RunTest } from "@/services/execution/types";
import type { CreateSubmissionAction, SubmissionSummary } from "@/services/practice";
import type { CodeLanguage, CodingProblem } from "@/types";
import { LazyCodeEditor } from "./code-editor-lazy";
import { ConsolePanel, type ConsoleTab, type ExecutionOutcome, type SampleTest } from "./console-panel";
import { draftStore, LANGUAGE_LABEL, LANGUAGE_OPTIONS, paramNames, starterFor } from "./lib";
import { ProblemPanel, type ProblemTab } from "./problem-panel";

export type WorkspaceProblem = Pick<
  CodingProblem,
  "id" | "slug" | "title" | "difficulty" | "topic" | "function_name" | "starter_code"
>;

type Running = "run" | "submit" | "custom" | null;

// ---------------------------------------------------------------------------
// Small hooks
// ---------------------------------------------------------------------------

const noopSubscribe = () => () => {};

/** "⌘" on Apple platforms, "Ctrl" elsewhere — SSR-safe. */
function useModKey() {
  return useSyncExternalStore(
    noopSubscribe,
    () => (/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}

/** Pointer-drag splitter returning a percentage (horizontal) or pixel height (vertical). */
function useDrag(onMove: (e: PointerEvent) => void, onEnd?: () => void) {
  const move = useRef(onMove);
  const end = useRef(onEnd);
  useEffect(() => {
    move.current = onMove;
    end.current = onEnd;
  }, [onMove, onEnd]);

  return useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = getComputedStyle(e.currentTarget).cursor;
    document.body.style.userSelect = "none";
    const handleMove = (ev: PointerEvent) => move.current(ev);
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      end.current?.();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }, []);
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border/80 bg-muted px-1 font-mono text-[10px] leading-4 text-muted-foreground">
      {children}
    </kbd>
  );
}

// ---------------------------------------------------------------------------

export function Workspace({
  problem,
  sampleTests,
  initialSubmissions,
  description,
  solution,
  notes,
  submitAction,
}: {
  problem: WorkspaceProblem;
  sampleTests: SampleTest[];
  initialSubmissions: SubmissionSummary[];
  description: React.ReactNode;
  solution: React.ReactNode | null;
  notes: React.ReactNode;
  submitAction: CreateSubmissionAction;
}) {
  const mod = useModKey();

  // --- editor state --------------------------------------------------------
  const defaultLanguage: CodeLanguage = initialSubmissions[0]?.language ?? "javascript";
  const [language, setLanguage] = useState<CodeLanguage>(defaultLanguage);
  const [codes, setCodes] = useState<Record<CodeLanguage, string>>(() => ({
    java: starterFor(problem, "java"),
    javascript: starterFor(problem, "javascript"),
    python: starterFor(problem, "python"),
  }));
  const [hydrated, setHydrated] = useState(false);
  const code = codes[language];

  // Restore drafts after mount (localStorage is client-only).
  useEffect(() => {
    const lang = draftStore.getLanguage(problem.id);
    const restored: Partial<Record<CodeLanguage, string>> = {};
    for (const l of ["java", "javascript", "python"] as const) {
      const saved = draftStore.getCode(problem.id, l);
      if (saved != null) restored[l] = saved;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage
    setCodes((prev) => ({ ...prev, ...restored }));
    if (lang) setLanguage(lang);
    setHydrated(true);
  }, [problem.id]);

  // Persist the draft (debounced). Drafts equal to the starter are cleared.
  useEffect(() => {
    if (!hydrated) return;
    const id = setTimeout(() => {
      draftStore.setCode(problem.id, language, code === starterFor(problem, language) ? null : code);
    }, 400);
    return () => clearTimeout(id);
  }, [code, language, hydrated, problem]);

  const changeLanguage = (lang: CodeLanguage) => {
    setLanguage(lang);
    draftStore.setLanguage(problem.id, lang);
  };

  const setCode = useCallback(
    (value: string) => setCodes((prev) => ({ ...prev, [language]: value })),
    [language],
  );

  const [resetOpen, setResetOpen] = useState(false);
  const resetCode = () => {
    setCodes((prev) => ({ ...prev, [language]: starterFor(problem, language) }));
    draftStore.setCode(problem.id, language, null);
    setResetOpen(false);
    toast.success(`Reset ${LANGUAGE_LABEL[language]} to starter code`);
  };

  // --- panels --------------------------------------------------------------
  const [problemTab, setProblemTab] = useState<ProblemTab>("description");
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>("testcases");
  const [consoleOpen, setConsoleOpen] = useState(true);
  const [mobileView, setMobileView] = useState<"problem" | "code">("problem");

  const containerRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [split, setSplit] = useState(45);
  const [consoleHeight, setConsoleHeight] = useState(260);

  useEffect(() => {
    const saved = draftStore.getSplit();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted layout once
    if (saved) setSplit(saved);
  }, []);

  const splitRef = useRef(split);
  useEffect(() => {
    splitRef.current = split;
  }, [split]);

  const startColumnDrag = useDrag(
    useCallback((e: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSplit(Math.min(70, Math.max(28, ((e.clientX - rect.left) / rect.width) * 100)));
    }, []),
    useCallback(() => draftStore.setSplit(splitRef.current), []),
  );

  const startConsoleDrag = useDrag(
    useCallback((e: PointerEvent) => {
      const rect = rightRef.current?.getBoundingClientRect();
      if (!rect) return;
      setConsoleHeight(Math.min(rect.height - 120, Math.max(120, rect.bottom - e.clientY)));
      setConsoleOpen(true);
    }, []),
  );

  // --- submissions ---------------------------------------------------------
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>(initialSubmissions);
  const solved = submissions.some((s) => s.verdict === "accepted");

  const loadSubmission = (s: SubmissionSummary) => {
    setLanguage(s.language);
    setCodes((prev) => ({ ...prev, [s.language]: s.code }));
    setMobileView("code");
    toast.message(`Loaded ${LANGUAGE_LABEL[s.language]} submission into the editor`);
  };

  // --- execution -----------------------------------------------------------
  const [running, setRunning] = useState<Running>(null);
  const [outcome, setOutcome] = useState<ExecutionOutcome | null>(null);
  const executable = canExecute(language);
  const names = useMemo(
    () => paramNames(problem, sampleTests[0]?.input.length ?? 0),
    [problem, sampleTests],
  );
  const samples: RunTest[] = useMemo(
    () => sampleTests.map((t) => ({ input: t.input, expected: t.expected })),
    [sampleTests],
  );

  const runningRef = useRef<Running>(null);

  const execute = useCallback(
    async (tests: RunTest[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<RunResult> => {
      return getRunner(language).run({
        language,
        code,
        functionName: problem.function_name,
        tests,
        timeoutMs,
      });
    },
    [language, code, problem.function_name],
  );

  const guard = useCallback(
    (kind: Exclude<Running, null>) => {
      if (runningRef.current) return false;
      if (code.length > MAX_CODE_LENGTH) {
        toast.error(`Code is too long (max ${MAX_CODE_LENGTH.toLocaleString()} characters)`);
        return false;
      }
      if (!code.trim()) {
        toast.error("Write some code first");
        return false;
      }
      runningRef.current = kind;
      setRunning(kind);
      setConsoleOpen(true);
      setConsoleTab("result");
      setMobileView("code");
      return true;
    },
    [code],
  );

  const finish = () => {
    runningRef.current = null;
    setRunning(null);
  };

  const run = useCallback(async () => {
    if (!guard("run")) return;
    try {
      const result = await execute(samples);
      setOutcome({ kind: "run", result, compare: true, at: Date.now() });
    } finally {
      finish();
    }
  }, [guard, execute, samples]);

  const runCustom = useCallback(
    async (test: RunTest, compare: boolean) => {
      if (!guard("custom")) return;
      try {
        const result = await execute([test]);
        setOutcome({ kind: "custom", result, compare, at: Date.now() });
      } finally {
        finish();
      }
    },
    [guard, execute],
  );

  const submit = useCallback(async () => {
    if (!guard("submit")) return;
    try {
      // NOTE: Students can only read SAMPLE tests (RLS), so the browser can only
      // judge against those. A real judge must run hidden tests server-side in the
      // sandbox service. Until then the verdict below is client-reported and the
      // server action trusts it (MVP only).
      const result = await execute(samples, DEFAULT_TIMEOUT_MS + 2000);
      const passed = result.results.filter((r) => r.passed).length;
      const res = await submitAction({
        problemId: problem.id,
        language,
        code,
        verdict: result.verdict,
        passedCount: result.verdict === "pending" ? 0 : passed,
        totalCount: samples.length,
        runtimeMs: result.verdict === "pending" ? null : result.runtimeMs,
      });
      if (!res.ok) {
        setOutcome({ kind: "submit", result, compare: true, at: Date.now() });
        toast.error(res.error);
        return;
      }
      const saved = res.data;
      if (saved) setSubmissions((prev) => [saved, ...prev.filter((s) => s.id !== saved.id)]);
      const finalVerdict = saved?.verdict ?? result.verdict;
      setOutcome({
        kind: "submit",
        result: { ...result, verdict: finalVerdict },
        compare: true,
        submitted: true,
        at: Date.now(),
      });
      if (finalVerdict === "accepted") toast.success(res.message ?? "Accepted");
      else if (finalVerdict === "pending") toast.message("Submission saved — waiting for the judge service");
      else toast.error(`Submitted: ${finalVerdict.replace(/_/g, " ")}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    } finally {
      finish();
    }
  }, [guard, execute, samples, submitAction, problem.id, language, code]);

  // Global shortcuts (the editor handles them itself when focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.key !== "Enter" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      if (e.shiftKey) void submit();
      else void run();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, submit]);

  // --- render --------------------------------------------------------------
  const toolbar = (
    <div className="flex shrink-0 items-center gap-2 border-b px-2 py-1.5">
      <label htmlFor="language" className="sr-only">
        Language
      </label>
      <div className="relative">
        <select
          id="language"
          value={language}
          onChange={(e) => changeLanguage(e.target.value as CodeLanguage)}
          className="h-8 appearance-none rounded-md border border-transparent bg-transparent py-1 pr-7 pl-2 font-mono text-xs outline-none hover:bg-accent focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {LANGUAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Code2 className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      {!executable ? (
        <span className="hidden truncate text-[11px] text-muted-foreground md:inline" title={SANDBOX_NOT_CONFIGURED}>
          Runs on the judge service · not configured
        </span>
      ) : (
        <span className="hidden text-[11px] text-muted-foreground md:inline">Runs in your browser</span>
      )}
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" onClick={() => setResetOpen(true)} aria-label="Reset to starter code">
            <RotateCcw className="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset to starter code</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary" size="sm" onClick={() => void run()} disabled={running !== null}>
            {running === "run" || running === "custom" ? <Loader2 className="animate-spin" /> : <Play />}
            Run
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Run sample tests · {mod} + Enter
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="brand" size="sm" onClick={() => void submit()} disabled={running !== null}>
            {running === "submit" ? <Loader2 className="animate-spin" /> : <Send />}
            Submit
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Submit · {mod} + Shift + Enter
        </TooltipContent>
      </Tooltip>
    </div>
  );

  return (
    <div className="flex flex-col gap-3 lg:h-[calc(100dvh-3.5rem-4rem)]">
      {/* Header */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/practice">
            <ChevronLeft /> Problems
          </Link>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{problem.title}</h1>
          <DifficultyBadge value={problem.difficulty} />
          {solved ? (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <CircleCheck className="size-3.5" /> Solved
            </span>
          ) : null}
        </div>
        <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground lg:flex">
          <Kbd>{mod}</Kbd>
          <Kbd>↵</Kbd> run
          <span className="mx-1 text-border">|</span>
          <Kbd>{mod}</Kbd>
          <Kbd>⇧</Kbd>
          <Kbd>↵</Kbd> submit
        </div>
      </div>

      {/* Mobile view switch */}
      <div className="grid shrink-0 grid-cols-2 rounded-lg bg-muted p-1 lg:hidden" role="tablist" aria-label="Workspace view">
        {(
          [
            ["problem", "Problem", FileText],
            ["code", "Code", TerminalSquare],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mobileView === value}
            onClick={() => setMobileView(value)}
            className={cn(
              "inline-flex h-8 items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors",
              mobileView === value ? "bg-background text-foreground shadow-sm dark:bg-accent" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-0">
        {/* Left: problem */}
        <section
          aria-label="Problem"
          className={cn(
            "min-h-[60dvh] min-w-0 overflow-hidden rounded-lg border bg-card lg:flex lg:min-h-0 lg:w-[var(--split)] lg:shrink-0",
            mobileView === "problem" ? "flex" : "hidden",
          )}
          style={{ "--split": `${split}%` } as React.CSSProperties}
        >
          <ProblemPanel
            className="w-full"
            tab={problemTab}
            onTabChange={setProblemTab}
            description={description}
            solution={solution}
            notes={notes}
            submissions={submissions}
            onLoadSubmission={loadSubmission}
          />
        </section>

        {/* Column splitter */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          aria-valuenow={Math.round(split)}
          aria-valuemin={28}
          aria-valuemax={70}
          tabIndex={0}
          onPointerDown={startColumnDrag}
          onDoubleClick={() => {
            setSplit(45);
            draftStore.setSplit(45);
          }}
          onKeyDown={(e) => {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            const next = Math.min(70, Math.max(28, split + (e.key === "ArrowRight" ? 2 : -2)));
            setSplit(next);
            draftStore.setSplit(next);
          }}
          className="group hidden w-3 shrink-0 cursor-col-resize items-center justify-center outline-none lg:flex"
        >
          <div className="h-10 w-0.5 rounded-full bg-border transition-colors group-hover:bg-brand/60 group-focus-visible:bg-brand" />
        </div>

        {/* Right: editor + console */}
        <section
          ref={rightRef}
          aria-label="Code"
          className={cn(
            "min-w-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card lg:flex lg:min-h-0",
            mobileView === "code" ? "flex" : "hidden",
          )}
          style={{ "--console-h": `${consoleHeight}px` } as React.CSSProperties}
        >
          {toolbar}
          <div className="h-[55dvh] min-h-0 lg:h-auto lg:flex-1">
            <LazyCodeEditor
              key={language}
              value={code}
              onChange={setCode}
              language={language}
              onRun={() => void run()}
              onSubmit={() => void submit()}
              ariaLabel={`${LANGUAGE_LABEL[language]} code editor`}
            />
          </div>

          {/* Console splitter */}
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-label="Resize console"
            onPointerDown={startConsoleDrag}
            className={cn(
              "group hidden h-2 shrink-0 cursor-row-resize items-center justify-center border-t lg:flex",
              !consoleOpen && "lg:hidden",
            )}
          >
            <div className="h-0.5 w-10 rounded-full bg-border transition-colors group-hover:bg-brand/60" />
          </div>

          <ConsolePanel
            className={cn(
              "shrink-0 border-t lg:border-t-0",
              consoleOpen ? "max-h-[70dvh] lg:h-[var(--console-h)] lg:max-h-none" : "",
            )}
            tab={consoleTab}
            onTabChange={setConsoleTab}
            open={consoleOpen}
            onToggle={() => setConsoleOpen((o) => !o)}
            tests={sampleTests}
            names={names}
            outcome={outcome}
            running={running !== null}
            canRun={true}
            onRunCustom={(t, compare) => void runCustom(t, compare)}
          />
        </section>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset to starter code?</DialogTitle>
            <DialogDescription>
              Your current {LANGUAGE_LABEL[language]} code for this problem will be replaced. Submitted code stays in
              your submission history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={resetCode}>
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
