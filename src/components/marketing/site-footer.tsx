import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { BuiltBy } from "./built-by";

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Learn computer science systematically. Fundamentals first, then everything else.
          </p>
          <div className="pt-2">
            <BuiltBy />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-muted-foreground">
          <Link href="/roadmaps" className="hover:text-foreground">Roadmaps</Link>
          <Link href="/about" className="hover:text-foreground">About</Link>
          <Link href="/courses" className="hover:text-foreground">Courses</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/classes" className="hover:text-foreground">Classes</Link>
          <Link href="/login" className="hover:text-foreground">Log in</Link>
        </div>
      </div>
      <div className="border-t py-4 text-center font-mono text-[11px] text-muted-foreground">
        © {new Date().getFullYear()} rookie — built for people who want to actually understand.
      </div>
    </footer>
  );
}
