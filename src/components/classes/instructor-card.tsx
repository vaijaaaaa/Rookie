import { UserAvatar } from "@/components/ui/avatar";
import type { ClassPerson } from "@/services/classes";

export function InstructorCard({ instructor }: { instructor: ClassPerson | null }) {
  if (!instructor) {
    return <p className="text-sm text-muted-foreground">Instructor to be announced.</p>;
  }
  return (
    <div className="flex items-start gap-3">
      <UserAvatar name={instructor.full_name} src={instructor.avatar_url} className="size-10" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{instructor.full_name}</p>
        {instructor.username ? (
          <p className="truncate font-mono text-xs text-muted-foreground">@{instructor.username}</p>
        ) : null}
        {instructor.bio ? <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">{instructor.bio}</p> : null}
      </div>
    </div>
  );
}
