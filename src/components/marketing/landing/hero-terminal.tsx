import { cn } from "@/lib/utils";

/**
 * Illustrative, static preview of a learner's day drawn in markup.
 * Purely decorative — announced to assistive tech with a short summary.
 */
const AGENDA = [
  { time: "09:00", kind: "class", title: "Recursion & the call stack", meta: "live", done: true },
  { time: "10:30", kind: "lesson", title: "Big-O: amortized analysis", meta: "20 min", done: true },
  { time: "14:00", kind: "problem", title: "valid-parentheses", meta: "easy", done: false },
  { time: "19:00", kind: "review", title: "Notes: stacks & queues", meta: "10 min", done: false },
] as const;

const ROADMAP = [
  { label: "Programming basics", state: "done" },
  { label: "Data structures", state: "current" },
  { label: "Algorithms", state: "next" },
  { label: "Operating systems", state: "next" },
] as const;

export function HeroTerminal() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        Example of a learner&apos;s day in Rookie: a live class, a lesson, a coding problem and a review session,
        alongside progress through a data structures roadmap.
      </figcaption>
      <div aria-hidden className="overflow-hidden rounded-lg border bg-card shadow-2xl shadow-black/10 dark:shadow-black/40">
        {/* window bar */}
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <p className="mx-auto font-mono text-[11px] text-muted-foreground">~/rookie — today</p>
        </div>

        <div className="space-y-5 p-4 font-mono text-[12px] leading-relaxed sm:p-5 sm:text-[13px]">
          <div>
            <p>
              <span className="text-brand">$</span> rookie agenda --today
            </p>
            <ul className="mt-2 space-y-1">
              {AGENDA.map((item) => (
                <li key={item.time} className="grid grid-cols-[3.2rem_1rem_4.2rem_1fr_auto] items-center gap-x-1.5">
                  <span className="text-muted-foreground">{item.time}</span>
                  <span className={item.done ? "text-brand" : "text-muted-foreground"}>{item.done ? "✓" : "○"}</span>
                  <span className="text-muted-foreground">{item.kind}</span>
                  <span className={cn("truncate", item.done && "text-muted-foreground line-through decoration-muted-foreground/40")}>
                    {item.title}
                  </span>
                  <span
                    className={cn(
                      "rounded border px-1 text-[10px] uppercase",
                      item.meta === "live" ? "border-brand/40 text-brand" : "text-muted-foreground",
                    )}
                  >
                    {item.meta}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p>
              <span className="text-brand">$</span> rookie roadmap
            </p>
            <ol className="mt-2 space-y-1.5 border-l pl-3">
              {ROADMAP.map((node) => (
                <li key={node.label} className="relative flex items-center gap-2">
                  <span
                    className={cn(
                      "absolute -left-[17px] size-2 rounded-full border",
                      node.state === "done" && "border-brand bg-brand",
                      node.state === "current" && "border-brand bg-background",
                      node.state === "next" && "bg-background",
                    )}
                  />
                  <span className={node.state === "next" ? "text-muted-foreground" : undefined}>{node.label}</span>
                  {node.state === "current" ? (
                    <span className="text-[10px] uppercase tracking-wider text-brand">← you are here</span>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-md border bg-background/60 p-3">
            <p className="text-muted-foreground">
              <span className="text-foreground">Solution.java</span> · 3/3 tests passed
            </p>
            <pre className="mt-2 overflow-hidden text-[11px] sm:text-[12px]">
              <code>
                <span className="text-info">for</span> (<span className="text-info">char</span> c : s.toCharArray()) {"{"}
                {"\n"}  <span className="text-info">if</span> (open(c)) stack.push(c);
                {"\n"}  <span className="text-info">else if</span> (stack.isEmpty()) <span className="text-info">return</span>{" "}
                <span className="text-warning">false</span>;
                {"\n"}
                {"}"}
              </code>
            </pre>
          </div>

          <p className="flex items-center gap-2">
            <span className="text-brand">$</span>
            <span className="inline-block h-4 w-2 animate-pulse bg-brand/80 motion-reduce:animate-none" />
          </p>
        </div>
      </div>
    </figure>
  );
}
