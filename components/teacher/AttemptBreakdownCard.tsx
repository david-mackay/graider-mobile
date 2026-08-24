import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Badge, btnSecondary } from "@/components/shared/ui";
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
  onPrevious?: () => void | Promise<void>;
  onNext?: () => void | Promise<void>;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
};

type OverrideTarget = {
  question: GradedAttemptQuestion;
};

/** Full-screen editor for a graded paper: scans, marks, and answer key. */
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
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const paperPhotos = attempt.ocr_uploads ?? [];
  const showNav = Boolean(onPrevious && onNext);
  const [target, setTarget] = useState<OverrideTarget | null>(null);
  const [navBusy, setNavBusy] = useState(false);

  useEffect(() => {
    setTarget(null);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [attempt.id]);

  async function go(direction: "prev" | "next") {
    if (navBusy) return;
    if (direction === "prev" && (!onPrevious || !canGoPrevious)) return;
    if (direction === "next" && (!onNext || !canGoNext)) return;
    setNavBusy(true);
    try {
      if (direction === "prev") await onPrevious?.();
      else await onNext?.();
    } finally {
      setNavBusy(false);
    }
  }

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
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-start justify-between gap-3 border-b border-line px-4 pb-3">
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-ink">{attempt.test_title}</Text>
            {studentName ? <Text className="mt-0.5 text-xs text-ink-faint">{studentName}</Text> : null}
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

        <View className="relative flex-1">
          <ScrollView
            ref={scrollRef}
            className="flex-1"
            contentContainerClassName="px-4 py-4"
            keyboardShouldPersistTaps="handled"
          >
            {paperPhotos.length > 0 ? (
              <View>
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
                    className="rounded-lg border border-line bg-paper px-3 py-2"
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
            ) : (
              <Text className="text-sm text-ink-soft">No questions on this paper yet.</Text>
            )}
          </ScrollView>

          {navBusy ? (
            <View className="absolute inset-0 items-center justify-center bg-cream/70">
              <ActivityIndicator />
            </View>
          ) : null}
        </View>

        {showNav ? (
          <View
            className="flex-row gap-2 border-t border-line bg-cream px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <Pressable
              className={`flex-1 ${btnSecondary} items-center ${!canGoPrevious || navBusy ? "opacity-50" : ""}`}
              onPress={() => void go("prev")}
              disabled={!canGoPrevious || navBusy}
            >
              <Text className="text-sm font-medium text-pen-deep">{prevLabel}</Text>
            </Pressable>
            <Pressable
              className={`flex-1 ${btnSecondary} items-center ${!canGoNext || navBusy ? "opacity-50" : ""}`}
              onPress={() => void go("next")}
              disabled={!canGoNext || navBusy}
            >
              <Text className="text-sm font-medium text-pen-deep">{nextLabel}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </View>

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
    </Modal>
  );
}
