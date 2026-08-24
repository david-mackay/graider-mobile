import { View, Text, Pressable, ScrollView } from "react-native";
import { useState } from "react";
import { Badge, Card, btnSecondary } from "@/components/shared/ui";
import ExportGradePdfButton from "@/components/shared/ExportGradePdfButton";
import UploadAssetImage from "@/components/shared/UploadAssetImage";
import GradeOverrideSheet from "@/components/teacher/grade-wizard/GradeOverrideSheet";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { GradedAttemptDetail, GradedAttemptQuestion } from "@/lib/dashboard-types";

type AttemptBreakdownCardProps = {
  attempt: GradedAttemptDetail;
  studentName?: string | null;
  onClose: () => void;
  onAttemptChange?: (attempt: GradedAttemptDetail) => void;
  prevLabel?: string;
  nextLabel?: string;
  onPrevious?: () => void;
  onNext?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

type OverrideTarget = {
  question: GradedAttemptQuestion;
};

/** Graded submission detail: score, scans, editable per-question marks and answer key. */
export default function AttemptBreakdownCard({
  attempt,
  studentName,
  onClose,
  onAttemptChange,
  prevLabel = "Previous",
  nextLabel = "Next",
  onPrevious,
  onNext,
  canGoPrevious = false,
  canGoNext = false,
}: AttemptBreakdownCardProps) {
  const graiderFetch = useGraiderFetch();
  const paperPhotos = attempt.ocr_uploads ?? [];
  const showNav = onPrevious && onNext;
  const [target, setTarget] = useState<OverrideTarget | null>(null);

  async function saveQuestion(save: { marksEarned: number; feedback: string; correctAnswer: string }) {
    if (!target) return;
    const question = target.question;
    const classId = attempt.test_class_id?.trim();
    const keyChanged = save.correctAnswer !== (question.correct_answer ?? "");

    if (classId && save.correctAnswer && keyChanged) {
      await handleJson(
        await graiderFetch(`/api/questions/${question.question_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: classId,
            classId,
            correct_answer: save.correctAnswer,
            correctAnswer: save.correctAnswer,
          }),
        }),
      );
    }

    const payload = await handleJson<{
      answer: { marks_earned: number; feedback: string; updated_at: string | null };
      attempt: { total_marks: number; max_marks: number };
    }>(
      await graiderFetch(`/api/submissions/${attempt.id}/answers/${question.question_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          keyChanged
            ? { studentAnswer: question.student_answer }
            : { marksEarned: save.marksEarned, feedback: save.feedback },
        ),
      }),
    );

    onAttemptChange?.({
      ...attempt,
      total_marks: payload.attempt.total_marks,
      max_marks: payload.attempt.max_marks,
      questions: attempt.questions.map((item) =>
        item.question_id === question.question_id
          ? {
              ...item,
              marks_earned: payload.answer.marks_earned,
              feedback: payload.answer.feedback,
              correct_answer: save.correctAnswer,
              graded_by: "teacher",
              updated_at: payload.answer.updated_at,
            }
          : item,
      ),
    });
  }

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
          <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Tap a question to edit marks or the answer key
          </Text>
          {attempt.questions.map((question, index) => (
            <Pressable
              key={question.question_id}
              onPress={() => setTarget({ question })}
              className="rounded-lg border border-line bg-cream px-3 py-2"
            >
              <View className="flex-row items-start justify-between gap-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Question {index + 1}
                </Text>
                <Text className="text-sm font-bold text-pen">
                  {question.marks_earned ?? 0}/{question.marks}
                </Text>
              </View>
              <Text className="mt-1 text-sm text-ink">{question.prompt}</Text>
              <Text className="mt-2 text-sm text-ink-soft">
                Answer: {question.student_answer.trim() || "—"}
              </Text>
              <Text className="mt-1 text-xs text-moss-deep">
                Key: {question.correct_answer?.trim() || "—"}
              </Text>
              {question.feedback?.trim() ? (
                <Text className="mt-2 text-xs text-moss-deep">{question.feedback}</Text>
              ) : null}
            </Pressable>
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

      <GradeOverrideSheet
        visible={target !== null}
        questionLabel={target?.question.prompt ?? ""}
        maxMarks={target?.question.marks ?? 0}
        initialMarks={target?.question.marks_earned ?? 0}
        initialFeedback={target?.question.feedback ?? ""}
        initialCorrectAnswer={target?.question.correct_answer ?? ""}
        onClose={() => setTarget(null)}
        onSave={saveQuestion}
      />
    </Card>
  );
}
