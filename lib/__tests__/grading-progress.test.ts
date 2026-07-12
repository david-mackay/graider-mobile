import {
  buildStudentGradingProgress,
  gradingProgressHeadline,
} from "@/lib/grading-progress";
import type { GradeStackJob } from "@/lib/types";

const students = [
  { studentId: "s1", studentName: "Alice", pageCount: 2 },
  { studentId: "s2", studentName: "Bob", pageCount: 1 },
];

function previewJob(status: GradeStackJob["status"]): GradeStackJob {
  return {
    id: "job-1",
    phase: "preview",
    status,
    testId: "test-1",
    classId: "class-1",
    attemptCount: 1,
    preview: null,
    commit: null,
    failures: [],
    error: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("buildStudentGradingProgress", () => {
  it("marks all students as reading during preview processing", () => {
    const progress = buildStudentGradingProgress(students, previewJob("processing"), "preview");
    expect(progress.every((entry) => entry.status === "processing")).toBe(true);
    expect(progress[0]?.detail).toBe("Reading pages");
  });

  it("shows per-student scores as commit completes", () => {
    const job: GradeStackJob = {
      ...previewJob("processing"),
      phase: "commit",
      status: "processing",
      commit: {
        results: [
          {
            studentId: "s1",
            attemptId: "a1",
            created: true,
            totalMarks: 8,
            maxMarks: 10,
            grades: [],
          },
        ],
        progress: {
          total: 2,
          completed: 1,
          currentStudentId: "s2",
        },
      },
    };

    const progress = buildStudentGradingProgress(students, job, "commit");
    expect(progress[0]).toMatchObject({ status: "done", detail: "8/10" });
    expect(progress[1]).toMatchObject({ status: "processing", detail: "Grading answers" });
  });
});

describe("gradingProgressHeadline", () => {
  it("summarizes commit progress", () => {
    const progress = buildStudentGradingProgress(
      students,
      {
        ...previewJob("processing"),
        phase: "commit",
        status: "processing",
        commit: {
          results: [],
          progress: { total: 2, completed: 0, currentStudentId: "s1" },
        },
      },
      "commit",
    );
    expect(gradingProgressHeadline(progress, "commit", previewJob("processing"))).toContain(
      "Grading students",
    );
  });
});
