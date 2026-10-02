import { BookOpen, CalendarCheck, Code2, LineChart, NotebookPen, Video } from "lucide-react";
import { LandingSection, SectionHeading } from "./section-heading";

const ITEMS = [
  { icon: Video, label: "Live classes", tag: "attend", body: "An instructor introduces each concept live, with an agenda, a join link and the recording afterwards." },
  { icon: BookOpen, label: "Lessons", tag: "read", body: "Written lessons with examples and code you can come back to whenever a concept gets fuzzy." },
  { icon: Code2, label: "Practice", tag: "solve", body: "Coding problems in Java, Python or JavaScript, judged in the browser against real test cases." },
  { icon: CalendarCheck, label: "Daily agenda", tag: "plan", body: "Each day strings together a class, a lesson, a problem and a review — about an hour of focus." },
  { icon: NotebookPen, label: "Notes", tag: "review", body: "Markdown notes attached to lessons and classes, so revision lives next to what you learned." },
  { icon: LineChart, label: "Progress", tag: "track", body: "Streaks, solved problems, attendance and achievements update on their own as you work." },
];

export function Inside() {
  return (
    <LandingSection id="inside" labelledBy="inside-title" className="border-t bg-muted/20">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionHeading
            id="inside-title"
            eyebrow="Inside Rookie"
            title="Not another course. A daily loop."
            className="mb-6"
          />
          <div className="landing-reveal space-y-4 text-muted-foreground">
            <p>
              Tutorials teach you a framework. Rookie teaches you the computer science underneath it — the part that
              still matters in five years and shows up in every interview.
            </p>
            <p>
              Everything is wired together: what you attend today becomes the lesson you read, the problem you solve
              and the notes you revise tomorrow.
            </p>
          </div>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, label, tag, body }, i) => (
            <li key={label} className="landing-reveal group bg-card p-6 transition-colors hover:bg-accent/40">
              <div className="flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-lg border bg-background text-brand transition-transform duration-300 group-hover:scale-110">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {String(i + 1).padStart(2, "0")} · {tag}
                </span>
              </div>
              <h3 className="mt-4 font-semibold">{label}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </LandingSection>
  );
}
