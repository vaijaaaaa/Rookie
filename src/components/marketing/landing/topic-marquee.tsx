const ROWS = [
  ["Arrays", "Linked lists", "Hash maps", "Recursion", "Binary search", "Stacks & queues", "Trees", "Heaps", "Graphs", "Dynamic programming", "Greedy", "Tries"],
  ["Operating systems", "Processes & threads", "Memory", "Networking", "HTTP", "SQL", "Indexes", "Git", "OOP", "Java", "Python", "JavaScript"],
];

function Row({ items, reverse, duration }: { items: string[]; reverse?: boolean; duration: string }) {
  // Duplicated once so the -50% translate loops seamlessly (per-item margin, not gap, keeps both halves equal).
  const loop = [...items, ...items];
  return (
    <div className="landing-marquee overflow-hidden">
      <ul
        className="landing-marquee-track flex w-max py-1.5"
        style={{ "--dur": duration, animationDirection: reverse ? "reverse" : undefined } as React.CSSProperties}
      >
        {loop.map((t, i) => (
          <li
            key={`${t}-${i}`}
            aria-hidden={i >= items.length}
            className="mr-3 rounded-full border bg-card px-4 py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground"
          >
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TopicMarquee() {
  return (
    <section aria-label="Topics covered" className="border-y bg-muted/20 py-8">
      <p className="mb-5 text-center font-mono text-[11px] tracking-wider text-muted-foreground uppercase">
        What you&apos;ll actually learn
      </p>
      <div className="space-y-2">
        <Row items={ROWS[0]!} duration="55s" />
        <Row items={ROWS[1]!} duration="65s" reverse />
      </div>
    </section>
  );
}
