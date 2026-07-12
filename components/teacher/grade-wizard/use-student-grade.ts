import { useCallback, useMemo, useState } from "react";
import { handleJson, GraiderApiError } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { appendImageToFormData, type PickedImage } from "@/lib/picked-image";
import {
  flattenStudentBuckets,
  totalPageCount,
  MAX_TOTAL_PAGES,
  type StudentBucket,
} from "@/lib/student-grade";
import {
  buildStudentGradingProgress,
  type GradingPhase,
  type StudentGradingProgress,
} from "@/lib/grading-progress";
import { resolveJobResumeTarget } from "@/lib/resume-grade-job";
import type {
  GradeStackJob,
  OcrAnswer,
  StackCommitResult,
  StackPreview,
  StackTestDiscovery,
  TestDetail,
  TestSummary,
} from "@/lib/types";

export type StudentGradeState =
  | "pickTest"
  | "pickStudent"
  | "capture"
  | "sessionSummary"
  | "grading"
  | "reviewing"
  | "results";

export type GradingMode = "selected" | "auto";

export type UseStudentGradeReturn = {
  state: StudentGradeState;
  gradingMode: GradingMode;
  selectedTest: TestSummary | null;
  autoClassId: string | null;
  autoClassName: string | null;
  buckets: StudentBucket[];
  activeStudent: StudentBucket | null;
  preview: StackPreview | null;
  testDiscovery: StackTestDiscovery | null;
  results: StackCommitResult | null;
  pageToStudentId: Map<number, string>;
  gradingPhase: GradingPhase | null;
  activeJob: GradeStackJob | null;
  studentProgress: StudentGradingProgress[];
  errorMessage: string;
  limitCode: string | null;
  isBusy: boolean;
  actions: {
    selectTest: (test: TestSummary) => void;
    selectSmartGrade: (classId: string, className: string) => void;
    selectStudent: (studentId: string, studentName: string) => void;
    addPageToActive: (page: PickedImage) => void;
    removePageFromActive: (pageIndex: number) => void;
    movePageInActive: (fromIndex: number, toIndex: number) => void;
    finishActiveStudent: () => void;
    removeBucket: (studentId: string) => void;
    resumeStudent: (studentId: string) => void;
    startAddStudent: () => void;
    submitSession: () => Promise<void>;
    confirmAll: () => Promise<void>;
    resumeFromJob: (jobId: string) => Promise<void>;
    back: () => void;
    restart: () => void;
    clearError: () => void;
  };
};

async function fetchJob(
  graiderFetch: ReturnType<typeof useGraiderFetch>,
  jobId: string,
): Promise<GradeStackJob> {
  return handleJson<GradeStackJob>(
    await graiderFetch(`/api/grade-stack/jobs/${jobId}`, { cache: "no-store" }),
  );
}

async function fetchTestSummary(
  graiderFetch: ReturnType<typeof useGraiderFetch>,
  testId: string,
): Promise<TestSummary> {
  const detail = await handleJson<{ test: TestDetail }>(
    await graiderFetch(`/api/tests/${testId}`, { cache: "no-store" }),
  );
  const test = detail.test;
  return {
    id: test.id,
    title: test.title,
    class_id: test.class_id,
    teacher_id: test.teacher_id,
    grades_released: false,
    show_ai_feedback: false,
  };
}

async function pollJobUntilTerminal(
  graiderFetch: ReturnType<typeof useGraiderFetch>,
  jobId: string,
  onUpdate?: (job: GradeStackJob) => void,
): Promise<GradeStackJob> {
  const maxAttempts = 120;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const job = await fetchJob(graiderFetch, jobId);
    onUpdate?.(job);
    if (
      job.status === "needs_review" ||
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "cancelled"
    ) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Timed out waiting for grading job.");
}

export function useStudentGrade(): UseStudentGradeReturn {
  const graiderFetch = useGraiderFetch();
  const [state, setState] = useState<StudentGradeState>("pickTest");
  const [gradingMode, setGradingMode] = useState<GradingMode>("selected");
  const [selectedTest, setSelectedTest] = useState<TestSummary | null>(null);
  const [autoClassId, setAutoClassId] = useState<string | null>(null);
  const [autoClassName, setAutoClassName] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<StudentBucket[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [preview, setPreview] = useState<StackPreview | null>(null);
  const [testDiscovery, setTestDiscovery] = useState<StackTestDiscovery | null>(null);
  const [results, setResults] = useState<StackCommitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [limitCode, setLimitCode] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [pageToStudentId, setPageToStudentId] = useState<Map<number, string>>(new Map());
  const [gradingPhase, setGradingPhase] = useState<GradingPhase | null>(null);
  const [activeJob, setActiveJob] = useState<GradeStackJob | null>(null);

  const isBusy = state === "grading";

  const sessionStudents = useMemo(() => {
    const fromBuckets = buckets
      .filter((bucket) => bucket.pages.length > 0)
      .map((bucket) => ({
        studentId: bucket.studentId,
        studentName: bucket.studentName,
        pageCount: bucket.pages.length,
      }));
    if (fromBuckets.length > 0) return fromBuckets;

    const assignments =
      activeJob?.studentPageAssignments ?? activeJob?.preview?.studentPageAssignments ?? [];
    if (assignments.length > 0) {
      const counts = new Map<string, number>();
      for (const assignment of assignments) {
        counts.set(assignment.studentId, (counts.get(assignment.studentId) ?? 0) + 1);
      }
      return Array.from(counts.entries()).map(([studentId, pageCount]) => ({
        studentId,
        studentName: "Student",
        pageCount,
      }));
    }

    const commitResults = activeJob?.commit?.results ?? [];
    if (commitResults.length > 0) {
      return commitResults.map((result) => ({
        studentId: result.studentId,
        studentName: "Student",
        pageCount: 1,
      }));
    }

    return [];
  }, [buckets, activeJob]);

  const studentProgress = useMemo(
    () =>
      gradingPhase
        ? buildStudentGradingProgress(sessionStudents, activeJob, gradingPhase)
        : [],
    [sessionStudents, activeJob, gradingPhase],
  );

  const activeStudent = useMemo(() => {
    if (!activeStudentId) return null;
    return buckets.find((b) => b.studentId === activeStudentId) ?? null;
  }, [activeStudentId, buckets]);

  const selectTest = useCallback((test: TestSummary) => {
    setGradingMode("selected");
    setAutoClassId(null);
    setAutoClassName(null);
    setSelectedTest(test);
    setBuckets([]);
    setActiveStudentId(null);
    setPreview(null);
    setTestDiscovery(null);
    setResults(null);
    setPreviewJobId(null);
    setPageToStudentId(new Map());
    setGradingPhase(null);
    setActiveJob(null);
    setErrorMessage("");
    setState("pickStudent");
  }, []);

  const selectSmartGrade = useCallback((classId: string, className: string) => {
    setGradingMode("auto");
    setAutoClassId(classId);
    setAutoClassName(className);
    setSelectedTest(null);
    setBuckets([]);
    setActiveStudentId(null);
    setPreview(null);
    setTestDiscovery(null);
    setResults(null);
    setPreviewJobId(null);
    setPageToStudentId(new Map());
    setGradingPhase(null);
    setActiveJob(null);
    setErrorMessage("");
    setState("pickStudent");
  }, []);

  const selectStudent = useCallback((studentId: string, studentName: string) => {
    setErrorMessage("");
    setBuckets((prev) => {
      const existing = prev.find((b) => b.studentId === studentId);
      if (existing) return prev;
      return [...prev, { studentId, studentName, pages: [] }];
    });
    setActiveStudentId(studentId);
    setState("capture");
  }, []);

  const resumeStudent = useCallback((studentId: string) => {
    setActiveStudentId(studentId);
    setErrorMessage("");
    setState("capture");
  }, []);

  const addPageToActive = useCallback(
    (page: PickedImage) => {
      if (!activeStudentId) return;
      setBuckets((prev) =>
        prev.map((bucket) =>
          bucket.studentId === activeStudentId
            ? { ...bucket, pages: [...bucket.pages, page] }
            : bucket,
        ),
      );
    },
    [activeStudentId],
  );

  const removePageFromActive = useCallback(
    (pageIndex: number) => {
      if (!activeStudentId) return;
      setBuckets((prev) =>
        prev.map((bucket) =>
          bucket.studentId === activeStudentId
            ? { ...bucket, pages: bucket.pages.filter((_, i) => i !== pageIndex) }
            : bucket,
        ),
      );
    },
    [activeStudentId],
  );

  const movePageInActive = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (!activeStudentId) return;
      setBuckets((prev) =>
        prev.map((bucket) => {
          if (bucket.studentId !== activeStudentId) return bucket;
          const pages = [...bucket.pages];
          if (fromIndex < 0 || fromIndex >= pages.length) return bucket;
          if (toIndex < 0 || toIndex >= pages.length) return bucket;
          const [item] = pages.splice(fromIndex, 1);
          pages.splice(toIndex, 0, item);
          return { ...bucket, pages };
        }),
      );
    },
    [activeStudentId],
  );

  const finishActiveStudent = useCallback(() => {
    if (!activeStudentId) return;
    const bucket = buckets.find((b) => b.studentId === activeStudentId);
    if (!bucket || bucket.pages.length === 0) {
      setErrorMessage("Snap at least one page before finishing.");
      return;
    }
    setErrorMessage("");
    setActiveStudentId(null);
    setState("sessionSummary");
  }, [activeStudentId, buckets]);

  const removeBucket = useCallback((studentId: string) => {
    setBuckets((prev) => prev.filter((b) => b.studentId !== studentId));
  }, []);

  const startAddStudent = useCallback(() => {
    setActiveStudentId(null);
    setErrorMessage("");
    setState("pickStudent");
  }, []);

  const submitSession = useCallback(async () => {
    if (gradingMode === "selected" && !selectedTest) {
      setErrorMessage("Pick a test first.");
      return;
    }
    if (gradingMode === "auto" && !autoClassId) {
      setErrorMessage("Pick a class first.");
      return;
    }
    const nonEmpty = buckets.filter((b) => b.pages.length > 0);
    if (nonEmpty.length === 0) {
      setErrorMessage("Capture at least one student with pages.");
      return;
    }
    if (totalPageCount(nonEmpty) > MAX_TOTAL_PAGES) {
      setErrorMessage(`Maximum ${MAX_TOTAL_PAGES} pages per grading session.`);
      return;
    }

    setErrorMessage("");
    setLimitCode(null);
    setGradingPhase("preview");
    setActiveJob(null);
    setState("grading");

    const { files, pageToStudentId: mapping } = flattenStudentBuckets(nonEmpty);
    setPageToStudentId(mapping);

    try {
      const formData = new FormData();
      const idempotencyKey =
        gradingMode === "auto"
          ? `student-first-auto:${autoClassId}:${files.map((f) => `${f.name}:${f.size}:${f.uri}`).join("|")}`
          : `student-first:${selectedTest!.id}:${files.map((f) => `${f.name}:${f.size}:${f.uri}`).join("|")}`;

      if (gradingMode === "auto") {
        formData.append("mode", "auto");
        formData.append("classId", autoClassId!);
      } else {
        formData.append("testId", selectedTest!.id);
        formData.append("classId", selectedTest!.class_id);
      }
      formData.append("idempotencyKey", idempotencyKey);
      formData.append("gradingMode", "student_first");
      formData.append(
        "studentPageAssignments",
        JSON.stringify(
          Array.from(mapping.entries()).map(([pageIndex, studentId]) => ({ pageIndex, studentId })),
        ),
      );
      for (const file of files) {
        appendImageToFormData(formData, "images", file);
      }

      const created = await handleJson<{ jobId: string }>(
        await graiderFetch("/api/grade-stack/jobs/preview", {
          method: "POST",
          body: formData,
        }),
      );
      setPreviewJobId(created.jobId);

      const job = await pollJobUntilTerminal(graiderFetch, created.jobId, (update) => {
        setActiveJob(update);
      });
      if (job.status === "failed" || job.status === "cancelled") {
        throw new Error(job.error ?? "Preview job failed.");
      }

      setPreview({ pages: job.preview?.pages ?? [] });
      const discovery = job.preview?.discovery ?? null;
      setTestDiscovery(discovery);
      if (discovery || job.testId) {
        setSelectedTest({
          id: discovery?.testId ?? job.testId,
          title: discovery?.testTitle ?? "Detected test",
          class_id: job.classId ?? autoClassId ?? selectedTest?.class_id ?? "",
          teacher_id: "",
          grades_released: false,
          show_ai_feedback: false,
        });
      }
      setGradingPhase(null);
      setActiveJob(null);
      setState("reviewing");
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : "Failed to preview pages.";
      if (error instanceof GraiderApiError && error.code) {
        setLimitCode(error.code);
      } else {
        setLimitCode(null);
      }
      setErrorMessage(rawMessage);
      setGradingPhase(null);
      setActiveJob(null);
      setState("sessionSummary");
    }
  }, [buckets, gradingMode, selectedTest, autoClassId, graiderFetch]);

  const confirmAll = useCallback(async () => {
    const testId = selectedTest?.id;
    if (!testId || !preview) {
      setErrorMessage("Nothing to grade.");
      return;
    }

    setErrorMessage("");
    const payloadAssignments: {
      pageIndex: number;
      studentId: string;
      ocrAnswers: OcrAnswer[];
      storagePath?: string | null;
    }[] = [];

    for (const page of preview.pages) {
      const studentId = pageToStudentId.get(page.pageIndex);
      if (!studentId) continue;
      payloadAssignments.push({
        pageIndex: page.pageIndex,
        studentId,
        ocrAnswers: page.ocrAnswers,
        storagePath: page.storagePath ?? null,
      });
    }

    if (payloadAssignments.length === 0) {
      setErrorMessage("No pages to grade.");
      setState("reviewing");
      return;
    }

    setState("grading");
    setGradingPhase("commit");
    setActiveJob(null);

    try {
      const created = await handleJson<{ jobId: string }>(
        await graiderFetch("/api/grade-stack/jobs/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewJobId,
            testId,
            assignments: payloadAssignments,
            idempotencyKey: `student-first-commit:${previewJobId}:${testId}:${payloadAssignments
              .map((e) => `${e.pageIndex}:${e.studentId}`)
              .join("|")}`,
          }),
        }),
      );

      const job = await pollJobUntilTerminal(graiderFetch, created.jobId, (update) => {
        setActiveJob(update);
      });
      if (job.status === "failed" || job.status === "cancelled") {
        setErrorMessage(job.error ?? "Commit job failed.");
        setGradingPhase(null);
        setActiveJob(null);
        setState("reviewing");
        return;
      }

      setResults({ results: job.commit?.results ?? [] });
      setGradingPhase(null);
      setActiveJob(null);
      setState("results");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to grade.");
      setGradingPhase(null);
      setActiveJob(null);
      setState("reviewing");
    }
  }, [pageToStudentId, preview, previewJobId, selectedTest, graiderFetch]);

  const resumeFromJob = useCallback(
    async (jobId: string) => {
      setErrorMessage("");
      setLimitCode(null);
      setState("grading");

      try {
        let job = await fetchJob(graiderFetch, jobId);
        setGradingPhase(job.phase === "commit" ? "commit" : "preview");
        setActiveJob(job);
        let target = resolveJobResumeTarget(job);

        if (target.kind === "wait") {
          job = await pollJobUntilTerminal(graiderFetch, jobId, (update) => {
            setActiveJob(update);
          });
          target = resolveJobResumeTarget(job);
        }

        const test = await fetchTestSummary(graiderFetch, job.testId);
        setSelectedTest(test);
        setTestDiscovery(job.preview?.discovery ?? null);

        if (target.kind === "failed") {
          setErrorMessage(target.message);
          setGradingPhase(null);
          setActiveJob(null);
          setState("pickTest");
          return;
        }

        if (target.kind === "review") {
          setPreviewJobId(target.previewJobId);
          setPreview({ pages: job.preview?.pages ?? [] });
          setPageToStudentId(target.pageToStudentId);
          setGradingPhase(null);
          setActiveJob(null);
          setState("reviewing");
          return;
        }

        if (target.kind === "results") {
          setResults({ results: job.commit?.results ?? [] });
          setGradingPhase(null);
          setActiveJob(null);
          setState("results");
        }
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Could not open grading job.");
        setGradingPhase(null);
        setActiveJob(null);
        setState("pickTest");
      }
    },
    [graiderFetch],
  );

  const back = useCallback(() => {
    setErrorMessage("");
    setState((prev) => {
      if (prev === "pickStudent") return "pickTest";
      if (prev === "capture") return "pickStudent";
      if (prev === "sessionSummary") return "pickStudent";
      if (prev === "reviewing") {
        return buckets.some((b) => b.pages.length > 0) ? "sessionSummary" : "pickTest";
      }
      if (prev === "results") return "pickTest";
      return prev;
    });
  }, [buckets]);

  const restart = useCallback(() => {
    setGradingMode("selected");
    setAutoClassId(null);
    setAutoClassName(null);
    setSelectedTest(null);
    setBuckets([]);
    setActiveStudentId(null);
    setPreview(null);
    setTestDiscovery(null);
    setResults(null);
    setPreviewJobId(null);
    setPageToStudentId(new Map());
    setGradingPhase(null);
    setActiveJob(null);
    setErrorMessage("");
    setState("pickTest");
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage("");
    setLimitCode(null);
  }, []);

  const actions = useMemo(
    () => ({
      selectTest,
      selectSmartGrade,
      selectStudent,
      addPageToActive,
      removePageFromActive,
      movePageInActive,
      finishActiveStudent,
      removeBucket,
      resumeStudent,
      startAddStudent,
      submitSession,
      confirmAll,
      resumeFromJob,
      back,
      restart,
      clearError,
    }),
    [
      selectTest,
      selectSmartGrade,
      selectStudent,
      addPageToActive,
      removePageFromActive,
      movePageInActive,
      finishActiveStudent,
      removeBucket,
      resumeStudent,
      startAddStudent,
      submitSession,
      confirmAll,
      resumeFromJob,
      back,
      restart,
      clearError,
    ],
  );

  return {
    state,
    gradingMode,
    selectedTest,
    autoClassId,
    autoClassName,
    buckets,
    activeStudent,
    preview,
    testDiscovery,
    results,
    pageToStudentId,
    gradingPhase,
    activeJob,
    studentProgress,
    errorMessage,
    limitCode,
    isBusy,
    actions,
  };
}

export { totalPageCount };
