"use client";

import { startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="font-mono text-sm text-destructive">error</p>
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-sm text-muted-foreground">{error.message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          startTransition(() => {
            // Re-fetch server components too; reset() alone only re-renders the client boundary.
            router.refresh();
            reset();
          })
        }
      >
        Try again
      </Button>
    </div>
  );
}
