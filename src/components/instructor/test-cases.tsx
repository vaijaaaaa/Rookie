"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTestCase, deleteTestCase, moveTestCase, updateTestCase } from "@/app/admin/problems/actions";
import { testCaseSchema, type TestCaseInput } from "@/services/instructor/schemas";
import type { TestCase } from "@/types";
import { ConfirmAction } from "./confirm-action";
import { MoveButtons } from "./move-buttons";
import { FormSection } from "./field";
import { toastResult } from "./form-utils";

const EMPTY: TestCaseInput = { input: "", expected_output: "", is_sample: false };

function TestCaseRow({
  problemId,
  testCase,
  index,
  count,
}: {
  problemId: string;
  testCase?: TestCase;
  index?: number;
  count?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial: TestCaseInput = testCase
    ? { input: JSON.stringify(testCase.input), expected_output: JSON.stringify(testCase.expected_output), is_sample: testCase.is_sample }
    : EMPTY;
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof TestCaseInput, string>>>({});
  const dirty = values.input !== initial.input || values.expected_output !== initial.expected_output || values.is_sample !== initial.is_sample;
  const idp = testCase?.id ?? "new";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = testCaseSchema.safeParse(values);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof TestCaseInput] ??= issue.message;
      setErrors(next);
      toast.error("Fix the highlighted JSON");
      return;
    }
    setErrors({});
    startTransition(async () => {
      const res = testCase ? await updateTestCase(testCase.id, parsed.data) : await createTestCase(problemId, parsed.data);
      if (toastResult(res, "Saved")) {
        if (!testCase) setValues(EMPTY);
        router.refresh();
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
      className="grid gap-2 rounded-md border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {testCase ? `Case ${(index ?? 0) + 1}` : "New case"}
        </span>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex items-center gap-1.5">
            <Checkbox
              id={`sample-${idp}`}
              checked={values.is_sample}
              onCheckedChange={(v) => setValues({ ...values, is_sample: v === true })}
            />
            <Label htmlFor={`sample-${idp}`} className="text-xs text-muted-foreground">
              Sample (visible to students)
            </Label>
          </div>
          {testCase ? (
            <>
              <Button type="submit" variant="ghost" size="icon-sm" disabled={!dirty || pending} aria-label="Save test case">
                {pending ? <Loader2 className="animate-spin" /> : <Save />}
              </Button>
              <MoveButtons action={moveTestCase.bind(null, testCase.id)} isFirst={index === 0} isLast={index === (count ?? 0) - 1} label="test case" />
              <ConfirmAction action={deleteTestCase.bind(null, testCase.id)} title="Delete test case?" successMessage="Test case deleted" />
            </>
          ) : (
            <Button type="submit" size="sm" variant="outline" disabled={pending || !values.input || !values.expected_output}>
              {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor={`input-${idp}`} className="text-xs text-muted-foreground">
            Input — JSON array of arguments
          </Label>
          <Textarea
            id={`input-${idp}`}
            rows={2}
            spellCheck={false}
            placeholder="[[2,7,11,15], 9]"
            className="font-mono text-xs"
            aria-invalid={!!errors.input}
            value={values.input}
            onChange={(e) => setValues({ ...values, input: e.target.value })}
          />
          {errors.input ? <p className="text-xs text-destructive">{errors.input}</p> : null}
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`expected-${idp}`} className="text-xs text-muted-foreground">
            Expected output — JSON
          </Label>
          <Textarea
            id={`expected-${idp}`}
            rows={2}
            spellCheck={false}
            placeholder="[0,1]"
            className="font-mono text-xs"
            aria-invalid={!!errors.expected_output}
            value={values.expected_output}
            onChange={(e) => setValues({ ...values, expected_output: e.target.value })}
          />
          {errors.expected_output ? <p className="text-xs text-destructive">{errors.expected_output}</p> : null}
        </div>
      </div>
    </form>
  );
}

export function TestCasesEditor({ problemId, testCases }: { problemId: string; testCases: TestCase[] }) {
  const samples = testCases.filter((t) => t.is_sample).length;
  return (
    <FormSection
      title={`Test cases · ${testCases.length}`}
      description={`${samples} sample · ${testCases.length - samples} hidden. Hidden cases are only visible to staff.`}
    >
      {testCases.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <FlaskConical className="size-4" /> No test cases yet — submissions can&apos;t be judged without them.
        </p>
      ) : null}
      {testCases.map((t, i) => (
        <TestCaseRow
          key={`${t.id}:${JSON.stringify(t.input)}:${JSON.stringify(t.expected_output)}:${t.is_sample}`}
          problemId={problemId}
          testCase={t}
          index={i}
          count={testCases.length}
        />
      ))}
      <TestCaseRow problemId={problemId} />
    </FormSection>
  );
}
