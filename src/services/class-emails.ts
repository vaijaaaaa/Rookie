import "server-only";
import { SITE_URL } from "@/lib/supabase/env";
import { escapeHtml, type EmailMessage } from "@/lib/email";
import { formatDate } from "@/lib/utils/format";
import type { ClassSession } from "@/types";
import type { Supabase } from "./instructor/context";

export type ClassEmailKind = "scheduled" | "rescheduled" | "cancelled";

type EmailClass = Pick<ClassSession, "id" | "title" | "description" | "starts_at" | "duration_minutes" | "course_id">;

interface Recipient {
  email: string;
  full_name: string;
}

const PAGE = 1000; // PostgREST's default max rows per response

type RecipientRow = { email: string | null; full_name: string };

/** Fetches every page of a ranged query (PostgREST caps each response at 1000 rows). */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Students on the class roster: everyone for open classes, else the course's enrolled students. */
export async function getClassRecipients(supabase: Supabase, courseId: string | null): Promise<Recipient[]> {
  let rows: RecipientRow[];
  if (courseId) {
    const enrolled = await fetchAll((from, to) =>
      supabase
        .from("course_enrollments")
        .select("profile:profiles!inner(email, full_name, role)")
        .eq("course_id", courseId)
        .eq("profile.role", "student")
        .order("user_id")
        .range(from, to)
        .overrideTypes<{ profile: RecipientRow }[], { merge: false }>(),
    );
    rows = enrolled.map((e) => e.profile);
  } else {
    rows = await fetchAll((from, to) =>
      supabase
        .from("profiles")
        .select("email, full_name")
        .eq("role", "student")
        .order("id")
        .range(from, to)
        .overrideTypes<RecipientRow[], { merge: false }>(),
    );
  }
  return rows.filter((p): p is Recipient => !!p.email && p.email.includes("@"));
}

const HEADLINE: Record<ClassEmailKind, string> = {
  scheduled: "A new class has been scheduled",
  rescheduled: "A class has been rescheduled",
  cancelled: "A class has been cancelled",
};

const SUBJECT: Record<ClassEmailKind, string> = {
  scheduled: "Class scheduled",
  rescheduled: "Class rescheduled",
  cancelled: "Class cancelled",
};

/** One personalised email per student, with times in IST. */
export function buildClassEmails(
  kind: ClassEmailKind,
  cls: EmailClass,
  recipients: Recipient[],
  courseTitle: string | null,
): EmailMessage[] {
  const when = `${formatDate(cls.starts_at, "EEEE, MMM d, yyyy 'at' h:mm a")} IST`;
  const link = `${SITE_URL.replace(/\/$/, "")}/class/${cls.id}`;
  const subject = `${SUBJECT[kind]}: ${cls.title} — ${formatDate(cls.starts_at, "MMM d, h:mm a")} IST`;
  const details = [
    ["When", when],
    ["Duration", `${cls.duration_minutes} minutes`],
    ...(courseTitle ? [["Course", courseTitle]] : []),
  ] as [string, string][];
  const description = cls.description.trim();

  return recipients.map((r) => {
    const name = r.full_name.trim().split(/\s+/)[0] || "there";
    const text = [
      `Hi ${name},`,
      "",
      `${HEADLINE[kind]}: ${cls.title}`,
      "",
      ...details.map(([k, v]) => `${k}: ${v}`),
      ...(description && kind !== "cancelled" ? ["", description] : []),
      "",
      kind === "cancelled" ? `Details: ${link}` : `View the class and join link: ${link}`,
      "",
      "— Rookie",
    ].join("\n");
    const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f6f7;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111">
<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px">
<p style="margin:0 0 12px">Hi ${escapeHtml(name)},</p>
<p style="margin:0 0 4px;color:#555;font-size:13px;text-transform:uppercase;letter-spacing:.04em">${HEADLINE[kind]}</p>
<h1 style="margin:0 0 16px;font-size:20px;${kind === "cancelled" ? "text-decoration:line-through;" : ""}">${escapeHtml(cls.title)}</h1>
<table style="border-collapse:collapse;font-size:14px;margin-bottom:16px">${details
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#666">${k}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
      )
      .join("")}</table>
${description && kind !== "cancelled" ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;white-space:pre-line">${escapeHtml(description)}</p>` : ""}
<a href="${escapeHtml(link)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:6px;font-size:14px">${kind === "cancelled" ? "View details" : "View class"}</a>
<p style="margin:24px 0 0;font-size:12px;color:#888">All times are Indian Standard Time (IST).</p>
</div></body></html>`;
    return { to: r.email, subject, html, text };
  });
}
