import { Badge } from "@/components/ui/badge";
import type { Difficulty, ProblemDifficulty } from "@/types";

const MAP = {
  easy: { label: "Easy", variant: "success" },
  medium: { label: "Medium", variant: "warning" },
  hard: { label: "Hard", variant: "danger" },
  beginner: { label: "Beginner", variant: "success" },
  intermediate: { label: "Intermediate", variant: "warning" },
  advanced: { label: "Advanced", variant: "danger" },
} as const;

export function DifficultyBadge({ value }: { value: Difficulty | ProblemDifficulty }) {
  const m = MAP[value];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
