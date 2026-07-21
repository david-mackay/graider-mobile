import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import ParsePresetPicker from "@/components/shared/ParsePresetPicker";
import type { DocumentParsePreset } from "@/lib/parse-presets";
import type { StudentBucket } from "@/lib/student-grade";
import { totalPageCount } from "@/lib/student-grade";

type StepSessionSummaryProps = {
  buckets: StudentBucket[];
  testTitle: string;
  parsePreset: DocumentParsePreset;
  onParsePresetChange: (preset: DocumentParsePreset) => void;
  onAddStudent: () => void;
  onResumeStudent: (studentId: string) => void;
  onRemoveStudent: (studentId: string) => void;
  onGradeAll: () => void;
  onBack: () => void;
  isBusy: boolean;
  errorMessage: string;
};

export default function StepSessionSummary({
  buckets,
  testTitle,
  parsePreset,
  onParsePresetChange,
  onAddStudent,
  onResumeStudent,
  onRemoveStudent,
  onGradeAll,
  onBack,
  isBusy,
  errorMessage,
}: StepSessionSummaryProps) {
  const captured = buckets.filter((b) => b.pages.length > 0);
  const pageTotal = totalPageCount(captured);

  return (
    <View className="gap-4">
      <Card>
        <Text className="text-base font-semibold text-ink">Session summary</Text>
        <Text className="mt-1 text-sm text-ink-soft">
          {testTitle} · {captured.length} student{captured.length === 1 ? "" : "s"} · {pageTotal} page
          {pageTotal === 1 ? "" : "s"}
        </Text>
      </Card>

      <Card>
        <ParsePresetPicker
          surface="grade_stack"
          value={parsePreset}
          onChange={onParsePresetChange}
          disabled={isBusy}
        />
      </Card>

      {errorMessage ? (
        <Card className="border-pen-soft/60 bg-pen-wash">
          <Text className="text-sm text-pen-deep">{errorMessage}</Text>
        </Card>
      ) : null}

      <ScrollView className="max-h-80">
        {captured.map((bucket) => (
          <View
            key={bucket.studentId}
            className="mb-2 flex-row items-center rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <TouchableOpacity
              onPress={() => onResumeStudent(bucket.studentId)}
              className="flex-1 flex-row items-center"
            >
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
                <Text className="text-sm font-bold text-pen-deep">
                  {bucket.studentName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">{bucket.studentName}</Text>
                <Text className="text-xs text-ink-soft">
                  {bucket.pages.length} page{bucket.pages.length === 1 ? "" : "s"} · tap to add more
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => onRemoveStudent(bucket.studentId)}
              disabled={isBusy}
              className="rounded-full px-3 py-2"
            >
              <Text className="text-xs font-medium text-ink-soft">Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={onAddStudent}
        disabled={isBusy}
        className="items-center rounded-full border border-dashed border-pen/40 bg-pen-wash/20 py-3"
      >
        <Text className="text-sm font-semibold text-pen-deep">+ Add another student</Text>
      </TouchableOpacity>

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <TouchableOpacity onPress={onBack} disabled={isBusy} className={btnSecondary}>
          <Text className="text-sm font-medium text-pen-deep">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onGradeAll}
          disabled={isBusy || captured.length === 0}
          className={btnPrimary}
        >
          <Text className="text-sm font-semibold text-white">
            {isBusy ? "Reading pages…" : `Grade all (${captured.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
