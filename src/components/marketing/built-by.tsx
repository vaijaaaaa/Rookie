import Image from "next/image";

const GITHUB_USER = "vaijaaaaa";
const GITHUB_URL = `https://github.com/${GITHUB_USER}`;
const LINKEDIN_URL = "https://www.linkedin.com/in/vaijnath-patil-585555310/";

function GithubMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

function LinkedinMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden className={className}>
      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146Zm4.943 12.248V6.169H2.542v7.225h2.401Zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016Zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4Z" />
    </svg>
  );
}

const SOCIALS = [
  { href: GITHUB_URL, label: "GitHub", Icon: GithubMark },
  { href: LINKEDIN_URL, label: "LinkedIn", Icon: LinkedinMark },
];

/** "Built by" credit with an animated GitHub avatar and social links. */
export function BuiltBy() {
  return (
    <div className="group inline-flex items-center gap-3 rounded-lg border bg-card/60 py-2 pr-2 pl-2 transition-colors hover:border-brand/40 hover:bg-card">
      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <span className="relative flex size-11 shrink-0 items-center justify-center">
          {/* rotating gradient ring */}
          <span
            aria-hidden
            className="absolute inset-0 animate-[spin_6s_linear_infinite] rounded-full bg-[conic-gradient(from_0deg,var(--brand),transparent_40%,var(--brand)_60%,transparent)] opacity-70 transition-opacity group-hover:animate-[spin_2s_linear_infinite] group-hover:opacity-100"
          />
          <span className="absolute inset-[2px] rounded-full bg-background" aria-hidden />
          <Image
            src={`${GITHUB_URL}.png?size=96`}
            alt={`${GITHUB_USER} on GitHub`}
            width={40}
            height={40}
            className="relative size-10 rounded-full transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6"
          />
          {/* status dot */}
          <span className="absolute right-0 bottom-0 flex size-3" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex size-3 rounded-full border-2 border-background bg-brand" />
          </span>
        </span>
        <span className="flex flex-col leading-tight">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Built by</span>
          <span className="text-sm font-medium">Vaijnath Patil</span>
        </span>
      </a>
      <span className="h-8 w-px bg-border" aria-hidden />
      <div className="flex items-center gap-1">
        {SOCIALS.map(({ href, label, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Vaijnath Patil on ${label}`}
            title={label}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon className="size-4" />
          </a>
        ))}
      </div>
    </div>
  );
}
