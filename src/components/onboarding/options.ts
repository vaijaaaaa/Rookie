import type { ExperienceLevel, LearningGoal } from "@/types";

export const GOAL_OPTIONS: { value: LearningGoal; label: string; hint: string }[] = [
  { value: "software_developer", label: "Software Developer", hint: "General-purpose engineering, DSA and OOP" },
  { value: "full_stack_developer", label: "Full Stack Developer", hint: "Frontend, backend, databases and deploys" },
  { value: "backend_developer", label: "Backend Developer", hint: "APIs, data modeling, systems and scale" },
  { value: "frontend_developer", label: "Frontend Developer", hint: "Browsers, UI engineering and accessibility" },
  { value: "data_engineer", label: "Data Engineer", hint: "SQL, pipelines and storage systems" },
  { value: "ai_engineer", label: "AI Engineer", hint: "Python, math foundations and ML systems" },
  { value: "cs_fundamentals", label: "Just learning CS", hint: "No job title in mind — the core of CS" },
];

export const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; hint: string }[] = [
  { value: "beginner", label: "Beginner", hint: "New to programming, or only followed a few tutorials" },
  { value: "some_experience", label: "Some experience", hint: "Built small projects, comfortable with one language" },
  { value: "intermediate", label: "Intermediate", hint: "Write code regularly, want deeper CS understanding" },
];

export const INTEREST_OPTIONS = [
  "DSA",
  "Web",
  "Databases",
  "Systems",
  "Networks",
  "AI/ML",
  "Interviews",
  "Java",
  "Python",
  "JavaScript",
] as const;
