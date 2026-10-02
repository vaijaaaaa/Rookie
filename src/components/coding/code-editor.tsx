"use client";

import { useEffect, useMemo, useRef } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { Prec, type Extension } from "@codemirror/state";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cn } from "@/lib/utils";
import type { CodeLanguage } from "@/types";

/**
 * CodeMirror 6 editor themed from the app's CSS variables, so it follows
 * light/dark automatically. Syntax colours are CSS vars set on the wrapper.
 * Loaded through next/dynamic (see `code-editor-lazy.tsx`).
 */

const baseTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "13px",
    backgroundColor: "transparent",
    color: "var(--foreground)",
  },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": {
    fontFamily: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
    lineHeight: "1.65",
  },
  ".cm-content": { padding: "12px 0", caretColor: "var(--brand)" },
  ".cm-line": { padding: "0 16px 0 8px" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--brand)", borderLeftWidth: "2px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
    { backgroundColor: "color-mix(in oklch, var(--brand) 22%, transparent) !important" },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--muted) 55%, transparent)" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    color: "color-mix(in oklch, var(--muted-foreground) 70%, transparent)",
    border: "none",
    borderRight: "1px solid var(--border)",
  },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 14px", minWidth: "40px" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-foldGutter .cm-gutterElement": { padding: "0 4px" },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "color-mix(in oklch, var(--brand) 18%, transparent)",
    outline: "1px solid color-mix(in oklch, var(--brand) 45%, transparent)",
  },
  ".cm-selectionMatch": { backgroundColor: "color-mix(in oklch, var(--info) 15%, transparent)" },
  ".cm-searchMatch": { backgroundColor: "color-mix(in oklch, var(--warning) 25%, transparent)" },
  ".cm-tooltip": {
    backgroundColor: "var(--popover)",
    color: "var(--popover-foreground)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    overflow: "hidden",
  },
  ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  ".cm-panels": { backgroundColor: "var(--card)", color: "var(--foreground)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "1px solid var(--border)" },
  ".cm-textfield": {
    backgroundColor: "var(--background)",
    border: "1px solid var(--input)",
    borderRadius: "4px",
  },
  ".cm-button": {
    backgroundImage: "none",
    backgroundColor: "var(--secondary)",
    border: "1px solid var(--border)",
    borderRadius: "4px",
  },
  ".cm-foldPlaceholder": {
    backgroundColor: "var(--muted)",
    border: "none",
    color: "var(--muted-foreground)",
  },
});

const highlight = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.modifier], color: "var(--cm-keyword)" },
  { tag: [t.string, t.special(t.string), t.regexp, t.character], color: "var(--cm-string)" },
  { tag: [t.number, t.bool, t.null, t.atom], color: "var(--cm-number)" },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: "var(--cm-comment)", fontStyle: "italic" },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.definition(t.function(t.variableName))], color: "var(--cm-function)" },
  { tag: [t.typeName, t.className, t.namespace, t.standard(t.variableName)], color: "var(--cm-type)" },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: "var(--foreground)" },
  { tag: [t.propertyName], color: "var(--cm-property)" },
  { tag: [t.self, t.special(t.variableName)], color: "var(--cm-keyword)" },
  { tag: [t.operator, t.punctuation, t.bracket, t.separator], color: "var(--cm-punct)" },
  { tag: [t.meta, t.annotation], color: "var(--cm-type)" },
  { tag: t.invalid, color: "var(--destructive)" },
]);

/** Mod-Enter / Shift-Mod-Enter → bubbling DOM events handled by the component. */
const shortcuts = Prec.highest(
  keymap.of([
    {
      key: "Mod-Enter",
      preventDefault: true,
      run: (view) => {
        view.dom.dispatchEvent(new CustomEvent("editor:run", { bubbles: true }));
        return true;
      },
    },
    {
      key: "Shift-Mod-Enter",
      preventDefault: true,
      run: (view) => {
        view.dom.dispatchEvent(new CustomEvent("editor:submit", { bubbles: true }));
        return true;
      },
    },
  ]),
);

const languageExtension: Record<CodeLanguage, () => Extension> = {
  java: () => java(),
  javascript: () => javascript(),
  python: () => python(),
};

export interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  onRun?: () => void;
  onSubmit?: () => void;
  className?: string;
  ariaLabel?: string;
}

export default function CodeEditor({ value, onChange, language, onRun, onSubmit, className, ariaLabel }: CodeEditorProps) {
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = wrapper.current;
    if (!el) return;
    const run = () => onRun?.();
    const submit = () => onSubmit?.();
    el.addEventListener("editor:run", run);
    el.addEventListener("editor:submit", submit);
    return () => {
      el.removeEventListener("editor:run", run);
      el.removeEventListener("editor:submit", submit);
    };
  }, [onRun, onSubmit]);

  const extensions = useMemo<Extension[]>(
    () => [
      baseTheme,
      syntaxHighlighting(highlight),
      indentUnit.of(language === "javascript" ? "  " : "    "),
      EditorView.contentAttributes.of({ "aria-label": ariaLabel ?? "Code editor" }),
      languageExtension[language](),
      shortcuts,
    ],
    [language, ariaLabel],
  );

  return (
    <div
      ref={wrapper}
      className={cn(
        "h-full min-h-0 overflow-hidden",
        // Syntax palette — calm, low-saturation; tuned per theme.
        "[--cm-keyword:oklch(0.5_0.17_300)] [--cm-string:oklch(0.52_0.12_60)] [--cm-number:oklch(0.55_0.16_30)]",
        "[--cm-comment:oklch(0.6_0.01_260)] [--cm-function:oklch(0.5_0.14_250)] [--cm-type:oklch(0.5_0.1_200)]",
        "[--cm-property:oklch(0.4_0.05_250)] [--cm-punct:oklch(0.45_0.01_260)]",
        "dark:[--cm-keyword:oklch(0.76_0.12_300)] dark:[--cm-string:oklch(0.82_0.1_75)] dark:[--cm-number:oklch(0.78_0.12_35)]",
        "dark:[--cm-comment:oklch(0.55_0.01_260)] dark:[--cm-function:oklch(0.78_0.1_245)] dark:[--cm-type:oklch(0.8_0.09_190)]",
        "dark:[--cm-property:oklch(0.85_0.04_245)] dark:[--cm-punct:oklch(0.7_0.01_260)]",
        className,
      )}
    >
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        theme="none"
        height="100%"
        className="h-full"
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          indentOnInput: true,
          tabSize: language === "javascript" ? 2 : 4,
        }}
        indentWithTab
      />
    </div>
  );
}
