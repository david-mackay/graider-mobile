import {
  parsePushNotificationData,
  isActionablePushData,
} from "@/lib/push-notifications";
import {
  firstSearchParam,
  peekPendingGradeJobId,
  setPendingGradeJobId,
  takePendingGradeJobId,
} from "@/lib/pending-grade-job";

describe("parsePushNotificationData", () => {
  it("reads jobId from a flat Expo payload", () => {
    const data = parsePushNotificationData({
      type: "grade_stack_preview",
      jobId: "job_abc",
      screen: "grade",
    });
    expect(data.jobId).toBe("job_abc");
    expect(isActionablePushData(data)).toBe(true);
  });

  it("reads jobId from nested or array values", () => {
    expect(
      parsePushNotificationData({
        data: { type: "grade_stack_preview", jobId: "job_nested" },
      }).jobId,
    ).toBe("job_nested");
    expect(
      parsePushNotificationData({
        type: "grade_stack_preview",
        jobId: ["job_array"],
      }).jobId,
    ).toBe("job_array");
  });
});

describe("pending grade job params", () => {
  afterEach(() => {
    takePendingGradeJobId();
  });

  it("stores a job id across remounts", () => {
    setPendingGradeJobId("job_1");
    expect(peekPendingGradeJobId()).toBe("job_1");
    expect(takePendingGradeJobId()).toBe("job_1");
    expect(peekPendingGradeJobId()).toBeNull();
  });

  it("coerces expo-router search params", () => {
    expect(firstSearchParam("job_1")).toBe("job_1");
    expect(firstSearchParam(["job_1", "job_2"])).toBe("job_1");
    expect(firstSearchParam("undefined")).toBeUndefined();
    expect(firstSearchParam(undefined)).toBeUndefined();
  });
});
