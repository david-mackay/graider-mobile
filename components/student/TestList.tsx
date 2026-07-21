import { View, Text, TouchableOpacity } from "react-native";
import { Badge, Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import { IconClipboard } from "@/components/shared/icons";
import type { DashboardAttempt, DashboardTest } from "@/lib/dashboard-types";

type TestRow = { test: DashboardTest; attempt: DashboardAttempt | null };

type TestListProps = {
  rows: TestRow[];
  classNameById: Map<string, string>;
  onStart: (testId: string) => void;
  onViewResult: (attemptId: string) => void;
};

function actionForRow(test: DashboardTest, attempt: DashboardAttempt | null) {
  if (attempt?.status === "graded") {
    return { kind: "result" as const, label: "View result" };
  }
  if (attempt && attempt.status !== "draft") {
    return { kind: "waiting" as const, label: "Awaiting grade" };
  }
  const available = test.available_now !== false && test.status !== "closed" && test.status !== "draft";
  if (attempt?.status === "draft") {
    return available
      ? { kind: "start" as const, label: "Resume" }
      : { kind: "disabled" as const, label: "Not available" };
  }
  if (!available) {
    if (test.status === "scheduled" && test.opens_at) {
      return {
        kind: "disabled" as const,
        label: `Opens ${new Date(test.opens_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
      };
    }
    if (test.status === "closed") return { kind: "disabled" as const, label: "Closed" };
    return { kind: "disabled" as const, label: "Not available" };
  }
  return { kind: "start" as const, label: "Start test" };
}

export default function TestList({ rows, classNameById, onStart, onViewResult }: TestListProps) {
  if (rows.length === 0) {
    return (
      <Card className="py-12">
        <View className="mb-3 h-12 w-12 items-center justify-center self-center rounded-2xl bg-pen-wash">
          <IconClipboard className="h-6 w-6 text-ink-faint" />
        </View>
        <Text className="text-center text-sm font-semibold text-ink">No tests yet</Text>
        <Text className="mt-1 text-center text-xs text-ink-faint">
          Your teacher hasn’t assigned any tests yet.
        </Text>
      </Card>
    );
  }

  return (
    <View className="gap-3">
      {rows.map(({ test, attempt }) => {
        const action = actionForRow(test, attempt);
        return (
          <Card key={test.id}>
            <View className="flex-row flex-wrap items-start justify-between gap-3">
              <View className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="font-semibold text-ink">{test.title}</Text>
                  {attempt?.status === "draft" ? (
                    <Badge variant="yellow">In progress</Badge>
                  ) : attempt ? (
                    <Badge variant={attempt.status === "graded" ? "green" : "yellow"}>
                      {attempt.status === "graded" ? "graded" : "submitted"}
                    </Badge>
                  ) : (
                    <Badge variant="gray">Not started</Badge>
                  )}
                </View>
                <Text className="mt-0.5 text-xs text-ink-faint">
                  {classNameById.get(test.class_id) ?? ""}
                </Text>
                {attempt?.status === "graded" ? (
                  <View className="mt-1.5 flex-row items-baseline gap-1">
                    <Text className="text-lg font-bold text-pen">{attempt.total_marks}</Text>
                    <Text className="text-xs text-ink-faint">/ {attempt.max_marks}</Text>
                  </View>
                ) : null}
              </View>
              <View>
                {action.kind === "start" ? (
                  <TouchableOpacity className={btnPrimary} onPress={() => onStart(test.id)}>
                    <Text className="text-sm font-semibold text-white">{action.label}</Text>
                  </TouchableOpacity>
                ) : action.kind === "result" && attempt ? (
                  <TouchableOpacity className={btnSecondary} onPress={() => onViewResult(attempt.id)}>
                    <Text className="text-sm font-medium text-pen-deep">{action.label}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text className="self-center text-xs text-ink-faint">{action.label}</Text>
                )}
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
