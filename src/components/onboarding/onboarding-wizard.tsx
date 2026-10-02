"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeOnboarding, type RecommendedRoadmap } from "@/app/onboarding/actions";
import type { ExperienceLevel, LearningGoal } from "@/types";
import { EXPERIENCE_OPTIONS, GOAL_OPTIONS, INTEREST_OPTIONS } from "./options";
import { OnboardingResult } from "./onboarding-result";

type Interest = (typeof INTEREST_OPTIONS)[number];

const STEPS = [
  { key: "goal", title: "What do you want to become?", description: "We'll use this to recommend a roadmap." },
  { key: "experience", title: "How much programming experience do you have?", description: "Be honest — it only changes where you start." },
  { key: "interests", title: "What are you interested in?", description: "Pick as many as you like. You can change these later." },
] as const;

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<LearningGoal | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [result, setResult] = useState<{ roadmap: RecommendedRoadmap | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const didMount = useRef(false);

  // Move focus to the step heading when the step changes (not on first render).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  const canContinue = step === 0 ? goal !== null : step === 1 ? experience !== null : true;
  const current = STEPS[step]!;

  function toggleInterest(i: Interest) {
    setInterests((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));
  }

  function submit() {
    if (!goal || !experience) return;
    startTransition(async () => {
      const res = await completeOnboarding({ goal, experience, interests });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResult({ roadmap: res.data?.roadmap ?? null });
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canContinue || pending) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else submit();
  }

  if (result) return <OnboardingResult roadmap={result.roadmap} />;

  return (
    <form onSubmit={onSubmit} aria-labelledby="onboarding-step-title" className="w-full">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>
            Step {step + 1} of {STEPS.length}
          </span>
          <span>{step === 0 ? `hi, ${firstName}` : STEPS[step]!.key}</span>
        </div>
        <ol className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.key} aria-current={i === step ? "step" : undefined}>
              <span className="sr-only">
                {s.title} {i < step ? "(done)" : i === step ? "(current)" : ""}
              </span>
              <span
                aria-hidden
                className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-brand" : "bg-muted")}
              />
            </li>
          ))}
        </ol>
      </div>

      <fieldset className="min-w-0">
        <legend className="sr-only">{current.title}</legend>
        <h1
          id="onboarding-step-title"
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
        >
          {current.title}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{current.description}</p>

        <div className="mt-6">
          {step === 0 ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {GOAL_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  name="goal"
                  value={o.value}
                  checked={goal === o.value}
                  onChange={() => setGoal(o.value)}
                  label={o.label}
                  hint={o.hint}
                />
              ))}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-2">
              {EXPERIENCE_OPTIONS.map((o) => (
                <ChoiceCard
                  key={o.value}
                  name="experience"
                  value={o.value}
                  checked={experience === o.value}
                  onChange={() => setExperience(o.value)}
                  label={o.label}
                  hint={o.hint}
                />
              ))}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((i) => {
                const on = interests.includes(i);
                return (
                  <label
                    key={i}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-sm transition-colors select-none",
                      "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
                      on ? "border-brand/60 bg-brand/10 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      name="interests"
                      value={i}
                      checked={on}
                      onChange={() => toggleInterest(i)}
                    />
                    {on ? <Check className="size-3.5 text-brand" aria-hidden /> : <span className="text-xs" aria-hidden>+</span>}
                    {i}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
      </fieldset>

      <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || pending}
          className={cn(step === 0 && "invisible")}
        >
          <ArrowLeft /> Back
        </Button>
        <div className="flex items-center gap-3">
          {step === 2 && interests.length > 0 ? (
            <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
              {interests.length} selected
            </span>
          ) : null}
          <Button type="submit" variant="brand" disabled={!canContinue || pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            {step < STEPS.length - 1 ? (
              <>
                Continue <ArrowRight />
              </>
            ) : pending ? (
              "Building your plan…"
            ) : (
              "Finish"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border bg-card p-3.5 transition-colors",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/60",
        checked ? "border-brand/60 bg-brand/5" : "hover:border-foreground/20",
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked && "border-brand bg-brand",
        )}
      >
        {checked ? <span className="size-1.5 rounded-full bg-brand-foreground" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
