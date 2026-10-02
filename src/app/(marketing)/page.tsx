import { DailyLoop } from "@/components/marketing/landing/daily-loop";
import { getLandingData } from "@/components/marketing/landing/data";
import { Fundamentals } from "@/components/marketing/landing/fundamentals";
import { Hero } from "@/components/marketing/landing/hero";
import { HowItWorks } from "@/components/marketing/landing/how-it-works";
import { LearningPaths } from "@/components/marketing/landing/learning-paths";
import { LandingCta } from "@/components/marketing/landing/cta";
import { PopularRoadmaps } from "@/components/marketing/landing/popular-roadmaps";
import { PracticePreview } from "@/components/marketing/landing/practice-preview";
import { UpcomingClasses } from "@/components/marketing/landing/upcoming-classes";
import { getProfile } from "@/lib/auth/session";
import { landingFor } from "@/app/auth/_lib/redirects";

export default async function LandingPage() {
  const [profile, data] = await Promise.all([getProfile(), getLandingData()]);
  const homeHref = profile ? landingFor(profile) : null;

  return (
    <>
      <Hero homeHref={homeHref} />
      <LearningPaths goalCounts={data.roadmapGoals} />
      <PopularRoadmaps roadmaps={data.roadmaps} />
      <UpcomingClasses classes={data.classes} />
      <Fundamentals />
      <HowItWorks />
      <PracticePreview total={data.problems.total} byDifficulty={data.problems.byDifficulty} />
      <DailyLoop />
      <LandingCta homeHref={homeHref} />
    </>
  );
}
