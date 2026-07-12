import { useCallback, useMemo, useState } from "react";
import { handleJson, GraiderApiError } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { appendImageToFormData, type PickedImage } from "@/lib/picked-image";
import type {
  GradeStackJob,
  OcrAnswer,
  StackCommitResult,
  StackPreview,
  StackTestDiscovery,
  TestSummary,
} from "@/lib/types";

export type GradingMode = "selected" | "auto";

export type WizardState =
  | "pickTest"
  | "uploadStack"
  | "preview-loading"
  | "reviewing"
  | "committing"
  | "results";

export const SKIP_VALUE = "__skip__";
export type AssignmentValue = string | typeof SKIP_VALUE;

export type AssignmentMap = Record<number, AssignmentValue>;

export type UseStackGradeReturn = {
  state: WizardState;
  gradingMode: GradingMode;
  selectedTest: TestSummary | null;
  autoClassId: string | null;
  autoClassName: string | null;
  testDiscovery: StackTestDiscovery | null;
  preview: StackPreview | null;
  assignments: AssignmentMap;
  results: StackCommitResult | null;
  errorMessage: string;
  limitCode: string | null;
  isBusy: boolean;
  actions: {
    selectTest: (test: TestSummary) => void;
    selectAutoGrade: (classId: string, className: string) => void;
    submitImages: (files: PickedImage[]) => Promise<void>;
    setAssignment: (pageIndex: number, value: AssignmentValue) => void;
    confirmAll: () => Promise<void>;
    back: () => void;
    restart: () => void;
    clearError: () => void;
  };
};

// Contract note:
// This hook currently posts directly to /api/grade/stack.
// Planned async endpoints are documented in docs/api/grade-stack-jobs.md:
// - POST /api/grade-stack/jobs/preview
// - GET /api/grade-stack/jobs/:jobId
// - POST /api/grade-stack/jobs/commit
function buildInitialAssignments(preview: StackPreview): AssignmentMap {
  const map: AssignmentMap = {};
  for (const page of preview.pages) {
    if (page.status === "exact" && page.suggestedStudentId) {
      map[page.pageIndex] = page.suggestedStudentId;
    } else if (page.status === "fuzzy" && page.candidates.length > 0) {
      map[page.pageIndex] = page.candidates[0];
    } else {
      map[page.pageIndex] = "";
    }
  }
  return map;
}

export function useStackGrade(): UseStackGradeReturn {
  const graiderFetch = useGraiderFetch();
  const [state, setState] = useState<WizardState>("pickTest");
  const [gradingMode, setGradingMode] = useState<GradingMode>("selected");
  const [selectedTest, setSelectedTest] = useState<TestSummary | null>(null);
  const [autoClassId, setAutoClassId] = useState<string | null>(null);
  const [autoClassName, setAutoClassName] = useState<string | null>(null);
  const [testDiscovery, setTestDiscovery] = useState<StackTestDiscovery | null>(null);
  const [preview, setPreview] = useState<StackPreview | null>(null);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [results, setResults] = useState<StackCommitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [limitCode, setLimitCode] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);

  const isBusy = state === "preview-loading" || state === "committing";

  const selectTest = useCallback((test: TestSummary) => {
    setGradingMode("selected");
    setAutoClassId(null);
    setAutoClassName(null);
    setTestDiscovery(null);
    setSelectedTest(test);
    setPreview(null);
    setAssignments({});
    setResults(null);
    setPreviewJobId(null);
    setErrorMessage("");
    setState("uploadStack");
  }, []);

  const selectAutoGrade = useCallback((classId: string, className: string) => {
    setGradingMode("auto");
    setAutoClassId(classId);
    setAutoClassName(className);
    setTestDiscovery(null);
    setSelectedTest(null);
    setPreview(null);
    setAssignments({});
    setResults(null);
    setPreviewJobId(null);
    setErrorMessage("");
    setState("uploadStack");
  }, []);

  async function pollJobUntilTerminal(jobId: string): Promise<GradeStackJob> {
    const maxAttempts = 120; // ~4 minutes at 2s interval
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const job = await handleJson<GradeStackJob>(
        await graiderFetch(`/api/grade-stack/jobs/${jobId}`, { cache: "no-store" }),
      );
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

  const submitImages = useCallback(
    async (files: PickedImage[]) => {
      if (gradingMode === "selected" && !selectedTest) {
        setErrorMessage("Pick a test first.");
        return;
      }
      if (gradingMode === "auto" && !autoClassId) {
        setErrorMessage("Pick a class first.");
        return;
      }
      if (files.length === 0) {
        setErrorMessage("Please add at least one image.");
        return;
      }
      setErrorMessage("");
      setLimitCode(null);
      setState("preview-loading");

      try {
        const formData = new FormData();
        const idempotencyKey =
          gradingMode === "auto"
            ? `auto:${autoClassId}:${files.map((f) => `${f.name}:${f.size}:${f.uri}`).join("|")}`
            : `${selectedTest!.id}:${files.map((f) => `${f.name}:${f.size}:${f.uri}`).join("|")}`;

        if (gradingMode === "auto") {
          formData.append("mode", "auto");
          formData.append("classId", autoClassId!);
        } else {
          formData.append("testId", selectedTest!.id);
          formData.append("classId", selectedTest!.class_id);
        }
        formData.append("idempotencyKey", idempotencyKey);
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

        const job = await pollJobUntilTerminal(created.jobId);
        if (job.status === "failed" || job.status === "cancelled") {
          throw new Error(job.error ?? "Preview job failed.");
        }
        const nextPreview: StackPreview = { pages: job.preview?.pages ?? [] };
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
        setPreview(nextPreview);
        setAssignments(buildInitialAssignments(nextPreview));
        setState("reviewing");
      } catch (error) {
        const rawMessage = error instanceof Error ? error.message : "Failed to preview stack.";
        if (error instanceof GraiderApiError && error.code) {
          setLimitCode(error.code);
        } else {
          setLimitCode(null);
        }
        const lowered = rawMessage.toLowerCase();
        const message = lowered.includes("entity too large") || lowered.includes("request entity too large")
          ? "Upload is too large for direct processing. Try fewer/smaller images; backend async queue processing is recommended."
          : rawMessage;
        setErrorMessage(message);
        setState("uploadStack");
      }
    },
    [gradingMode, selectedTest, autoClassId, graiderFetch],
  );

  const setAssignment = useCallback((pageIndex: number, value: AssignmentValue) => {
    setAssignments((prev) => ({ ...prev, [pageIndex]: value }));
  }, []);

  const confirmAll = useCallback(async () => {
    if (!selectedTest || !preview) {
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
      const value = assignments[page.pageIndex];
      if (!value || value === SKIP_VALUE) continue;
      payloadAssignments.push({
        pageIndex: page.pageIndex,
        studentId: value,
        ocrAnswers: page.ocrAnswers,
        storagePath: page.storagePath ?? null,
      });
    }

    if (payloadAssignments.length === 0) {
      setErrorMessage("Assign at least one page before grading.");
      setState("reviewing");
      return;
    }

    const duplicateStudentIds = Array.from(
      payloadAssignments.reduce((acc, row) => {
        if (acc.has(row.studentId)) return acc;
        const count = payloadAssignments.filter((x) => x.studentId === row.studentId).length;
        if (count > 1) acc.add(row.studentId);
        return acc;
      }, new Set<string>()),
    );
    if (duplicateStudentIds.length > 0) {
      setErrorMessage("A student is assigned to multiple pages. Resolve duplicates before grading.");
      setState("reviewing");
      return;
    }

    setState("committing");

    try {
      const created = await handleJson<{ jobId: string }>(
        await graiderFetch("/api/grade-stack/jobs/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previewJobId,
            testId: selectedTest.id,
            assignments: payloadAssignments,
            idempotencyKey: `${selectedTest.id}:${payloadAssignments
              .map((entry) => `${entry.pageIndex}:${entry.studentId}`)
              .join("|")}`,
          }),
        }),
      );
      const job = await pollJobUntilTerminal(created.jobId);
      if (job.status === "failed" || job.status === "cancelled") {
        setErrorMessage(job.error ?? "Commit job failed.");
        setState("reviewing");
        return;
      }
      const nextResults = job.commit?.results ?? [];
      setResults({ results: nextResults });
      setState("results");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to grade stack.";
      setErrorMessage(message);
      setState("reviewing");
    }
  }, [assignments, preview, previewJobId, selectedTest, graiderFetch]);

  const back = useCallback(() => {
    setErrorMessage("");
    setState((prev) => {
      if (prev === "uploadStack") {
        setTestDiscovery(null);
        return "pickTest";
      }
      if (prev === "reviewing") return "uploadStack";
      if (prev === "results") return "pickTest";
      return prev;
    });
  }, []);

  const restart = useCallback(() => {
    setGradingMode("selected");
    setAutoClassId(null);
    setAutoClassName(null);
    setTestDiscovery(null);
    setSelectedTest(null);
    setPreview(null);
    setAssignments({});
    setResults(null);
    setPreviewJobId(null);
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
      selectAutoGrade,
      submitImages,
      setAssignment,
      confirmAll,
      back,
      restart,
      clearError,
    }),
    [selectTest, selectAutoGrade, submitImages, setAssignment, confirmAll, back, restart, clearError],
  );

  return {
    state,
    gradingMode,
    selectedTest,
    autoClassId,
    autoClassName,
    testDiscovery,
    preview,
    assignments,
    results,
    errorMessage,
    limitCode,
    isBusy,
    actions,
  };
}
