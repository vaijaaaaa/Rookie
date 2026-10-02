import type { CodeLanguage, CodeVerdict } from "@/types";

/**
 * Execution layer contract.
 *
 * The app never executes user code on its own servers. A `CodeRunner` is either
 * a client-side sandbox (Web Worker for JavaScript) or an adapter for a remote,
 * isolated judge service (Judge0 / Piston / Firecracker microVMs). New backends
 * only need to implement this interface and be registered in `./index.ts`.
 */

export interface RunTest {
  /** Positional arguments passed to `functionName(...input)`. */
  input: unknown[];
  expected: unknown;
}

export interface RunRequest {
  language: CodeLanguage;
  code: string;
  functionName: string;
  tests: RunTest[];
  /** Wall-clock limit for the whole run. */
  timeoutMs: number;
}

export interface TestResult {
  passed: boolean;
  input: unknown[];
  expected: unknown;
  /** Return value (undefined when the call threw or did not finish). */
  actual?: unknown;
  error?: string;
  /** console output produced while running this test. */
  stdout: string;
  runtimeMs?: number;
}

export interface RunResult {
  verdict: CodeVerdict;
  results: TestResult[];
  runtimeMs: number;
  /** Runner-level messages (compile errors, timeouts, "not configured", ...). */
  logs: string[];
}

export interface CodeRunner {
  readonly id: string;
  supports(lang: CodeLanguage): boolean;
  run(req: RunRequest): Promise<RunResult>;
}

/** Default limits shared by the UI. */
export const DEFAULT_TIMEOUT_MS = 3000;
export const MAX_CODE_LENGTH = 50_000;
