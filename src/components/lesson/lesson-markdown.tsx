import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CopyCodeButton } from "./copy-code-button";
import { createSlugger, nodeText } from "./headings";

// Minimal hast shape — avoids depending on @types/hast directly.
interface HastNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function hastText(node: HastNode): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(hastText).join("");
}

/** Rehype plugin: assigns slug ids to h1–h6 in document order (matches extractHeadings). */
function rehypeHeadingIds() {
  return (tree: unknown) => {
    const slug = createSlugger();
    const walk = (node: HastNode) => {
      if (node.type === "element" && node.tagName && /^h[1-6]$/.test(node.tagName)) {
        node.properties = { ...node.properties, id: slug(hastText(node)) };
      }
      node.children?.forEach(walk);
    };
    walk(tree as HastNode);
  };
}

function headingWithAnchor(Tag: "h2" | "h3" | "h4") {
  return function Heading({ id, children, className }: React.ComponentProps<"h2">) {
    return (
      <Tag id={id} className={cn("group scroll-mt-24", className)}>
        {children}
        {id ? (
          <a
            href={`#${id}`}
            aria-label="Link to this section"
            className="ml-2 inline-flex align-middle text-muted-foreground no-underline opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Link2 className="size-4" />
          </a>
        ) : null}
      </Tag>
    );
  };
}

/** Drops react-markdown's `node` prop so it isn't forwarded to the DOM. */
function omitNode<T extends { node?: unknown }>(props: T): Omit<T, "node"> {
  const rest = { ...props };
  delete rest.node;
  return rest;
}

const components: Components = {
  h2: headingWithAnchor("h2"),
  h3: headingWithAnchor("h3"),
  h4: headingWithAnchor("h4"),
  a(allProps) {
    const { href, children, ...props } = omitNode(allProps);
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a href={href} {...props} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
        {children}
      </a>
    );
  },
  pre(allProps) {
    const { children, ...props } = omitNode(allProps);
    const code = Array.isArray(children) ? children[0] : children;
    const className =
      code && typeof code === "object" && "props" in code
        ? String((code as { props?: { className?: string } }).props?.className ?? "")
        : "";
    const lang = className.match(/language-([\w+#-]+)/)?.[1];
    const raw = nodeText(children).replace(/\n$/, "");
    return (
      <div className="not-prose group/code relative my-6 overflow-hidden rounded-lg border bg-[oklch(0.16_0.005_260)]">
        <div className="flex h-8 items-center justify-between border-b border-white/10 px-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-white/50">{lang ?? "code"}</span>
          <CopyCodeButton code={raw} />
        </div>
        <pre
          {...props}
          className="m-0 overflow-x-auto bg-transparent p-4 font-mono text-[0.85rem] leading-6 text-[oklch(0.92_0.005_260)] [&_code]:bg-transparent [&_code]:p-0"
        >
          {children}
        </pre>
      </div>
    );
  },
  table(allProps) {
    const { children, ...props } = omitNode(allProps);
    return (
      <div className="my-6 overflow-x-auto rounded-lg border">
        <table {...props} className="my-0">
          {children}
        </table>
      </div>
    );
  },
};

/**
 * Lesson-specific markdown: GFM, syntax highlighting, heading ids/anchors
 * (for the on-page table of contents), and code blocks with a language label
 * and copy button.
 */
export function LessonMarkdown({ children, className }: { children: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose-tech prose-base md:prose-lg md:prose-p:leading-8 prose-headings:scroll-mt-24 prose-li:my-1",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHeadingIds, [rehypeHighlight, { detect: true }]]}
        components={components}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
