import { BookOpen, ExternalLink, FileText, FolderGit2, Link as LinkIcon, Presentation, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { LessonResourceItem } from "@/services/courses";
import type { ResourceKind } from "@/types";

const KIND: Record<ResourceKind, { icon: LucideIcon; label: string }> = {
  article: { icon: FileText, label: "Article" },
  video: { icon: Video, label: "Video" },
  docs: { icon: BookOpen, label: "Docs" },
  repo: { icon: FolderGit2, label: "Repo" },
  slides: { icon: Presentation, label: "Slides" },
  other: { icon: LinkIcon, label: "Link" },
};

function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function LessonResources({ resources }: { resources: LessonResourceItem[] }) {
  if (resources.length === 0) {
    return <p className="text-sm text-muted-foreground">No extra resources for this lesson.</p>;
  }
  return (
    <ul className="space-y-1">
      {resources.map((r) => {
        const k = KIND[r.kind] ?? KIND.other;
        const Icon = k.icon;
        return (
          <li key={r.id}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group -mx-2 flex items-start gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground group-hover:text-brand" aria-label={k.label} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-foreground/90 group-hover:text-foreground">{r.title}</span>
                <span className="block truncate font-mono text-[11px] text-muted-foreground">
                  {k.label} · {host(r.url)}
                </span>
              </span>
              <ExternalLink className="mt-1 size-3 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
