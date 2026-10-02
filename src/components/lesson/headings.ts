/** Heading utilities shared by the lesson markdown renderer and its table of contents. */

export interface TocHeading {
  id: string;
  text: string;
  depth: 2 | 3;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, "-") || "section"
  );
}

/** Stateful slugger producing GitHub-style unique ids (`intro`, `intro-1`, …). */
export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    const base = slugify(text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n}`;
  };
}

/** Strip inline markdown so line-parsed headings match rendered heading text. */
function plainInline(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim();
}

/**
 * Extracts ## and ### headings (outside fenced code) in document order.
 * Ids are assigned with the same slugger the renderer uses, so they match.
 */
export function extractHeadings(markdown: string): TocHeading[] {
  const slug = createSlugger();
  const out: TocHeading[] = [];
  let fence: string | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const f = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      const marker = f[1]!;
      if (!fence) fence = marker[0]!.repeat(marker.length);
      else if (marker.startsWith(fence)) fence = null;
      continue;
    }
    if (fence) continue;
    const m = line.match(/^\s{0,3}(#{1,6})\s+(.+)$/);
    if (!m) continue;
    const depth = m[1]!.length;
    const text = plainInline(m[2]!);
    // Every heading consumes a slug (renderer does the same) to keep ids aligned.
    const id = slug(text);
    if (depth === 2 || depth === 3) out.push({ id, text, depth });
  }
  return out;
}

/** Flattens React children (strings, numbers, elements) into plain text. */
export function nodeText(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (typeof node === "object" && "props" in node) {
    return nodeText((node as { props?: { children?: unknown } }).props?.children);
  }
  return "";
}
