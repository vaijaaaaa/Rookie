import type { CodeLanguage, CodeVerdict } from "@/types";
import type { CodeRunner, RunRequest, RunResult, TestResult } from "./types";

/**
 * Adapter for an external, isolated execution service (Judge0 / Piston /
 * Firecracker). The service is expected to accept a `RunRequest` as JSON and
 * reply with a `RunResult`-shaped JSON body.
 *
 * Until `NEXT_PUBLIC_CODE_RUNNER_URL` is configured, Java and Python cannot be
 * executed and every run resolves with verdict "pending".
 *
 * Production notes for whoever wires the real service:
 * - Hidden tests must be fetched and executed server-side (service role), never
 *   shipped to the browser. Students can only read `is_sample` tests via RLS.
 * - Verdicts should be written by the judge (service role), not reported by the
 *   client as in this MVP.
 */

const VERDICTS: CodeVerdict[] = ["pending", "accepted", "wrong_answer", "runtime_error", "compile_error", "time_limit"];

export const SANDBOX_NOT_CONFIGURED = "Java/Python execution requires the sandbox service (not configured)";

function pending(message: string): RunResult {
  return { verdict: "pending", results: [], runtimeMs: 0, logs: [message] };
}

function parseResult(raw: unknown, req: RunRequest): RunResult {
  if (!raw || typeof raw !== "object") throw new Error("Malformed response from sandbox");
  const r = raw as Partial<RunResult>;
  const verdict = VERDICTS.includes(r.verdict as CodeVerdict) ? (r.verdict as CodeVerdict) : "pending";
  const results: TestResult[] = Array.isArray(r.results)
    ? r.results.map((x, i) => ({
        passed: Boolean(x?.passed),
        input: Array.isArray(x?.input) ? x.input : (req.tests[i]?.input ?? []),
        expected: x?.expected ?? req.tests[i]?.expected,
        actual: x?.actual,
        error: typeof x?.error === "string" ? x.error : undefined,
        stdout: typeof x?.stdout === "string" ? x.stdout : "",
        runtimeMs: typeof x?.runtimeMs === "number" ? x.runtimeMs : undefined,
      }))
    : [];
  return {
    verdict,
    results,
    runtimeMs: typeof r.runtimeMs === "number" ? Math.round(r.runtimeMs) : 0,
    logs: Array.isArray(r.logs) ? r.logs.filter((l): l is string => typeof l === "string") : [],
  };
}

export class RemoteRunner implements CodeRunner {
  readonly id = "remote-sandbox";

  constructor(private readonly endpoint: string | undefined = process.env.NEXT_PUBLIC_CODE_RUNNER_URL) {}

  get configured() {
    return Boolean(this.endpoint);
  }

  supports(lang: CodeLanguage) {
    return lang === "java" || lang === "python" || lang === "javascript";
  }

  async run(req: RunRequest): Promise<RunResult> {
    if (!this.endpoint) return pending(SANDBOX_NOT_CONFIGURED);

    const controller = new AbortController();
    // Allow for queueing/network on top of the execution limit.
    const timer = setTimeout(() => controller.abort(), req.timeoutMs + 10_000);
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      if (!res.ok) return pending(`Sandbox service error (HTTP ${res.status}). Try again later.`);
      return parseResult(await res.json(), req);
    } catch (e) {
      if (controller.signal.aborted) return pending("Sandbox service did not respond in time.");
      return pending(`Sandbox service unreachable: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      clearTimeout(timer);
    }
  }
}

export const remoteRunner = new RemoteRunner();
