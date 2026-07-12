import { resolveJobResumeTarget, assignmentsToMap } from "@/lib/resume-grade-job";
import type { GradeStackJob } from "@/lib/types";

describe("resume-grade-job", () => {
  const baseJob: GradeStackJob = {
    id: "job_1",
    phase: "preview",
    status: "needs_review",
    testId: "test_1",
    classId: "class_1",
    attemptCount: 1,
    preview: {
      pages: [],
      studentPageAssignments: [
        { pageIndex: 0, studentId: "s1" },
        { pageIndex: 1, studentId: "s1" },
      ],
    },
    commit: null,
    studentPageAssignments: [
      { pageIndex: 0, studentId: "s1" },
      { pageIndex: 1, studentId: "s1" },
    ],
    failures: [],
    error: null,
    createdAt: "2026-06-28T00:00:00.000Z",
    updatedAt: "2026-06-28T00:00:01.000Z",
  };

  it("maps student page assignments to page index lookup", () => {
    const map = assignmentsToMap(baseJob.studentPageAssignments);
    expect(map.get(0)).toBe("s1");
    expect(map.get(1)).toBe("s1");
  });

  it("resolves preview jobs to review step", () => {
    const target = resolveJobResumeTarget(baseJob);
    expect(target.kind).toBe("review");
    if (target.kind === "review") {
      expect(target.previewJobId).toBe("job_1");
      expect(target.pageToStudentId.get(0)).toBe("s1");
    }
  });

  it("resolves completed commit jobs to results", () => {
    const target = resolveJobResumeTarget({
      ...baseJob,
      phase: "commit",
      status: "completed",
      commit: { results: [] },
    });
    expect(target.kind).toBe("results");
  });

  it("waits on in-flight jobs", () => {
    const target = resolveJobResumeTarget({ ...baseJob, status: "processing" });
    expect(target.kind).toBe("wait");
  });
});
