import { View, Text, TouchableOpacity } from "react-native";
import { Badge, Card, btnSecondary } from "@/components/shared/ui";
import type { GradedAttemptDetail } from "@/lib/dashboard-types";

type AttemptDetailCardProps = {
  attempt: GradedAttemptDetail;
  onClose: () => void;
};

export default function AttemptDetailCard({ attempt, onClose }: AttemptDetailCardProps) {
  const isReleased = attempt.release_status ? attempt.release_status === "released" : attempt.status === "graded";
  const showScore = isReleased && attempt.status === "graded";
  const showFeedback = attempt.show_ai_feedback !== false;

  return (
    <Card className="border-line">
      <View className="flex flex-wrap items-start justify-between gap-3">
        <View>
          <View className="flex-row items-center gap-2">
            <Text className="font-display text-base font-semibold text-ink">{attempt.test_title}</Text>
            <Badge variant={showScore ? "green" : "blue"}>{attempt.status}</Badge>
          </View>
          {showScore ? (
            <Text
              className="mt-2 font-hand text-3xl font-bold text-pen"
              style={{ transform: [{ rotate: "-2deg" }] }}
            >
              {attempt.total_marks}/{attempt.max_marks}
            </Text>
          ) : (
            <Text className="mt-1 text-sm text-marigold-deep">Results not yet released.</Text>
          )}
        </View>
        <TouchableOpacity className={btnSecondary} onPress={onClose}>
          <Text className="text-sm font-bold text-ink">Close</Text>
        </TouchableOpacity>
      </View>
      <View className="mt-4 gap-3 border-t border-line-soft pt-4">
        <Text className="text-sm font-semibold text-ink">Question breakdown</Text>
        {attempt.questions.map((question, index) => (
          <View key={question.question_id} className="rounded-lg border border-line-soft bg-cream p-4">
            <View className="flex flex-wrap items-center justify-between gap-2">
              <Text className="text-xs font-semibold text-ink-faint">
                Q{index + 1} · {question.marks} mark{question.marks !== 1 ? "s" : ""}
              </Text>
              {question.marks_earned != null ? (
                <Text
                  className={`text-sm font-bold ${
                    question.marks_earned === question.marks
                      ? "text-moss"
                      : question.marks_earned > 0
                        ? "text-marigold"
                        : "text-pen"
                  }`}
                >
                  {question.marks_earned}/{question.marks}
                </Text>
              ) : (
                <Text className="text-sm text-ink-faint">—</Text>
              )}
            </View>
            <Text className="mt-1.5 text-sm font-medium text-ink">{question.prompt}</Text>
            <Text className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">Your answer</Text>
            <View className="mt-1 rounded-md border border-line-soft bg-paper px-3 py-2">
              <Text className="text-xs leading-relaxed text-ink-soft">
                {question.student_answer || "No answer provided."}
              </Text>
            </View>
            {showFeedback && question.feedback ? (
              <Text className="mt-3 border-l-2 border-pen-soft pl-3 font-hand text-lg leading-snug text-pen-deep">
                {question.feedback}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </Card>
  );
}
