-- =============================================================================
-- Rookie — Row Level Security
-- Every table has RLS enabled. Anything not explicitly allowed is denied.
-- =============================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','courses','course_modules','lessons','lesson_resources','course_enrollments',
    'student_progress','roadmaps','roadmap_nodes','roadmap_enrollments','roadmap_node_progress',
    'classes','attendance','assignments','assignment_submissions','coding_problems',
    'coding_problem_test_cases','coding_submissions','daily_agendas','agenda_items',
    'agenda_item_progress','notes','announcements','notifications','achievements',
    'user_achievements','activity_logs','platform_settings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: read self" on public.profiles for select to authenticated
  using (id = auth.uid());
create policy "profiles: staff read all" on public.profiles for select to authenticated
  using (public.is_staff());
-- Students need instructor names/avatars on classes & courses
create policy "profiles: read staff profiles" on public.profiles for select to anon, authenticated
  using (role in ('instructor', 'admin'));
create policy "profiles: update self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles: admin update" on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "profiles: admin delete" on public.profiles for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Course content: public read when published; owners & admins write.
-- ---------------------------------------------------------------------------
create policy "courses: public read published" on public.courses for select to anon, authenticated
  using (is_published or public.can_manage_course(id));
create policy "courses: staff insert" on public.courses for insert to authenticated
  with check (public.is_admin() or (public.current_user_role() = 'instructor' and instructor_id = auth.uid()));
create policy "courses: owner update" on public.courses for update to authenticated
  using (public.can_manage_course(id))
  with check (public.is_admin() or instructor_id = auth.uid());
create policy "courses: owner delete" on public.courses for delete to authenticated
  using (public.can_manage_course(id));

create policy "modules: read" on public.course_modules for select to anon, authenticated
  using (exists (select 1 from public.courses c where c.id = course_id and c.is_published)
         or public.can_manage_course(course_id));
create policy "modules: manage" on public.course_modules for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

create policy "lessons: read" on public.lessons for select to anon, authenticated
  using ((is_published and exists (select 1 from public.courses c where c.id = course_id and c.is_published))
         or public.can_manage_course(course_id));
create policy "lessons: manage" on public.lessons for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

create policy "resources: read" on public.lesson_resources for select to anon, authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));  -- inherits lessons RLS
create policy "resources: manage" on public.lesson_resources for all to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id)))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id)));

-- ---------------------------------------------------------------------------
-- Enrollments & progress
-- ---------------------------------------------------------------------------
create policy "course_enrollments: read own" on public.course_enrollments for select to authenticated
  using (user_id = auth.uid() or public.can_manage_course(course_id));
create policy "course_enrollments: self enroll" on public.course_enrollments for insert to authenticated
  with check ((user_id = auth.uid() and exists (select 1 from public.courses c where c.id = course_id and c.is_published))
              or public.can_manage_course(course_id));
create policy "course_enrollments: leave or manage" on public.course_enrollments for delete to authenticated
  using (user_id = auth.uid() or public.can_manage_course(course_id));

create policy "progress: read own" on public.student_progress for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.lessons l where l.id = lesson_id and public.can_manage_course(l.course_id)));
create policy "progress: insert own" on public.student_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.lessons l where l.id = lesson_id));
create policy "progress: update own" on public.student_progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "progress: delete own" on public.student_progress for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Roadmaps
-- ---------------------------------------------------------------------------
create policy "roadmaps: read" on public.roadmaps for select to anon, authenticated
  using (is_published or public.is_admin() or created_by = auth.uid());
create policy "roadmaps: staff insert" on public.roadmaps for insert to authenticated
  with check (public.is_staff() and (public.is_admin() or created_by = auth.uid()));
create policy "roadmaps: owner update" on public.roadmaps for update to authenticated
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_admin() or created_by = auth.uid());
create policy "roadmaps: owner delete" on public.roadmaps for delete to authenticated
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));

create policy "roadmap_nodes: read" on public.roadmap_nodes for select to anon, authenticated
  using (exists (select 1 from public.roadmaps r where r.id = roadmap_id));  -- inherits roadmaps RLS
create policy "roadmap_nodes: manage" on public.roadmap_nodes for all to authenticated
  using (exists (select 1 from public.roadmaps r where r.id = roadmap_id
                 and (public.is_admin() or (public.is_staff() and r.created_by = auth.uid()))))
  with check (exists (select 1 from public.roadmaps r where r.id = roadmap_id
                 and (public.is_admin() or (public.is_staff() and r.created_by = auth.uid()))));

create policy "roadmap_enrollments: own" on public.roadmap_enrollments for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "roadmap_enrollments: self enroll" on public.roadmap_enrollments for insert to authenticated
  with check (user_id = auth.uid());
create policy "roadmap_enrollments: self leave" on public.roadmap_enrollments for delete to authenticated
  using (user_id = auth.uid());

create policy "node_progress: own" on public.roadmap_node_progress for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "node_progress: insert own" on public.roadmap_node_progress for insert to authenticated
  with check (user_id = auth.uid());
create policy "node_progress: delete own" on public.roadmap_node_progress for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Classes & attendance
-- ---------------------------------------------------------------------------
create policy "classes: public upcoming read" on public.classes for select to anon
  using (starts_at > now() - interval '1 day' and status <> 'cancelled');
create policy "classes: read" on public.classes for select to authenticated
  using (public.is_staff() or course_id is null or public.is_enrolled(course_id));
create policy "classes: staff insert" on public.classes for insert to authenticated
  with check (public.is_admin()
              or (public.current_user_role() = 'instructor' and instructor_id = auth.uid()
                  and (course_id is null or public.can_manage_course(course_id))));
create policy "classes: manage" on public.classes for update to authenticated
  using (public.can_manage_class(id)) with check (public.is_staff());
create policy "classes: delete" on public.classes for delete to authenticated
  using (public.can_manage_class(id));

-- Students read their own attendance only; they can never write it.
create policy "attendance: read own" on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.can_manage_class(class_id));
create policy "attendance: staff insert" on public.attendance for insert to authenticated
  with check (public.can_manage_class(class_id));
create policy "attendance: staff update" on public.attendance for update to authenticated
  using (public.can_manage_class(class_id)) with check (public.can_manage_class(class_id));
create policy "attendance: staff delete" on public.attendance for delete to authenticated
  using (public.can_manage_class(class_id));

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------
create policy "assignments: read" on public.assignments for select to authenticated
  using ((is_published and public.is_enrolled(course_id)) or public.can_manage_course(course_id));
create policy "assignments: manage" on public.assignments for all to authenticated
  using (public.can_manage_course(course_id)) with check (public.can_manage_course(course_id));

create policy "submissions: read" on public.assignment_submissions for select to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)));
create policy "submissions: student insert" on public.assignment_submissions for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.assignments a where a.id = assignment_id
                          and a.is_published and public.is_enrolled(a.course_id)));
create policy "submissions: student update" on public.assignment_submissions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "submissions: staff review" on public.assignment_submissions for update to authenticated
  using (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)))
  with check (exists (select 1 from public.assignments a where a.id = assignment_id and public.can_manage_course(a.course_id)));

-- ---------------------------------------------------------------------------
-- Coding problems — hidden test cases are only visible to staff.
-- ---------------------------------------------------------------------------
create policy "problems: read" on public.coding_problems for select to anon, authenticated
  using (is_published or public.is_staff());
create policy "problems: staff insert" on public.coding_problems for insert to authenticated
  with check (public.is_staff() and (public.is_admin() or created_by = auth.uid()));
create policy "problems: owner update" on public.coding_problems for update to authenticated
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()))
  with check (public.is_admin() or created_by = auth.uid());
create policy "problems: owner delete" on public.coding_problems for delete to authenticated
  using (public.is_admin() or (public.is_staff() and created_by = auth.uid()));

create policy "test_cases: read samples" on public.coding_problem_test_cases for select to anon, authenticated
  using (is_sample or public.is_staff());
create policy "test_cases: manage" on public.coding_problem_test_cases for all to authenticated
  using (exists (select 1 from public.coding_problems p where p.id = problem_id
                 and (public.is_admin() or (public.is_staff() and p.created_by = auth.uid()))))
  with check (exists (select 1 from public.coding_problems p where p.id = problem_id
                 and (public.is_admin() or (public.is_staff() and p.created_by = auth.uid()))));

create policy "code_submissions: read own" on public.coding_submissions for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy "code_submissions: insert own" on public.coding_submissions for insert to authenticated
  with check (user_id = auth.uid());
-- no student update/delete: submission history is immutable

-- ---------------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------------
create policy "agendas: read" on public.daily_agendas for select to authenticated
  using (owner_id = auth.uid()
         or (course_id is not null and (public.is_enrolled(course_id) or public.can_manage_course(course_id))));
create policy "agendas: insert" on public.daily_agendas for insert to authenticated
  with check ((owner_id = auth.uid() and course_id is null)
              or (owner_id is null and public.can_manage_course(course_id)));
create policy "agendas: update" on public.daily_agendas for update to authenticated
  using (owner_id = auth.uid() or (course_id is not null and public.can_manage_course(course_id)))
  with check ((owner_id = auth.uid() and course_id is null)
              or (owner_id is null and public.can_manage_course(course_id)));
create policy "agendas: delete" on public.daily_agendas for delete to authenticated
  using (owner_id = auth.uid() or (course_id is not null and public.can_manage_course(course_id)));

create policy "agenda_items: read" on public.agenda_items for select to authenticated
  using (exists (select 1 from public.daily_agendas d where d.id = agenda_id));  -- inherits agenda RLS
create policy "agenda_items: write" on public.agenda_items for all to authenticated
  using (exists (select 1 from public.daily_agendas d where d.id = agenda_id
                 and (d.owner_id = auth.uid() or (d.course_id is not null and public.can_manage_course(d.course_id)))))
  with check (exists (select 1 from public.daily_agendas d where d.id = agenda_id
                 and (d.owner_id = auth.uid() or (d.course_id is not null and public.can_manage_course(d.course_id)))));

create policy "agenda_progress: own" on public.agenda_item_progress for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.agenda_items i where i.id = item_id));

-- ---------------------------------------------------------------------------
-- Notes — always private to the owner
-- ---------------------------------------------------------------------------
create policy "notes: owner" on public.notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Announcements & notifications
-- ---------------------------------------------------------------------------
create policy "announcements: read" on public.announcements for select to authenticated
  using (course_id is null or public.is_enrolled(course_id) or public.can_manage_course(course_id));
create policy "announcements: staff insert" on public.announcements for insert to authenticated
  with check (author_id = auth.uid()
              and (public.is_admin() or (public.is_staff() and (course_id is null or public.can_manage_course(course_id)))));
create policy "announcements: author update" on public.announcements for update to authenticated
  using (public.is_admin() or (public.is_staff() and author_id = auth.uid()))
  with check (public.is_admin() or author_id = auth.uid());
create policy "announcements: author delete" on public.announcements for delete to authenticated
  using (public.is_admin() or (public.is_staff() and author_id = auth.uid()));

create policy "notifications: read own" on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy "notifications: mark read" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Achievements & activity (written only by security-definer triggers)
-- ---------------------------------------------------------------------------
create policy "achievements: read" on public.achievements for select to anon, authenticated using (true);
create policy "achievements: admin manage" on public.achievements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "user_achievements: read own" on public.user_achievements for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "activity: read own" on public.activity_logs for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------------
-- Platform settings
-- ---------------------------------------------------------------------------
create policy "settings: read" on public.platform_settings for select to authenticated using (true);
create policy "settings: admin write" on public.platform_settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Column privileges: students cannot write activity or achievements at all,
-- and cannot touch notification content (only read_at).
-- ---------------------------------------------------------------------------
revoke insert, update, delete on public.activity_logs from anon, authenticated;
revoke insert, update, delete on public.user_achievements from anon, authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;
revoke insert on public.notifications from anon, authenticated;

-- Internal helpers should not be callable directly by clients.
revoke execute on function public.log_activity(uuid, public.activity_type, uuid, text, jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.notify_user(uuid, public.notification_type, text, text, text) from public, anon, authenticated;
revoke execute on function public.check_achievements(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: live notification bell
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
