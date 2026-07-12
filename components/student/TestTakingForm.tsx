import { View, Text, TouchableOpacity, TextInput } from 'react-native';

import { Card, btnPrimary, btnSecondary, inputClass } from "@/components/shared/ui";
import type { TestDetail } from "@/lib/types";

type TestTakingFormProps = {
  test: TestDetail;
  answers: Record<string, string>;
  onChangeAnswer: (questionId: string, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
  isBusy: boolean;
};

export default function TestTakingForm({
  test,
  answers,
  onChangeAnswer,
  onSubmit,
  onClose,
  isBusy,
}: TestTakingFormProps) {
  const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <View className="mb-6">
      <View className="mb-6 flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">In progress</Text>
          <Text className="mt-0.5 text-xl font-bold text-ink">{test.title}</Text>
          <Text className="mt-1 text-sm text-ink-faint">
            {test.questions.length} question{test.questions.length !== 1 ? "s" : ""} · {totalMarks} marks
          </Text>
        </View>
        <TouchableOpacity
          onPress={onClose}
          className="rounded-2xl border border-line bg-paper px-3 py-2"
        >
          <Text className="text-sm font-medium text-ink-soft">Exit test</Text>
        </TouchableOpacity>
      </View>

      <View className="space-y-4">
        {test.questions.map((q, i) => (
          <Card key={q.question_id} className="border-line">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Question {i + 1}
              </Text>
              <Text className="rounded-full bg-pen-wash px-2.5 py-0.5 text-xs font-semibold text-pen">
                {q.marks} mark{q.marks !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text className="text-base font-semibold text-ink leading-relaxed">{q.prompt}</Text>
            <TextInput
              multiline
              className={`${inputClass} mt-4 min-h-[120px]`}
              value={answers[q.question_id] ?? ""}
              onChangeText={(text) => onChangeAnswer(q.question_id, text)}
              placeholder="Type your answer here…"
              textAlignVertical="top"
            />
          </Card>
        ))}

        <View className="mt-4 flex-row gap-3 rounded-2xl border border-line bg-paper p-3">
          <TouchableOpacity className={`${btnPrimary} flex-1 justify-center py-3`} onPress={onSubmit} disabled={isBusy}>
            <Text className="text-white font-semibold text-center">{isBusy ? "Submitting…" : "Submit test"}</Text>
          </TouchableOpacity>
          <TouchableOpacity className={btnSecondary} onPress={onClose}>
            <Text className="text-pen-deep font-medium">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
