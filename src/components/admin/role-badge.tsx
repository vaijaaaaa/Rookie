import { Badge } from "@/components/ui/badge";
import type { UserRole } from "@/types";

const MAP: Record<UserRole, { label: string; variant: "success" | "info" | "outline" }> = {
  admin: { label: "Admin", variant: "success" },
  instructor: { label: "Instructor", variant: "info" },
  student: { label: "Student", variant: "outline" },
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  const m = MAP[role];
  return (
    <Badge variant={m.variant} className={className}>
      {m.label}
    </Badge>
  );
}
