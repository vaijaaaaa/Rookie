import { Cpu, GitBranch, Network, Workflow } from "lucide-react";
import { LandingSection, SectionHeading } from "./section-heading";

const POINTS = [
  {
    icon: GitBranch,
    title: "Frameworks change. Data structures don't.",
    body: "Arrays, trees, graphs and hash maps show up in every stack you'll ever touch. Learn them once, properly.",
  },
  {
    icon: Cpu,
    title: "Know what the machine is doing",
    body: "Memory, processes, threads and caches explain the bugs and slowdowns that tutorials skip over.",
  },
  {
    icon: Network,
    title: "Systems thinking beats memorization",
    body: "Networks, databases and operating systems teach you to reason about trade-offs, not recite answers.",
  },
  {
    icon: Workflow,
    title: "Interviews test fundamentals",
    body: "Most technical interviews are DSA and design. Practicing the core is preparing for them by default.",
  },
];

export function Fundamentals() {
  return (
    <LandingSection labelledBy="why-title">
      <SectionHeading
        id="why-title"
        eyebrow="Why fundamentals"
        title="Skip the tutorial treadmill."
        description="Rookie starts from computer science, not from the framework of the month — so what you learn keeps paying off."
      />
      <ul className="grid gap-6 sm:grid-cols-2">
        {POINTS.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-card">
              <Icon className="size-4 text-brand" aria-hidden />
            </div>
            <div>
              <h3 className="font-medium">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </LandingSection>
  );
}
