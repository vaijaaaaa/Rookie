import Link from "next/link";
import { Check, LogIn, Play, Star } from "lucide-react";
import { followRoadmapAction } from "@/app/(app)/roadmaps/actions";
import { SubmitButton } from "@/components/shared/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Start / Following / Set as current controls for a roadmap. */
export function FollowRoadmapActions({
  roadmapId,
  roadmapSlug,
  signedIn,
  following,
  current,
}: {
  roadmapId: string;
  roadmapSlug: string;
  signedIn: boolean;
  following: boolean;
  current: boolean;
}) {
  if (!signedIn) {
    return (
      <Button asChild variant="brand">
        <Link href={`/login?next=${encodeURIComponent(`/roadmaps/${roadmapSlug}`)}`}>
          <LogIn /> Sign in to start
        </Link>
      </Button>
    );
  }

  const hidden = (
    <>
      <input type="hidden" name="roadmapId" value={roadmapId} />
      <input type="hidden" name="roadmapSlug" value={roadmapSlug} />
      <input type="hidden" name="primary" value="true" />
    </>
  );

  if (!following) {
    return (
      <form action={followRoadmapAction}>
        {hidden}
        <SubmitButton variant="brand" pendingLabel="Starting…">
          <Play /> Start this roadmap
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {current ? (
        <Badge variant="success" className="h-8 px-2.5 text-sm">
          <Star /> Your current roadmap
        </Badge>
      ) : (
        <>
          <Badge variant="outline" className="h-8 px-2.5 text-sm">
            <Check /> Following
          </Badge>
          <form action={followRoadmapAction}>
            {hidden}
            <SubmitButton variant="outline" size="sm" pendingLabel="Saving…">
              <Star /> Set as current
            </SubmitButton>
          </form>
        </>
      )}
    </div>
  );
}
