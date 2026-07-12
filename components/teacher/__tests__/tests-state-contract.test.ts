import { resolveReleaseState } from "@/lib/dashboard-client";
import type { GradeStackJob, GradeStackJobStatus } from "@/lib/types";

describe("resolveReleaseState", () => {
  it("prefers explicit release_status when present", () => {
    expect(resolveReleaseState({ release_status: "grading", grades_released: true })).toBe("grading");
    expect(resolveReleaseState({ release_status: "released", grades_released: false })).toBe("released");
  });

  it("falls back to legacy grades_released", () => {
    expect(resolveReleaseState({ grades_released: true })).toBe("released");
    expect(resolveReleaseState({ grades_released: false })).toBe("ready");
  });

  it("defaults to ready when nothing is provided", () => {
    expect(resolveReleaseState({})).toBe("ready");
  });
});

describe("GradeStackJob contracts", () => {
  function build(status: GradeStackJobStatus): GradeStackJob {
    return {
      id: "job_1",
      phase: "preview",
      status,
      testId: "test_1",
      classId: "class_1",
      attemptCount: 0,
      failures: [],
      error: null,
      createdAt: "2026-05-28T00:00:00.000Z",
      updatedAt: "2026-05-28T00:00:00.000Z",
      preview: null,
      commit: null,
    };
  }

  it("supports non-terminal lifecycle statuses", () => {
    expect(build("queued").status).toBe("queued");
    expect(build("processing").status).toBe("processing");
    expect(build("needs_review").status).toBe("needs_review");
  });

  it("supports terminal statuses with failure metadata", () => {
    const failed: GradeStackJob = {
      ...build("failed"),
      failures: [
        {
          studentId: "student_1",
          pageIndex: 1,
          code: "OCR_TIMEOUT",
          message: "OCR timed out for page 2",
          retryable: true,
        },
      ],
      error: "1 page failed",
    };
    expect(failed.failures[0].retryable).toBe(true);
    expect(failed.error).toContain("failed");
  });
});
