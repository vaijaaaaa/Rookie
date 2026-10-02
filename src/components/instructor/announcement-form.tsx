"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { saveAnnouncement } from "@/app/admin/announcements/actions";
import type { Announcement } from "@/types";
import { toastResult } from "./form-utils";

export function AnnouncementDialog({
  initial,
  courses,
}: {
  initial?: Pick<Announcement, "id" | "title" | "body" | "course_id" | "pinned">;
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [courseId, setCourseId] = useState(initial?.course_id ?? "");
  const [pinned, setPinned] = useState(initial?.pinned ?? false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await saveAnnouncement(initial?.id ?? null, { title, body, course_id: courseId, pinned });
      if (toastResult(res, initial ? "Announcement updated" : "Announcement published")) {
        setOpen(false);
        if (!initial) {
          setTitle("");
          setBody("");
          setPinned(false);
        }
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit announcement">
            <Pencil />
          </Button>
        ) : (
          <Button variant="brand">
            <Megaphone /> New announcement
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{initial ? "Edit announcement" : "New announcement"}</DialogTitle>
            <DialogDescription>
              {initial ? "Edits don't re-notify students." : "Students in the audience get a notification immediately."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="ann-title">Title</Label>
            <Input id="ann-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
              placeholder="Tomorrow's Java class moved to 11 AM" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ann-body">Message</Label>
            <Textarea id="ann-body" value={body} onChange={(e) => setBody(e.target.value)} required rows={5} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ann-course">Audience</Label>
            <NativeSelect id="ann-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Everyone (platform-wide)</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>Students in {c.title}</option>
              ))}
            </NativeSelect>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={pinned} onCheckedChange={(v) => setPinned(v === true)} />
            Pin to the top of student dashboards
          </label>
          <DialogFooter>
            <Button type="submit" variant="brand" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              {initial ? "Save" : "Publish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
