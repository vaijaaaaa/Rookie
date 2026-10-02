import {
  Award, BarChart3, BookOpen, CalendarCheck, CalendarDays, ClipboardList, Code2, GraduationCap,
  LayoutDashboard, Map, Megaphone, NotebookPen, Settings, TrendingUp, User, UserCog, Users, Video,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** shown in the mobile bottom bar */
  mobile?: boolean;
}

export const NAV: Record<UserRole, { main: NavItem[]; footer: NavItem[] }> = {
  student: {
    main: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, mobile: true },
      { title: "Agenda", href: "/agenda", icon: CalendarDays, mobile: true },
      { title: "Roadmaps", href: "/roadmaps", icon: Map },
      { title: "Courses", href: "/courses", icon: BookOpen, mobile: true },
      { title: "Classes", href: "/classes", icon: Video },
      { title: "Attendance", href: "/attendance", icon: CalendarCheck },
      { title: "Practice", href: "/practice", icon: Code2, mobile: true },
      { title: "Progress", href: "/progress", icon: TrendingUp },
      { title: "Assignments", href: "/assignments", icon: ClipboardList },
      { title: "Notes", href: "/notes", icon: NotebookPen },
      { title: "Achievements", href: "/achievements", icon: Award },
    ],
    footer: [
      { title: "Profile", href: "/profile", icon: User },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
  admin: {
    main: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard, mobile: true },
      { title: "Teaching", href: "/admin/teaching", icon: GraduationCap, mobile: true },
      { title: "Classes", href: "/admin/classes", icon: Video, mobile: true },
      { title: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
      { title: "Students", href: "/admin/students", icon: Users },
      { title: "Courses", href: "/admin/courses", icon: BookOpen, mobile: true },
      { title: "Roadmaps", href: "/admin/roadmaps", icon: Map },
      { title: "Assignments", href: "/admin/assignments", icon: ClipboardList },
      { title: "Problems", href: "/admin/problems", icon: Code2 },
      { title: "Agendas", href: "/admin/agendas", icon: CalendarDays },
      { title: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { title: "Users", href: "/admin/users", icon: UserCog },
      { title: "Analytics", href: "/admin/analytics", icon: BarChart3, mobile: true },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
    footer: [
      { title: "Profile", href: "/profile", icon: User },
      { title: "Student view", href: "/dashboard", icon: TrendingUp },
    ],
  },
};

export function isActive(pathname: string, href: string) {
  if (href === "/dashboard" || href === "/admin/teaching" || href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/") ||
    (href === "/classes" && pathname.startsWith("/class/"));
}
