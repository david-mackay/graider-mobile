import { View, Text } from "react-native";

export type GradedQuestionRow = {
  prompt: string;
  studentAnswer: string;
  feedback?: string;
  marksEarned: number;
  maxMarks: number;
};

type GradedQuestionBreakdownProps = {
  questions: GradedQuestionRow[];
};

/** Per-question prompt / student answer / feedback — same pattern as AttemptBreakdownCard. */
export default function GradedQuestionBreakdown({ questions }: GradedQuestionBreakdownProps) {
  if (questions.length === 0) return null;

  return (
    <View className="gap-2">
      {questions.map((question, index) => (
        <View
          key={`${index}-${question.prompt.slice(0, 24)}`}
          className="rounded-lg border border-line bg-cream px-3 py-2"
        >
          <View className="flex-row items-start justify-between gap-3">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Question {index + 1}
            </Text>
            <Text className="text-sm font-bold text-pen">
              {question.marksEarned}/{question.maxMarks}
            </Text>
          </View>
          <Text className="mt-1 text-sm text-ink">{question.prompt}</Text>
          <Text className="mt-2 text-sm text-ink-soft">
            Answer: {question.studentAnswer.trim() || "—"}
          </Text>
          {question.feedback?.trim() ? (
            <Text className="mt-2 text-xs text-moss-deep">{question.feedback}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}
