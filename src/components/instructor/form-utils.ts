"use client";

import { toast } from "sonner";
import type { ActionResult } from "@/types";

/** Shows a toast for an ActionResult. Returns true on success. */
export function toastResult<T>(res: ActionResult<T>, success: string): res is { ok: true; data?: T; message?: string } {
  if (res.ok) {
    toast.success(res.message ?? success);
    return true;
  }
  toast.error(res.error);
  return false;
}

/** onKeyDown for <form>: ⌘/Ctrl+Enter submits from anywhere inside. */
export function submitOnModEnter(e: React.KeyboardEvent<HTMLFormElement>) {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    e.currentTarget.requestSubmit();
  }
}
