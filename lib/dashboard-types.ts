import type {
  GradeStackJob,
  GradeStackJobPhase,
  GradeStackJobStatus,
  QuestionBankQuestion,
  SchoolClass,
  TestAttempt,
  TestSummary,
} from "@/lib/types";

export type ActiveView = "classes" | "questions" | "tests" | "students";

export type DashboardQuestion = QuestionBankQuestion;
export type DashboardTest = TestSummary;
export type DashboardAttempt = TestAttempt & {
  test_title: string;
  test_class_id?: string | null;
  student_name?: string | null;
};

export type AttemptReleaseState = "ready" | "grading" | "released";

export type BulkReleaseSummary = {
  test_id: string;
  test_title: string;
  class_name: string;
  graded_count: number;
  total_count: number;
};

export type BulkReleaseItem = {
  attempt_id: string;
  student_id: string;
  student_name: string;
  release_state: AttemptReleaseState;
  score_label: string | null;
};

export type BulkReleaseResult = {
  released_attempt_ids: string[];
  failed_attempt_ids: string[];
};

export type GradedAttemptQuestion = {
  question_id: string;
  prompt: string;
  student_answer: string;
  marks: number;
  marks_earned: number | null;
  feedback: string | null;
  graded_by?: string | null;
  updated_at?: string | null;
};

export type GradedAttemptDetail = {
  id: string;
  test_id: string;
  test_title: string;
  student_id: string;
  student_name?: string | null;
  status: "draft" | "submitted" | "graded";
  release_status?: "ready" | "grading" | "released" | null;
  show_ai_feedback?: boolean;
  total_marks: number | null;
  max_marks: number | null;
  graded_at?: string | null;
  updated_at?: string | null;
  test_class_id?: string | null;
  ocr_uploads?: string[];
  questions: GradedAttemptQuestion[];
};

export type DashboardClass = SchoolClass & {
  role_in_class?: "teacher" | "student";
};

export type ClassMember = {
  user_id: string;
  role: "teacher" | "student";
  status: "active" | "pending";
  full_name: string | null;
  email: string | null;
};

export type GroupedQuestions = { topic: string; items: DashboardQuestion[] };

export type Invitation = {
  id: string;
  code: string;
  role: "student" | "teacher";
  status: string;
  invited_email: string | null;
  expires_at: string | null;
  created_at: string | null;
  accepted_by_name: string | null;
};

export type DashboardGradeStackJob = GradeStackJob & {
  phase: GradeStackJobPhase;
  status: GradeStackJobStatus;
  is_terminal: boolean;
};
