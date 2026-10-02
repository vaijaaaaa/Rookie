import { LandingSection, SectionHeading } from "./section-heading";
import { FaqList } from "./faq-list";

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
        <FaqList items={FAQ} />
      </div>
    </LandingSection>
  );
}
