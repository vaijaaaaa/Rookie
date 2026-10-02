import { Plus } from "lucide-react";
import { LandingSection, SectionHeading } from "./section-heading";

const FAQ = [
  {
    q: "Where should I start?",
    a: "Log in and answer three quick questions about your goal and experience. Rookie suggests a path and builds your first daily agenda from it.",
  },
  {
    q: "Do I need prior coding experience?",
    a: "No. Paths start from programming basics. If you already code, onboarding lets you skip ahead to data structures and systems.",
  },
  {
    q: "How do I get an account?",
    a: "Accounts are created by your institute admin. Use the email and password they share with you to log in.",
  },
  {
    q: "Which languages can I practise in?",
    a: "Java, Python and JavaScript, all in the browser. No setup needed.",
  },
  {
    q: "What time are live classes?",
    a: "All class times are shown in Indian Standard Time. You get an email as soon as a class is scheduled, and recordings stay available afterwards.",
  },
];

export function Faq() {
  return (
    <LandingSection labelledBy="faq-title" className="border-t">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Questions people ask before starting." />
        <div className="landing-reveal divide-y rounded-xl border bg-card">
          {FAQ.map(({ q, a }, i) => (
            <details key={q} className="group px-5" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="size-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45" aria-hidden />
              </summary>
              <p className="-mt-1 pb-5 text-sm leading-relaxed text-muted-foreground">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
