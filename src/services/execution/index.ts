import type { CodeLanguage } from "@/types";
import { browserJsRunner } from "./browser-js-runner";
import { remoteRunner } from "./remote-runner";
import type { CodeRunner } from "./types";

export * from "./types";
export { SANDBOX_NOT_CONFIGURED } from "./remote-runner";

/**
 * Pick the runner for a language.
 * - javascript → in-browser Web Worker sandbox (client components only).
 * - java/python → remote sandbox service (returns "pending" until configured).
 *
 * To move JavaScript to the server-side judge as well, return `remoteRunner`
 * for every language once the service exists.
 */
export function getRunner(lang: CodeLanguage): CodeRunner {
  if (browserJsRunner.supports(lang)) return browserJsRunner;
  return remoteRunner;
}

/** True when the language can actually be executed in this deployment. */
export function canExecute(lang: CodeLanguage): boolean {
  return lang === "javascript" || remoteRunner.configured;
}
