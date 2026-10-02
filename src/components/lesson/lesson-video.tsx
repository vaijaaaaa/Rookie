import { ExternalLink, PlayCircle } from "lucide-react";

/** Parses YouTube start times: plain seconds ("90", "90s") or h/m/s ("1h2m3s", "1m30s"). */
function parseStart(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);
  const m = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

/** Returns a privacy-friendly YouTube embed URL for watch/short/embed links, else null. */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
        id = m?.[1] ?? null;
      }
    }
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    const seconds = parseStart(u.searchParams.get("t") ?? u.searchParams.get("start"));
    return `https://www.youtube-nocookie.com/embed/${id}${seconds != null ? `?start=${seconds}` : ""}`;
  } catch {
    return null;
  }
}

export function LessonVideo({ url, title }: { url: string; title: string }) {
  const embed = youtubeEmbedUrl(url);
  if (embed) {
    return (
      <div className="overflow-hidden rounded-lg border bg-black">
        <div className="relative aspect-video">
          <iframe
            src={embed}
            title={title}
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        </div>
      </div>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:bg-accent/40"
    >
      <PlayCircle className="size-5 text-brand" />
      <span className="flex-1 font-medium">Watch the video for this lesson</span>
      <ExternalLink className="size-4 text-muted-foreground" />
    </a>
  );
}
