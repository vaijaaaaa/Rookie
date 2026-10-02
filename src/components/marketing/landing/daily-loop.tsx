import { BookOpen, Code2, NotebookPen, Video } from "lucide-react";
import { LandingSection, SectionHeading } from "./section-heading";

const LOOP = [
  { icon: Video, label: "attend", title: "Live class", body: "Concept introduced by an instructor, with an agenda and recording." },
  { icon: BookOpen, label: "read", title: "Lesson", body: "Written lesson with examples and a short exercise to check understanding." },
  { icon: Code2, label: "solve", title: "Problem", body: "A coding problem on the same topic, judged against real tests." },
  { icon: NotebookPen, label: "review", title: "Notes & revision", body: "Write notes, revisit yesterday's topics, keep the streak alive." },
];

export function DailyLoop() {
  return (
    <LandingSection labelledBy="loop-title" className="bg-muted/20">
      <SectionHeading
        id="loop-title"
        eyebrow="The daily loop"
        title="Small steps, every day."
        description="Consistency beats intensity. Your agenda strings together a class, a lesson, a problem and a review — about an hour of focused work."
      />
      <ol className="relative grid gap-4 md:grid-cols-4">
        {LOOP.map(({ icon: Icon, label, title, body }, i) => (
          <li key={label} className="relative rounded-lg border bg-card p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {i + 1}. {label}
              </span>
            </div>
            <h3 className="mt-3 font-medium">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            {i < LOOP.length - 1 ? (
              <span
                aria-hidden
                className="absolute top-1/2 -right-3 hidden -translate-y-1/2 font-mono text-xs text-muted-foreground md:block"
              >
                →
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
        ↻ repeat tomorrow — progress, streaks and attendance update automatically
      </p>
    </LandingSection>
  );
}
