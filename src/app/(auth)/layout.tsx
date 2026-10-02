import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";

/** Centered card layout for login and password flows. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:40px_40px] opacity-30 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
      />
      <header className="relative flex h-14 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>
      <main id="main" className="relative flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-sm">{children}</div>
      </main>
      <footer className="relative pb-6 text-center font-mono text-[11px] text-muted-foreground">
        <Link href="/about" className="hover:text-foreground">about</Link>
        <span className="px-2" aria-hidden>·</span>
        <Link href="/pricing" className="hover:text-foreground">pricing</Link>
      </footer>
    </div>
  );
}
