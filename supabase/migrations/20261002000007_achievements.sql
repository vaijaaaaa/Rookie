-- =============================================================================
-- Rookie — achievement definitions (system data, required in every environment)
-- Unlocks are evaluated automatically from activity_logs. Safe to re-run.
-- =============================================================================

insert into public.achievements (code, title, description, icon, criteria, position) values
  ('first_lesson',       'First Lesson',        'Complete your first lesson.',                       '🎯', '{"kind":"count","activity":"lesson_completed","threshold":1}', 1),
  ('lessons_10',         'Bookworm',            'Complete 10 lessons.',                              '📖', '{"kind":"count","activity":"lesson_completed","threshold":10}', 2),
  ('streak_7',           '7 Day Streak',        'Learn something meaningful 7 days in a row.',       '🔥', '{"kind":"streak","threshold":7}', 3),
  ('streak_30',          '30 Day Streak',       'Keep a 30 day learning streak.',                    '⚡', '{"kind":"streak","threshold":30}', 4),
  ('first_problem',      'First Coding Problem','Solve your first coding problem.',                  '💻', '{"kind":"count","activity":"problem_solved","threshold":1}', 5),
  ('problems_10',        'Problem Solver',      'Solve 10 coding problems.',                         '🧩', '{"kind":"count","activity":"problem_solved","threshold":10}', 6),
  ('problems_50',        '50 Problems Solved',  'Solve 50 coding problems.',                         '🏆', '{"kind":"count","activity":"problem_solved","threshold":50}', 7),
  ('first_course',       'Completed First Course','Finish every lesson in a course.',                '📚', '{"kind":"count","activity":"course_completed","threshold":1}', 8),
  ('first_assignment',   'Shipped It',          'Submit your first assignment.',                     '📝', '{"kind":"count","activity":"assignment_submitted","threshold":1}', 9),
  ('first_class',        'Showed Up',           'Attend your first live class.',                     '🎥', '{"kind":"count","activity":"class_attended","threshold":1}', 10),
  ('perfect_attendance', 'Perfect Attendance',  '100% attendance across at least 5 classes.',        '🎓', '{"kind":"attendance_rate","threshold":100,"min_classes":5}', 11),
  ('roadmap_node_10',    'Pathfinder',          'Complete 10 roadmap topics.',                       '🗺️', '{"kind":"count","activity":"roadmap_node_completed","threshold":10}', 12)
on conflict (code) do update
  set title = excluded.title, description = excluded.description, icon = excluded.icon,
      criteria = excluded.criteria, position = excluded.position;
