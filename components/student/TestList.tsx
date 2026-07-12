import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native';
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

export default function TestList({ rows, classNameById, onStart, onViewResult }: TestListProps) {
  if (rows.length === 0) {
    return (
      <Card className="text-center py-12">
        <View className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-pen-wash">
          <IconClipboard className="h-6 w-6 text-ink-faint" />
        </View>
        <Text className="text-sm font-semibold text-ink">No tests yet</Text>
        <Text className="mt-1 text-xs text-ink-faint">Your teacher hasn{"’"}t assigned any tests yet.</Text>
      </Card>
    );
  }

  return (
    <View className="space-y-3">
      {rows.map(({ test, attempt }) => (
        <Card key={test.id} className="hover:border-line transition-colors duration-150">
          <View className="flex flex-wrap items-start justify-between gap-3">
            <View className="flex-1 min-w-0">
              <View className="flex items-center gap-2">
                <Text className="font-semibold text-ink">{test.title}</Text>
                {attempt ? (
                  <Badge variant={attempt.release_status === "released" ? "green" : "yellow"}>
                    {attempt.release_status === "released"
                      ? "released"
                      : attempt.status === "graded"
                        ? "ready"
                        : "grading"}
                  </Badge>
                ) : (
                  <Badge variant="gray">Not started</Badge>
                )}
              </View>
              <Text className="mt-0.5 text-xs text-ink-faint">{classNameById.get(test.class_id) ?? ""}</Text>
              {attempt?.status === "graded" ? (
                <View className="mt-1.5 inline-flex items-baseline gap-1">
                  <Text className="text-lg font-bold text-pen">{attempt.total_marks}</Text>
                  <Text className="text-xs text-ink-faint">/ {attempt.max_marks}</Text>
                </View>
              ) : null}
            </View>
            <View className="flex gap-2">
              {!attempt ? (
                <TouchableOpacity className={btnPrimary} onPress={() => onStart(test.id)}>
                  <Text className="text-white font-semibold text-sm">Start test</Text>
                </TouchableOpacity>
              ) : attempt.status === "graded" && attempt.release_status === "released" ? (
                <TouchableOpacity className={btnSecondary} onPress={() => onViewResult(attempt.id)}>
                  <Text className="text-pen-deep font-medium text-sm">View result</Text>
                </TouchableOpacity>
              ) : (
                <Text className="text-xs text-ink-faint self-center">
                  {attempt.status === "graded" ? "Awaiting release" : "Awaiting grade"}
                </Text>
              )}
            </View>
          </View>
        </Card>
      ))}
    </View>
  );
}
