import { View, Text, Pressable, ScrollView } from "react-native";
import { Badge, Card, btnSecondary } from "@/components/shared/ui";
import ExportGradePdfButton from "@/components/shared/ExportGradePdfButton";
import UploadAssetImage from "@/components/shared/UploadAssetImage";
import type { GradedAttemptDetail } from "@/lib/dashboard-types";

type AttemptBreakdownCardProps = {
  attempt: GradedAttemptDetail;
  studentName?: string | null;
  onClose: () => void;
  prevLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

/** Graded submission detail: score, scans, per-question breakdown, PDF export. */
export default function AttemptBreakdownCard({
  attempt,
  studentName,
  onClose,
  prevLabel = "Previous",
  nextLabel = "Next",
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
}: AttemptBreakdownCardProps) {
  const paperPhotos = attempt.ocr_uploads ?? [];
  const showNav = onPrevious && onNext;

  return (
    <Card className="border-line">
      <View className="flex-row flex-wrap items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-ink">{attempt.test_title}</Text>
          {studentName ? (
            <Text className="mt-0.5 text-xs text-ink-faint">{studentName}</Text>
          ) : null}
          {attempt.status === "graded" ? (
            <Text className="mt-2 text-lg font-bold text-pen">
              {attempt.total_marks ?? 0}
              <Text className="text-sm font-normal text-ink-faint"> / {attempt.max_marks ?? 0}</Text>
            </Text>
          ) : (
            <View className="mt-2">
            <Badge variant={attempt.status === "submitted" ? "blue" : "gray"}>
              {attempt.status === "submitted" ? "pending" : attempt.status}
            </Badge>
            </View>
          )}
        </View>
        <View className="items-end gap-2">
          {attempt.status === "graded" ? (
            <ExportGradePdfButton attempt={attempt} studentName={studentName} label="Share PDF" compact />
          ) : null}
          <Pressable className={btnSecondary} onPress={onClose}>
            <Text className="text-sm font-medium text-pen-deep">Close</Text>
          </Pressable>
        </View>
      </View>

      {paperPhotos.length > 0 ? (
        <View className="mt-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Scanned paper ({paperPhotos.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2">
            {paperPhotos.map((path) => (
              <UploadAssetImage
                key={path}
                storagePath={path}
                className="h-36 w-28 rounded-lg border border-line bg-cream"
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {attempt.questions.length > 0 ? (
        <View className="mt-4 gap-2">
          {attempt.questions.map((question, index) => (
            <View key={question.question_id} className="rounded-lg border border-line bg-paper px-3 py-2">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Question {index + 1}
              </Text>
              <Text className="mt-1 text-sm text-ink">{question.prompt}</Text>
              <Text className="mt-2 text-sm text-ink-soft">Answer: {question.student_answer || "—"}</Text>
              {question.feedback ? (
                <Text className="mt-2 text-xs text-moss-deep">{question.feedback}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {showNav ? (
        <View className="mt-3 flex-row gap-2">
          <Pressable
            className={`flex-1 ${btnSecondary} items-center ${!canGoPrevious ? "opacity-50" : ""}`}
            onPress={onPrevious}
            disabled={!canGoPrevious}
          >
            <Text className="text-sm font-medium text-pen-deep">{prevLabel}</Text>
          </Pressable>
          <Pressable
            className={`flex-1 ${btnSecondary} items-center ${!canGoNext ? "opacity-50" : ""}`}
            onPress={onNext}
            disabled={!canGoNext}
          >
            <Text className="text-sm font-medium text-pen-deep">{nextLabel}</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}
