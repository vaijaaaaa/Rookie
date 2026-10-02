"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { createResource, deleteResource, moveResource, updateResource } from "@/app/admin/courses/actions";
import { resourceSchema, type ResourceInput } from "@/services/instructor/schemas";
import { RESOURCE_KINDS, titleCase } from "@/services/instructor/utils";
import type { LessonResource } from "@/types";
import { ConfirmAction } from "./confirm-action";
import { MoveButtons } from "./move-buttons";
import { FormSection } from "./field";
import { toastResult } from "./form-utils";
import { toast } from "sonner";

const EMPTY: ResourceInput = { title: "", url: "", kind: "article" };

function ResourceRow({
  resource,
  index,
  count,
  lessonId,
}: {
  resource?: LessonResource;
  index?: number;
  count?: number;
  lessonId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initial: ResourceInput = resource ? { title: resource.title, url: resource.url, kind: resource.kind } : EMPTY;
  const [values, setValues] = useState<ResourceInput>(initial);
  const dirty = values.title !== initial.title || values.url !== initial.url || values.kind !== initial.kind;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = resourceSchema.safeParse(values);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid resource");
      return;
    }
    startTransition(async () => {
      const res = resource ? await updateResource(resource.id, parsed.data) : await createResource(lessonId, parsed.data);
      if (toastResult(res, resource ? "Resource saved" : "Resource added")) {
        if (!resource) setValues(EMPTY);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1.5fr_8rem_auto] sm:items-center">
      <Input
        value={values.title}
        onChange={(e) => setValues({ ...values, title: e.target.value })}
        placeholder="Title"
        aria-label="Resource title"
      />
      <Input
        value={values.url}
        onChange={(e) => setValues({ ...values, url: e.target.value })}
        placeholder="https://…"
        aria-label="Resource URL"
        className="font-mono text-xs"
      />
      <NativeSelect value={values.kind} onChange={(e) => setValues({ ...values, kind: e.target.value as ResourceInput["kind"] })} aria-label="Kind">
        {RESOURCE_KINDS.map((k) => (
          <option key={k} value={k}>
            {titleCase(k)}
          </option>
        ))}
      </NativeSelect>
      <div className="flex items-center justify-end gap-1">
        {resource ? (
          <>
            <Button type="submit" variant="ghost" size="icon-sm" disabled={!dirty || pending} aria-label="Save resource">
              {pending ? <Loader2 className="animate-spin" /> : <Save />}
            </Button>
            <MoveButtons action={moveResource.bind(null, resource.id)} isFirst={index === 0} isLast={index === (count ?? 0) - 1} label="resource" />
            <ConfirmAction action={deleteResource.bind(null, resource.id)} title="Delete resource?" successMessage="Resource deleted" />
          </>
        ) : (
          <Button type="submit" size="sm" variant="outline" disabled={pending || !values.title || !values.url}>
            {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
          </Button>
        )}
      </div>
    </form>
  );
}

export function LessonResources({ lessonId, resources }: { lessonId: string; resources: LessonResource[] }) {
  return (
    <FormSection title={`Resources · ${resources.length}`} description="Further reading, docs, repos, slides.">
      {resources.map((r, i) => (
        <ResourceRow key={`${r.id}:${r.title}:${r.url}:${r.kind}`} resource={r} index={i} count={resources.length} lessonId={lessonId} />
      ))}
      <ResourceRow lessonId={lessonId} />
    </FormSection>
  );
}
