import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus } from "@/types";

export interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  note: string | null;
  updated_at: string;
  class: {
    id: string;
    title: string;
    starts_at: string;
    duration_minutes: number;
    instructor: { full_name: string } | null;
  } | null;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  /** Classes counted towards the rate (total − excused). */
  counted: number;
  /** (present + late) / (total − excused), 0–100, or null when nothing counts yet. */
  rate: number | null;
}

/**
 * The signed-in user's attendance rows, newest class first. Read only: RLS lets students
 * select their own rows and never write them. Rows whose class is hidden by RLS keep `class: null`.
 */
export async function getMyAttendance(userId: string): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("id,status,note,updated_at,class:classes!attendance_class_id_fkey(id,title,starts_at,duration_minutes,instructor:profiles!classes_instructor_id_fkey(full_name))")
    .eq("user_id", userId)
    .overrideTypes<AttendanceRecord[], { merge: false }>();
  return (data ?? []).sort((a, b) => {
    const ta = a.class ? new Date(a.class.starts_at).getTime() : 0;
    const tb = b.class ? new Date(b.class.starts_at).getTime() : 0;
    return tb - ta;
  });
}

/** Counters + rate derived purely from attendance rows. */
export function summarizeAttendance(rows: Pick<AttendanceRecord, "status">[]): AttendanceSummary {
  const s = { present: 0, absent: 0, late: 0, excused: 0 };
  for (const r of rows) s[r.status] += 1;
  const total = rows.length;
  const counted = total - s.excused;
  const rate = counted > 0 ? Math.round(((s.present + s.late) / counted) * 100) : null;
  return { ...s, total, counted, rate };
}
