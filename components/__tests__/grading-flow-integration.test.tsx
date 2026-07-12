import { resolveReleaseState } from "@/lib/dashboard-client";
import type { GradeStackJob, GradeStackQuestionMatch } from "@/lib/types";

describe("grading flow contracts", () => {
  it("treats explicit release status as source of truth", () => {
    expect(resolveReleaseState({ release_status: "ready", grades_released: true })).toBe("ready");
    expect(resolveReleaseState({ release_status: "released", grades_released: false })).toBe("released");
  });

  it("keeps legacy behavior compatible", () => {
    expect(resolveReleaseState({ grades_released: true })).toBe("released");
    expect(resolveReleaseState({ grades_released: false })).toBe("ready");
  });

  it("models async preview and commit job envelopes", () => {
    const previewJob: GradeStackJob = {
      id: "job_preview_123",
      phase: "preview",
      status: "needs_review",
      testId: "test_123",
      classId: "class_123",
      attemptCount: 1,
      preview: { pages: [], questionMatches: [] },
      commit: null,
      failures: [],
      error: null,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:01.000Z",
    };

    const commitJob: GradeStackJob = {
      ...previewJob,
      id: "job_commit_123",
      phase: "commit",
      status: "completed",
      preview: null,
      commit: { results: [] },
    };

    expect(previewJob.phase).toBe("preview");
    expect(previewJob.status).toBe("needs_review");
    expect(commitJob.phase).toBe("commit");
    expect(commitJob.status).toBe("completed");
  });

  it("supports explicit matching reason metadata for multi-page OCR", () => {
    const match: GradeStackQuestionMatch = {
      pageIndex: 2,
      questionId: "question_3",
      questionIndex: 2,
      matchingReason: "index_hint",
      confidence: 1,
      needsReview: false,
      ocrAnswer: { question: "Q3", answer: "42", question_index: 2 },
    };

    expect(match.matchingReason).toBe("index_hint");
    expect(match.needsReview).toBe(false);
  });
});
