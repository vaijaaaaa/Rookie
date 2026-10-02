import type { CodeLanguage } from "@/types";
import type { CodeRunner, RunRequest, RunResult, TestResult } from "./types";

/**
 * Client-side JavaScript runner.
 *
 * User code runs inside a dedicated Web Worker created from a Blob URL:
 * - no DOM, no access to the page's JS heap or React state;
 * - network-capable globals (fetch, XMLHttpRequest, WebSocket, importScripts, ...)
 *   are shadowed by the prelude before user code is evaluated;
 * - a hard wall-clock timeout calls `worker.terminate()` (infinite loops → time_limit).
 *
 * This is defence in depth for code the student typed into their own browser;
 * it is NOT a judge. Anything that must be trusted (hidden tests, verdicts that
 * affect grades) must run in the server-side sandbox behind `remote-runner.ts`.
 */

// Plain-JS worker source. Kept as a string so the bundler never transforms it.
const WORKER_SOURCE = String.raw`
"use strict";
const __post = self.postMessage.bind(self);
const __now = () => (self.performance && performance.now ? performance.now() : Date.now());

(function lockdown() {
  const blocked = [
    "fetch", "XMLHttpRequest", "importScripts", "WebSocket", "WebSocketStream", "EventSource",
    "Worker", "SharedWorker", "BroadcastChannel", "indexedDB", "caches", "Request",
    "WebTransport", "postMessage", "close",
  ];
  const deny = (name) => function () { throw new Error(name + " is disabled in the sandbox"); };
  let target = self;
  while (target && target !== Object.prototype) {
    for (const name of blocked) {
      try {
        if (Object.prototype.hasOwnProperty.call(target, name) || target === self) {
          Object.defineProperty(target, name, { value: deny(name), writable: false, configurable: false });
        }
      } catch (_) { /* non-configurable: ignore */ }
    }
    target = Object.getPrototypeOf(target);
  }
  try { Object.defineProperty(self, "navigator", { value: undefined, configurable: false }); } catch (_) {}
})();

const MAX_STDOUT = 8000;
let __buffer = "";
let __truncated = false;

function __fmt(v) {
  if (typeof v === "string") return v;
  if (typeof v === "undefined") return "undefined";
  if (typeof v === "function") return "[Function " + (v.name || "anonymous") + "]";
  if (typeof v === "bigint") return v.toString() + "n";
  if (v instanceof Error) return v.name + ": " + v.message;
  try {
    const seen = new WeakSet();
    return JSON.stringify(v, (k, x) => {
      if (typeof x === "bigint") return x.toString() + "n";
      if (x instanceof Map) return Object.fromEntries(x);
      if (x instanceof Set) return Array.from(x);
      if (typeof x === "object" && x !== null) {
        if (seen.has(x)) return "[Circular]";
        seen.add(x);
      }
      return x;
    });
  } catch (_) {
    return String(v);
  }
}

function __write(level, args) {
  if (__truncated) return;
  const line = (level ? "[" + level + "] " : "") + Array.prototype.map.call(args, __fmt).join(" ") + "\n";
  if (__buffer.length + line.length > MAX_STDOUT) {
    __buffer += line.slice(0, Math.max(0, MAX_STDOUT - __buffer.length)) + "\n… output truncated\n";
    __truncated = true;
  } else {
    __buffer += line;
  }
}

const __console = {
  log: function () { __write("", arguments); },
  info: function () { __write("", arguments); },
  debug: function () { __write("", arguments); },
  warn: function () { __write("warn", arguments); },
  error: function () { __write("error", arguments); },
  table: function () { __write("", arguments); },
  dir: function () { __write("", arguments); },
};
try { Object.defineProperty(self, "console", { value: __console, writable: false, configurable: false }); } catch (_) {}

function __takeStdout() {
  const out = __buffer;
  __buffer = "";
  __truncated = false;
  return out;
}

// JSON-normalise a returned value (the expected outputs are JSON).
function __normalize(v) {
  if (v === undefined) return { ok: true, value: undefined };
  try {
    const s = JSON.stringify(v, (k, x) => {
      if (typeof x === "bigint") throw new Error("BigInt return values are not supported");
      return x;
    });
    return { ok: true, value: s === undefined ? undefined : JSON.parse(s) };
  } catch (e) {
    return { ok: false, error: "Return value is not JSON-serializable: " + (e && e.message ? e.message : String(e)) };
  }
}

const EPS = 1e-6;
function __equal(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true; // also -0 === 0
    if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
    return Math.abs(a - b) <= EPS * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (a === b) return true;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!__equal(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!__equal(a[k], b[k])) return false;
  }
  return true;
}

function __errMsg(e) {
  if (e && typeof e === "object" && "message" in e) {
    const name = e.name ? e.name + ": " : "";
    let stack = "";
    if (typeof e.stack === "string" && !(e instanceof SyntaxError)) {
      // Keep only frames from user code (evaluated via new Function → "<anonymous>:line:col"),
      // and map line numbers back to the editor (new Function adds a 2-line header).
      const frames = e.stack
        .split("\n")
        .slice(1)
        .map((l) => l.trim())
        .filter((l) => /<anonymous>:\d+:\d+\)?$/.test(l) && !/^at (async )?(__|new Function|self\.)/.test(l))
        .slice(0, 4)
        .map((l) => {
          const m = /^at (?:(\S+) \()?.*<anonymous>:(\d+):(\d+)\)?$/.exec(l);
          return m ? "    at " + (m[1] || "<anonymous>") + " (line " + Math.max(1, Number(m[2]) - 2) + ")" : "    " + l;
        });
      if (frames.length) stack = "\n" + frames.join("\n");
    }
    return name + e.message + stack;
  }
  return "Uncaught " + __fmt(e);
}

async function __run(data) {
  const { code, functionName, tests } = data;
  let fn;
  try {
    const factory = new Function(
      code + "\n;return (typeof " + functionName + " === 'function') ? " + functionName + " : undefined;",
    );
    fn = factory();
  } catch (e) {
    const kind = e instanceof SyntaxError ? "compile_error" : "runtime_error";
    __post({ type: "fatal", kind, message: __errMsg(e), stdout: __takeStdout() });
    return;
  }
  if (typeof fn !== "function") {
    __post({
      type: "fatal",
      kind: "compile_error",
      message: "Function \"" + functionName + "\" is not defined. Keep the starter signature.",
      stdout: __takeStdout(),
    });
    return;
  }
  const preamble = __takeStdout();
  __post({ type: "started", stdout: preamble });

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    __post({ type: "begin", index: i });
    const args = structuredClone(t.input);
    const t0 = __now();
    try {
      let out = fn.apply(undefined, args);
      if (out && typeof out.then === "function") out = await out;
      const runtimeMs = __now() - t0;
      const n = __normalize(out);
      if (!n.ok) {
        __post({ type: "result", index: i, passed: false, error: n.error, stdout: __takeStdout(), runtimeMs });
      } else {
        const passed = n.value !== undefined && __equal(n.value, t.expected);
        __post({ type: "result", index: i, passed, actual: n.value, stdout: __takeStdout(), runtimeMs });
      }
    } catch (e) {
      const runtimeMs = __now() - t0;
      __post({ type: "result", index: i, passed: false, error: __errMsg(e), stdout: __takeStdout(), runtimeMs });
    }
  }
  __post({ type: "done" });
}

self.addEventListener("message", (ev) => { __run(ev.data); }, { once: true });
`;

type WorkerMessage =
  | { type: "fatal"; kind: "compile_error" | "runtime_error"; message: string; stdout: string }
  | { type: "started"; stdout: string }
  | { type: "begin"; index: number }
  | {
      type: "result";
      index: number;
      passed: boolean;
      actual?: unknown;
      error?: string;
      stdout: string;
      runtimeMs: number;
    }
  | { type: "done" };

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function round(ms: number) {
  return Math.max(0, Math.round(ms));
}

export class BrowserJsRunner implements CodeRunner {
  readonly id = "browser-js";

  supports(lang: CodeLanguage) {
    return lang === "javascript";
  }

  run(req: RunRequest): Promise<RunResult> {
    const { code, functionName, tests, timeoutMs } = req;

    if (!IDENT.test(functionName)) {
      return Promise.resolve({
        verdict: "compile_error",
        results: [],
        runtimeMs: 0,
        logs: [`Invalid function name "${functionName}".`],
      });
    }
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return Promise.resolve({
        verdict: "pending",
        results: [],
        runtimeMs: 0,
        logs: ["JavaScript runs in your browser; Web Workers are not available here."],
      });
    }

    return new Promise<RunResult>((resolve) => {
      const results: (TestResult | undefined)[] = tests.map(() => undefined);
      const logs: string[] = [];
      let current = -1;
      let settled = false;
      let worker: Worker;
      let url: string | null = null;

      const finish = (verdict: RunResult["verdict"] | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker?.terminate();
        if (url) URL.revokeObjectURL(url);

        const filled: TestResult[] = tests.map(
          (t, i) =>
            results[i] ?? {
              passed: false,
              input: t.input,
              expected: t.expected,
              error: i === current ? `Time limit exceeded (${timeoutMs} ms)` : "Not executed",
              stdout: "",
            },
        );
        const runtimeMs = round(filled.reduce((sum, r) => sum + (r.runtimeMs ?? 0), 0));
        let v = verdict;
        if (!v) {
          if (filled.length === 0) {
            v = "pending";
            logs.push("No test cases to run.");
          } else if (filled.some((r) => r.error && !r.passed && r.actual === undefined)) v = "runtime_error";
          else if (filled.some((r) => !r.passed)) v = "wrong_answer";
          else v = "accepted";
        }
        resolve({ verdict: v, results: verdict === "compile_error" ? [] : filled, runtimeMs, logs });
      };

      try {
        url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
        worker = new Worker(url, { name: "rookie-sandbox" });
      } catch (e) {
        if (url) URL.revokeObjectURL(url);
        resolve({
          verdict: "runtime_error",
          results: [],
          runtimeMs: 0,
          logs: [`Could not start the sandbox worker: ${e instanceof Error ? e.message : String(e)}`],
        });
        return;
      }

      const timer = setTimeout(() => {
        logs.push(`Time limit exceeded: execution was stopped after ${timeoutMs} ms.`);
        finish("time_limit");
      }, timeoutMs);

      worker.onmessage = (ev: MessageEvent<WorkerMessage>) => {
        const msg = ev.data;
        switch (msg.type) {
          case "fatal":
            if (msg.stdout) logs.push(msg.stdout.trimEnd());
            logs.push(msg.message);
            finish(msg.kind);
            break;
          case "started":
            if (msg.stdout) logs.push(msg.stdout.trimEnd());
            break;
          case "begin":
            current = msg.index;
            break;
          case "result": {
            const t = tests[msg.index];
            if (!t) break;
            results[msg.index] = {
              passed: msg.passed,
              input: t.input,
              expected: t.expected,
              actual: msg.actual,
              error: msg.error,
              stdout: msg.stdout,
              runtimeMs: msg.runtimeMs,
            };
            break;
          }
          case "done":
            finish(null);
            break;
        }
      };
      worker.onerror = (ev) => {
        ev.preventDefault();
        logs.push(ev.message || "Uncaught error in sandbox");
        // Errors thrown asynchronously (e.g. inside setTimeout) surface here.
        const isSyntax = /SyntaxError/.test(ev.message ?? "");
        finish(isSyntax ? "compile_error" : "runtime_error");
      };
      worker.onmessageerror = () => {
        logs.push("A value could not be transferred out of the sandbox.");
        finish("runtime_error");
      };

      worker.postMessage({ code, functionName, tests });
    });
  }
}

export const browserJsRunner = new BrowserJsRunner();
