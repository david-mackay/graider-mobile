export type AppRole = "student" | "teacher";

export type SubscriptionTier = "free" | "pro";

export type SubscriptionSummary = {
  tier: SubscriptionTier;
  isPro: boolean;
  gradesUsedThisMonth: number;
  gradeLimit: number | null;
  gradesRemaining: number | null;
  classesOwned: number;
  classLimit: number | null;
  subscriptionExpiresAt: string | null;
};

export type AppUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: AppRole;
};

export type ClassRole = "teacher" | "student";

export type SchoolClass = {
  id: string;
  name: string;
  owner_user_id: string;
  invite_code: string;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClassMembership = {
  class_id: string;
  user_id: string;
  role: ClassRole;
  status: "active" | "pending";
  created_at?: string | null;
};

export type QuestionBankQuestion = {
  id: string;
  teacher_id: string;
  class_id: string;
  prompt: string;
  correct_answer: string;
  marks: number;
  topic?: string | null;
  question_type?: "open" | "mcq";
  choices?: Array<{ key: string; text: string }> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestSummary = {
  id: string;
  title: string;
  class_id: string;
  teacher_id: string;
  grades_released: boolean;
  show_ai_feedback: boolean;
  status?: "draft" | "scheduled" | "open" | "closed" | null;
  opens_at?: string | null;
  closes_at?: string | null;
  duration_minutes?: number | null;
  allow_late_submit?: boolean | null;
  available_now?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestQuestion = {
  question_id: string;
  prompt: string;
  marks: number;
  sort_order: number;
};

export type TestDetail = {
  id: string;
  title: string;
  class_id: string;
  teacher_id: string;
  questions: TestQuestion[];
  status?: "draft" | "scheduled" | "open" | "closed" | null;
  opens_at?: string | null;
  closes_at?: string | null;
  duration_minutes?: number | null;
  allow_late_submit?: boolean | null;
  available_now?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TestAttempt = {
  id: string;
  test_id: string;
  student_id: string;
  status: "submitted" | "graded" | "draft" | "grading";
  release_status?: "ready" | "grading" | "released" | null;
  total_marks: number | null;
  max_marks: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  ocr_uploads: string[] | null;
};

export type PrintLayoutMode = "compact" | "standard" | "spacious";

export type TestPrintSettings = {
  test_id: string;
  version_id: string;
  include_answer_key: boolean;
  layout_mode: PrintLayoutMode;
};

export type PrintGenerationStatus = "idle" | "generating" | "ready" | "failed";

export type TestPrintJob = {
  id: string;
  test_id: string;
  status: PrintGenerationStatus;
  download_url: string | null;
  error: string | null;
};

export type AttemptAnswer = {
  id: string;
  attempt_id: string;
  question_id: string;
  student_answer: string;
  marks_earned: number | null;
  feedback: string | null;
};

export type OcrAnswer = {
  question: string;
  answer: string;
  question_index?: number | null;
};

export type OcrPage = {
  pageIndex: number;
  studentNameGuess: string;
  confidence: number;
  answers: OcrAnswer[];
};

export type RosterEntry = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

export type TeacherAttemptRequest = {
  testId: string;
  studentId: string;
};

export type TeacherAttemptResponse = {
  attempt_id: string;
  created: boolean;
};

export type StackPagePreview = {
  pageIndex: number;
  studentNameGuess: string;
  confidence: number;
  suggestedStudentId: string | null; // from "exact" match
  candidates: string[]; // from "fuzzy" match (studentIds)
  status: "exact" | "fuzzy" | "unmatched";
  ocrAnswers: OcrAnswer[];
  storagePath: string | null; // path of the uploaded image, for the wizard to display
};

export type StackAssignment = {
  pageIndex: number;
  studentId: string;
  ocrAnswers: OcrAnswer[];
};

export type StackPerStudentResult = {
  studentId: string;
  attemptId: string;
  created: boolean;
  totalMarks: number;
  maxMarks: number;
  grades: { questionId: string; marksEarned: number; feedback: string }[];
};

export type StackPreview = { pages: StackPagePreview[] };

export type StackCommitResult = { results: StackPerStudentResult[] };

export type GradeStackJobPhase = "preview" | "commit";

export type GradeStackJobStatus =
  | "queued"
  | "processing"
  | "needs_review"
  | "completed"
  | "failed"
  | "cancelled";

export type GradeStackJobFailure = {
  studentId?: string | null;
  pageIndex?: number | null;
  code: string;
  message: string;
  retryable: boolean;
};

export type GradeStackQuestionMatch = {
  pageIndex: number;
  questionId: string | null;
  questionIndex: number | null;
  matchingReason: "index_hint" | "prompt_normalized" | "fuzzy" | "unmatched";
  confidence: number;
  needsReview: boolean;
  ocrAnswer: OcrAnswer;
};

export type GradeStackPreviewPayload = {
  pages: StackPagePreview[];
  questionMatches?: GradeStackQuestionMatch[];
  discovery?: StackTestDiscovery | null;
  studentPageAssignments?: StudentPageAssignment[];
};

export type StudentPageAssignment = {
  pageIndex: number;
  studentId: string;
};

export type StackTestDiscovery = {
  source: "matched" | "created";
  testId: string;
  testTitle: string;
  confidence: number;
};

export type GradeStackCommitProgress = {
  total: number;
  completed: number;
  currentStudentId?: string | null;
};

export type GradeStackCommitPayload = {
  results: StackPerStudentResult[];
  progress?: GradeStackCommitProgress;
};

export type GradeStackJob = {
  id: string;
  phase: GradeStackJobPhase;
  status: GradeStackJobStatus;
  testId: string;
  classId: string | null;
  attemptCount: number;
  idempotencyKey?: string | null;
  preview?: GradeStackPreviewPayload | null;
  commit?: GradeStackCommitPayload | null;
  studentPageAssignments?: StudentPageAssignment[];
  failures: GradeStackJobFailure[];
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SampleGradeResponse = {
  marksEarned: number;
  maxMarks: number;
  feedback: string;
  ocrAnswerText: string;
  questions?: Array<{
    prompt: string;
    marksEarned: number;
    maxMarks: number;
    feedback: string;
    ocrAnswerText: string;
  }>;
};

export type OnboardingSyncResponse = {
  classId: string;
  testId: string;
  /** First attempt id, kept for backward compatibility. Prefer `attemptIds`. */
  attemptId: string;
  attemptIds: string[];
  created: boolean;
};
