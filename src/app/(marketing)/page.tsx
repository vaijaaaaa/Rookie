import { LandingCta } from "@/components/marketing/landing/cta";
import { Faq } from "@/components/marketing/landing/faq";
import { Hero } from "@/components/marketing/landing/hero";
import { Inside } from "@/components/marketing/landing/inside";
import { Paths } from "@/components/marketing/landing/paths";
import { RevealObserver } from "@/components/marketing/landing/reveal-observer";
import { TopicMarquee } from "@/components/marketing/landing/topic-marquee";

// Fully static: no per-request data, so it's served straight from the CDN cache.
// Signed-in visitors who click through are redirected from /login to their dashboard.
export default function LandingPage() {
  return (
    <>
      <Hero />
      <TopicMarquee />
      <Paths />
      <Inside />
      <Faq />
      <LandingCta />
      <RevealObserver />
    </>
  );
}
