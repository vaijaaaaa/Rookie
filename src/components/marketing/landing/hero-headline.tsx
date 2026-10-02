"use client";

import { useEffect, useState } from "react";

const COMPANIES = ["Google", "Amazon", "Microsoft", "Flipkart", "Razorpay", "Zerodha", "Atlassian"];
const SCRAMBLE_WORD = "Structured.";
const GLYPHS = "!<>-_\\/[]{}=+*^?#01";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Types a company name, pauses, deletes it, moves to the next. */
function useTypewriter(words: string[]) {
  const [text, setText] = useState(words[0]!);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let word = 0;
    let len = words[0]!.length;
    let deleting = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (deleting) {
        len--;
        if (len === 0) {
          deleting = false;
          word = (word + 1) % words.length;
        }
      } else {
        len++;
      }
      const target = words[word]!;
      setText(target.slice(0, len));
      let delay = deleting ? 45 : 90;
      if (!deleting && len === target.length) {
        deleting = true;
        delay = 2200;
      } else if (deleting && len === 0) {
        delay = 250;
      }
      timer = setTimeout(tick, delay);
    };
    timer = setTimeout(tick, 2600);
    return () => clearTimeout(timer);
  }, [words]);
  return text;
}

/** Resolves a word left-to-right out of random glyphs, once, after a delay. */
function useScramble(word: string, delayMs: number) {
  const [text, setText] = useState(word);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;
    let raf = 0;
    const start = setTimeout(function run() {
      const settled = Math.floor(frame / 3);
      setText(
        word
          .split("")
          .map((ch, i) => (i < settled || ch === "." ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!))
          .join(""),
      );
      frame++;
      if (settled <= word.length) raf = requestAnimationFrame(run);
      else setText(word);
    }, delayMs);
    return () => {
      clearTimeout(start);
      cancelAnimationFrame(raf);
    };
  }, [word, delayMs]);
  return text;
}

export function HeroHeadline() {
  const company = useTypewriter(COMPANIES);
  const scrambled = useScramble(SCRAMBLE_WORD, 500);
  return (
    <h1 id="hero-title" className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance sm:text-6xl lg:text-7xl">
      <span className="sr-only">The CS fundamentals every top engineer knows. Structured.</span>
      <span aria-hidden className="block">
        Everything a{" "}
        <span className="inline-flex min-w-[4ch] items-baseline text-muted-foreground">
          {company}
          <span className="landing-caret ml-0.5 inline-block h-[0.8em] w-[3px] translate-y-[0.06em] self-center bg-brand" />
        </span>
      </span>
      <span aria-hidden className="block">
        engineer knows.{" "}
        <span className="font-mono font-medium tracking-[-0.06em] text-brand">{scrambled}</span>
      </span>
    </h1>
  );
}
