"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, CircleDashed, Clock, Loader2, Play, Plus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CodeVerdict } from "@/types";
import type { RunResult, RunTest, TestResult } from "@/services/execution/types";
import { formatValue } from "./lib";
import { PanelTab } from "./panel-tab";

export type ConsoleTab = "testcases" | "result";

export interface ExecutionOutcome {
  kind: "run" | "submit" | "custom";
  result: RunResult;
  /** For custom runs without an expected value we only show output. */
  compare: boolean;
  /** Set when the run was recorded as a submission. */
  submitted?: boolean;
  at: number;
}

export interface SampleTest {
  id: string;
  input: unknown[];
  expected: unknown;
}

const VERDICT_UI: Record<CodeVerdict, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  accepted: { label: "Accepted", className: "text-success", icon: CheckCircle2 },
  wrong_answer: { label: "Wrong Answer", className: "text-destructive", icon: XCircle },
  runtime_error: { label: "Runtime Error", className: "text-destructive", icon: AlertTriangle },
  compile_error: { label: "Compile Error", className: "text-destructive", icon: AlertTriangle },
  time_limit: { label: "Time Limit Exceeded", className: "text-warning", icon: Clock },
  pending: { label: "Pending", className: "text-muted-foreground", icon: CircleDashed },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{children}</p>;
}

function MonoBlock({ children, tone }: { children: React.ReactNode; tone?: "danger" | "muted" }) {
  return (
    <pre
      className={cn(
        "max-h-48 overflow-auto rounded-md border bg-muted/40 px-3 py-2 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-all",
        tone === "danger" && "border-destructive/30 bg-destructive/5 text-destructive",
        tone === "muted" && "text-muted-foreground",
      )}
    >
      {children}
    </pre>
  );
}

function InputsView({ input, names }: { input: unknown[]; names: string[] }) {
  return (
    <div className="space-y-2">
      {input.map((arg, i) => (
        <div key={i}>
          <p className="mb-1 font-mono text-xs text-muted-foreground">{names[i] ?? `arg${i + 1}`} =</p>
          <MonoBlock>{formatValue(arg)}</MonoBlock>
        </div>
      ))}
    </div>
  );
}

function CaseChip({
  active,
  onClick,
  status,
  children,
}: {
  active: boolean;
  onClick: () => void;
  status?: "pass" | "fail" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 font-mono text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      {status ? (
        <span
          className={cn(
            "size-1.5 rounded-full",
            status === "pass" && "bg-success",
            status === "fail" && "bg-destructive",
            status === "neutral" && "bg-muted-foreground",
          )}
        />
      ) : null}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------

function TestcasesView({
  tests,
  names,
  onRunCustom,
  running,
  canRun,
}: {
  tests: SampleTest[];
  names: string[];
  onRunCustom: (test: RunTest, compare: boolean) => void;
  running: boolean;
  canRun: boolean;
}) {
  const [selected, setSelected] = useState<number | "custom">(tests.length ? 0 : "custom");
  const [customArgs, setCustomArgs] = useState<string[]>(() =>
    (tests[0]?.input ?? names.map(() => null)).map((v) => formatValue(v)),
  );
  const [customExpected, setCustomExpected] = useState("");
  const [error, setError] = useState<string | null>(null);

  const arity = Math.max(names.length, customArgs.length);

  function runCustom() {
    const input: unknown[] = [];
    for (let i = 0; i < arity; i++) {
      const raw = (customArgs[i] ?? "").trim();
      try {
        input.push(JSON.parse(raw === "" ? "null" : raw));
      } catch {
        setError(`${names[i] ?? `arg${i + 1}`} is not valid JSON`);
        return;
      }
    }
    let expected: unknown = null;
    const hasExpected = customExpected.trim() !== "";
    if (hasExpected) {
      try {
        expected = JSON.parse(customExpected);
      } catch {
        setError("Expected output is not valid JSON");
        return;
      }
    }
    setError(null);
    onRunCustom({ input, expected }, hasExpected);
  }

  const test = typeof selected === "number" ? tests[selected] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Test cases">
        {tests.map((_, i) => (
          <CaseChip key={i} active={selected === i} onClick={() => setSelected(i)}>
            Case {i + 1}
          </CaseChip>
        ))}
        <CaseChip active={selected === "custom"} onClick={() => setSelected("custom")}>
          <Plus className="size-3" /> Custom
        </CaseChip>
      </div>

      {test ? (
        <div className="space-y-3">
          <InputsView input={test.input} names={names} />
          <div>
            <Eyebrow>Expected</Eyebrow>
            <MonoBlock>{formatValue(test.expected)}</MonoBlock>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Each argument is a JSON value. Leave <span className="font-mono">expected</span> empty to just see the output.
          </p>
          {Array.from({ length: arity }, (_, i) => (
            <div key={i}>
              <label htmlFor={`custom-arg-${i}`} className="mb-1 block font-mono text-xs text-muted-foreground">
                {names[i] ?? `arg${i + 1}`} =
              </label>
              <Textarea
                id={`custom-arg-${i}`}
                value={customArgs[i] ?? ""}
                onChange={(e) => {
                  const next = [...customArgs];
                  next[i] = e.target.value;
                  setCustomArgs(next);
                }}
                spellCheck={false}
                rows={1}
                className="min-h-9 resize-y font-mono text-[12.5px]"
              />
            </div>
          ))}
          <div>
            <label htmlFor="custom-expected" className="mb-1 block font-mono text-xs text-muted-foreground">
              expected (optional)
            </label>
            <Textarea
              id="custom-expected"
              value={customExpected}
              onChange={(e) => setCustomExpected(e.target.value)}
              spellCheck={false}
              rows={1}
              placeholder="e.g. [0, 1]"
              className="min-h-9 resize-y font-mono text-[12.5px]"
            />
          </div>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
          <Button size="sm" variant="secondary" onClick={runCustom} disabled={running || !canRun}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            Run custom input
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ResultView({ outcome, names, running }: { outcome: ExecutionOutcome | null; names: string[]; running: boolean }) {
  const [selected, setSelected] = useState(0);

  if (running && !outcome) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Running…
      </div>
    );
  }
  if (!outcome) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 text-center text-sm text-muted-foreground">
        <p>Run your code to see results here.</p>
        <p className="text-xs">Results for sample tests appear per case, with your console output.</p>
      </div>
    );
  }

  const { result, compare, kind } = outcome;
  const passed = result.results.filter((r) => r.passed).length;
  const total = result.results.length;
  const customNoCompare = kind === "custom" && !compare;
  const ui =
    customNoCompare && (result.verdict === "wrong_answer" || result.verdict === "accepted")
      ? { label: "Finished", className: "text-foreground", icon: CheckCircle2 }
      : VERDICT_UI[result.verdict];
  const Icon = ui.icon;
  const idx = Math.min(selected, Math.max(0, total - 1));
  const r: TestResult | undefined = result.results[idx];

  return (
    <div className={cn("space-y-3", running && "opacity-60 transition-opacity")} aria-live="polite">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className={cn("flex items-center gap-1.5 text-base font-semibold", ui.className)}>
          <Icon className="size-4" />
          {ui.label}
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          {result.verdict !== "pending" && result.verdict !== "compile_error" && !customNoCompare && total > 0
            ? `${passed} / ${total} ${kind === "custom" ? "case" : "sample tests"} passed · `
            : null}
          {result.verdict !== "pending" ? `${result.runtimeMs} ms` : null}
          {outcome.submitted ? " · saved to submissions" : null}
        </p>
      </div>

      {kind === "submit" && result.verdict !== "pending" ? (
        <p className="text-xs text-muted-foreground">
          Judged against the sample tests in your browser. Hidden tests run once the judge service is enabled.
        </p>
      ) : null}

      {result.logs.length > 0 ? (
        <div>
          <Eyebrow>{result.verdict === "compile_error" || result.verdict === "runtime_error" ? "Error" : "Log"}</Eyebrow>
          <MonoBlock tone={result.verdict === "compile_error" ? "danger" : "muted"}>{result.logs.join("\n")}</MonoBlock>
        </div>
      ) : null}

      {total > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Test results">
            {result.results.map((t, i) => (
              <CaseChip
                key={i}
                active={idx === i}
                onClick={() => setSelected(i)}
                status={customNoCompare && !t.error ? "neutral" : t.passed ? "pass" : "fail"}
              >
                {kind === "custom" ? "Custom" : `Case ${i + 1}`}
              </CaseChip>
            ))}
          </div>
          {r ? (
            <div className="space-y-3">
              <InputsView input={r.input} names={names} />
              {r.error ? (
                <div>
                  <Eyebrow>Error</Eyebrow>
                  <MonoBlock tone="danger">{r.error}</MonoBlock>
                </div>
              ) : (
                <div>
                  <Eyebrow>Output</Eyebrow>
                  <MonoBlock>
                    <span className={cn(!customNoCompare && !r.passed && "text-destructive")}>{formatValue(r.actual)}</span>
                  </MonoBlock>
                </div>
              )}
              {!customNoCompare ? (
                <div>
                  <Eyebrow>Expected</Eyebrow>
                  <MonoBlock>
                    <span className={cn(r.passed && "text-success")}>{formatValue(r.expected)}</span>
                  </MonoBlock>
                </div>
              ) : null}
              {r.stdout ? (
                <div>
                  <Eyebrow>Stdout</Eyebrow>
                  <MonoBlock tone="muted">{r.stdout.trimEnd()}</MonoBlock>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ConsolePanel({
  tab,
  onTabChange,
  open,
  onToggle,
  tests,
  names,
  outcome,
  running,
  canRun,
  onRunCustom,
  className,
}: {
  tab: ConsoleTab;
  onTabChange: (t: ConsoleTab) => void;
  open: boolean;
  onToggle: () => void;
  tests: SampleTest[];
  names: string[];
  outcome: ExecutionOutcome | null;
  running: boolean;
  canRun: boolean;
  onRunCustom: (test: RunTest, compare: boolean) => void;
  className?: string;
}) {
  const select = (value: ConsoleTab) => {
    onTabChange(value);
    if (!open) onToggle();
  };

  const verdictDot = outcome ? (
    <span
      className={cn(
        "size-1.5 rounded-full",
        outcome.result.verdict === "accepted" && "bg-success",
        outcome.result.verdict === "pending" && "bg-muted-foreground",
        outcome.result.verdict === "time_limit" && "bg-warning",
        ["wrong_answer", "runtime_error", "compile_error"].includes(outcome.result.verdict) && "bg-destructive",
      )}
    />
  ) : null;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex shrink-0 items-center gap-4 border-b px-3" role="tablist" aria-label="Console">
        <PanelTab active={tab === "testcases"} onSelect={() => select("testcases")}>
          Testcases
        </PanelTab>
        <PanelTab active={tab === "result"} onSelect={() => select("result")}>
          {running ? <Loader2 className="size-3 animate-spin" /> : verdictDot}
          Result
        </PanelTab>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon-sm"
          className="size-7"
          onClick={onToggle}
          aria-label={open ? "Collapse console" : "Expand console"}
          aria-expanded={open}
        >
          {open ? <ChevronDown /> : <ChevronUp />}
        </Button>
      </div>
      {/* Both views stay mounted so custom input survives tab switches/collapse. */}
      <div className={cn("min-h-0 flex-1 overflow-y-auto p-3", !open && "hidden")}>
        <div className={cn(tab !== "testcases" && "hidden")}>
          <TestcasesView tests={tests} names={names} onRunCustom={onRunCustom} running={running} canRun={canRun} />
        </div>
        <div className={cn(tab !== "result" && "hidden")}>
          <ResultView key={outcome?.at ?? 0} outcome={outcome} names={names} running={running} />
        </div>
      </div>
    </div>
  );
}
