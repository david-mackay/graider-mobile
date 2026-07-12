import { ActivityIndicator, View, Text } from "react-native";
import { Card } from "@/components/shared/ui";
import type { StudentGradingProgress } from "@/lib/grading-progress";
import { gradingProgressHeadline } from "@/lib/grading-progress";
import type { GradeStackJob } from "@/lib/types";
import type { GradingPhase } from "@/lib/grading-progress";

type StepGradingProgressProps = {
  phase: GradingPhase;
  testTitle: string;
  students: StudentGradingProgress[];
  activeJob: GradeStackJob | null;
  errorMessage?: string;
};

function statusColor(status: StudentGradingProgress["status"]): string {
  switch (status) {
    case "done":
      return "text-moss-deep";
    case "processing":
      return "text-pen-deep";
    case "failed":
      return "text-pen";
    default:
      return "text-ink-faint";
  }
}

function statusLabel(status: StudentGradingProgress["status"]): string {
  switch (status) {
    case "done":
      return "Done";
    case "processing":
      return "In progress";
    case "failed":
      return "Failed";
    default:
      return "Queued";
  }
}

export default function StepGradingProgress({
  phase,
  testTitle,
  students,
  activeJob,
  errorMessage,
}: StepGradingProgressProps) {
  const headline = gradingProgressHeadline(students, phase, activeJob);
  const phaseLabel = phase === "preview" ? "Reading pages" : "Grading";

  return (
    <View className="gap-4">
      <Card>
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">{phaseLabel}</Text>
        <Text className="mt-1 text-base font-semibold text-ink">{testTitle}</Text>
        <Text className="mt-2 text-sm text-ink-soft">{headline}</Text>
        <Text className="mt-1 text-xs text-ink-faint">
          You can leave this screen — we'll notify you when it's ready.
        </Text>
      </Card>

      {errorMessage ? (
        <Card className="border-pen-soft/60 bg-pen-wash">
          <Text className="text-sm text-pen-deep">{errorMessage}</Text>
        </Card>
      ) : null}

      <View className="gap-2">
        {students.map((student) => (
          <View
            key={student.studentId}
            className="flex-row items-center rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
              <Text className="text-sm font-bold text-pen-deep">
                {student.studentName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-ink">{student.studentName}</Text>
              <Text className="text-xs text-ink-soft">
                {student.pageCount} page{student.pageCount === 1 ? "" : "s"} · {student.detail}
              </Text>
            </View>
            <View className="items-end gap-1">
              {student.status === "processing" ? (
                <ActivityIndicator size="small" color="#99291f" />
              ) : null}
              <Text className={`text-xs font-semibold ${statusColor(student.status)}`}>
                {statusLabel(student.status)}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
