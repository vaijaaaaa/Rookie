import { BookOpen, ClipboardList, Code2, ListTodo, Repeat, Video, type LucideIcon } from "lucide-react";
import type { AgendaItemType, Priority } from "@/types";

export const AGENDA_TYPE_META: Record<AgendaItemType, { label: string; icon: LucideIcon }> = {
  task: { label: "Task", icon: ListTodo },
  class: { label: "Class", icon: Video },
  assignment: { label: "Assignment", icon: ClipboardList },
  problem: { label: "Problem", icon: Code2 },
  study: { label: "Study", icon: BookOpen },
  revision: { label: "Revision", icon: Repeat },
};

export const PRIORITY_META: Record<Priority, { label: string; variant: "outline" | "warning" | "danger" }> = {
  low: { label: "Low", variant: "outline" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "danger" },
};

/** Types a student may choose for personal items. */
export const PERSONAL_AGENDA_TYPES = ["task", "study", "revision", "problem"] as const satisfies readonly AgendaItemType[];
