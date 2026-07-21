import { View, Text, TouchableOpacity } from "react-native";
import { useMemo, useState } from "react";
import { Badge, Card, GraiderTextInput, btnPrimary, btnSecondary } from "@/components/shared/ui";
import UploadAssetImage from "@/components/shared/UploadAssetImage";
import type { OcrAnswer, RosterEntry, StackPagePreview } from "@/lib/types";
import { duplicateNameCounts, rosterDisplayLabel } from "@/lib/roster-display";

type StudentReviewGroup = {
  studentId: string;
  studentName: string;
  pages: StackPagePreview[];
};

type StepStudentReviewProps = {
  pages: StackPagePreview[];
  pageToStudentId: Map<number, string>;
  roster: RosterEntry[];
  onOcrAnswersChange: (pageIndex: number, answers: OcrAnswer[]) => void;
  onConfirm: () => void;
  onBack: () => void;
  isBusy: boolean;
  errorMessage: string;
};

function rosterName(roster: RosterEntry[], studentId: string): string {
  const entry = roster.find((r) => r.user_id === studentId);
  if (!entry) return studentId.slice(0, 8);
  return rosterDisplayLabel(entry, duplicateNameCounts(roster)).primaryLabel;
}

function emptyAnswer(): OcrAnswer {
  return { question: "", answer: "", question_index: null };
}

export default function StepStudentReview({
  pages,
  pageToStudentId,
  roster,
  onOcrAnswersChange,
  onConfirm,
  onBack,
  isBusy,
  errorMessage,
}: StepStudentReviewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo((): StudentReviewGroup[] => {
    const byStudent = new Map<string, StackPagePreview[]>();
    for (const page of pages) {
      const studentId = pageToStudentId.get(page.pageIndex);
      if (!studentId) continue;
      const list = byStudent.get(studentId) ?? [];
      list.push(page);
      byStudent.set(studentId, list);
    }

    return Array.from(byStudent.entries()).map(([studentId, studentPages]) => ({
      studentId,
      studentName: rosterName(roster, studentId),
      pages: [...studentPages].sort((a, b) => a.pageIndex - b.pageIndex),
    }));
  }, [pages, pageToStudentId, roster]);

  const totalAnswers = useMemo(
    () => groups.reduce((sum, g) => sum + g.pages.reduce((s, p) => s + p.ocrAnswers.length, 0), 0),
    [groups],
  );

  function toggle(studentId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  function updateAnswer(page: StackPagePreview, index: number, patch: Partial<OcrAnswer>) {
    const next = page.ocrAnswers.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onOcrAnswersChange(page.pageIndex, next);
  }

  function addAnswer(page: StackPagePreview) {
    onOcrAnswersChange(page.pageIndex, [...page.ocrAnswers, emptyAnswer()]);
  }

  function removeAnswer(page: StackPagePreview, index: number) {
    onOcrAnswersChange(
      page.pageIndex,
      page.ocrAnswers.filter((_, i) => i !== index),
    );
  }

  const emptyGroups = groups.filter((g) => g.pages.length === 0);

  return (
    <View className="gap-4">
      <Card>
        <Text className="text-base font-semibold text-ink">Review before grading</Text>
        <Text className="mt-1 text-sm text-ink-soft">
          {groups.length} student{groups.length === 1 ? "" : "s"} · {totalAnswers} answer
          {totalAnswers === 1 ? "" : "s"} detected. Fix any misreads before you grade.
        </Text>
      </Card>

      {emptyGroups.length > 0 ? (
        <Card className="border-marigold/40 bg-marigold-wash/30">
          <Text className="text-sm text-ink">
            {emptyGroups.length} student{emptyGroups.length === 1 ? "" : "s"} have no pages.
          </Text>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-pen-soft/60 bg-pen-wash">
          <Text className="text-sm text-pen-deep">{errorMessage}</Text>
        </Card>
      ) : null}

      {groups.map((group) => {
        const isOpen = expanded.has(group.studentId);
        const answerCount = group.pages.reduce((s, p) => s + p.ocrAnswers.length, 0);
        return (
          <Card key={group.studentId}>
            <TouchableOpacity
              onPress={() => toggle(group.studentId)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-1">
                <Text className="text-base font-semibold text-ink">{group.studentName}</Text>
                <Text className="text-xs text-ink-soft">
                  {group.pages.length} page{group.pages.length === 1 ? "" : "s"} · {answerCount} answer
                  {answerCount === 1 ? "" : "s"}
                </Text>
              </View>
              <Badge variant="green">{isOpen ? "Hide" : "Edit"}</Badge>
            </TouchableOpacity>

            {isOpen ? (
              <View className="mt-4 gap-4 border-t border-line pt-4">
                {group.pages.map((page) => (
                  <View key={page.pageIndex} className="gap-3 rounded-xl border border-line bg-cream/40 p-3">
                    <View className="flex-row items-start gap-3">
                      {page.storagePath ? (
                        <UploadAssetImage
                          storagePath={page.storagePath}
                          className="h-24 w-20 rounded-md"
                        />
                      ) : null}
                      <View className="flex-1">
                        <Text className="text-xs font-bold uppercase tracking-widest text-ink-faint">
                          Page {page.pageIndex + 1}
                        </Text>
                        {page.studentNameGuess ? (
                          <Text className="mt-1 text-xs text-ink-soft">
                            Name on paper:{" "}
                            <Text className="font-hand text-sm text-ink">
                              {page.studentNameGuess}
                            </Text>
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {page.ocrAnswers.length === 0 ? (
                      <Text className="text-xs italic text-ink-faint">
                        No answers extracted from this page. Add one manually if needed.
                      </Text>
                    ) : (
                      page.ocrAnswers.map((answer, idx) => (
                        <View
                          key={`${page.pageIndex}-${idx}`}
                          className="rounded-lg border border-line bg-paper p-3"
                        >
                          <View className="flex-row items-baseline justify-between">
                            <Text className="text-xs font-bold uppercase tracking-widest text-ink-faint">
                              Answer {idx + 1}
                            </Text>
                            <TouchableOpacity
                              onPress={() => removeAnswer(page, idx)}
                              disabled={isBusy}
                              className="rounded-full px-2 py-1"
                            >
                              <Text className="text-xs font-medium text-ink-soft">Remove</Text>
                            </TouchableOpacity>
                          </View>

                          <Text className="mt-2 text-xs font-bold text-ink">Question</Text>
                          <GraiderTextInput
                            className="mt-1"
                            value={answer.question}
                            onChangeText={(text) => updateAnswer(page, idx, { question: text })}
                            placeholder="Question prompt (optional)"
                            editable={!isBusy}
                          />

                          <Text className="mt-2 text-xs font-bold text-ink">Question #</Text>
                          <GraiderTextInput
                            className="mt-1"
                            value={
                              answer.question_index != null
                                ? String(answer.question_index + 1)
                                : ""
                            }
                            onChangeText={(text) => {
                              const raw = text.trim();
                              const parsed = raw === "" ? null : Number(raw);
                              const next =
                                parsed !== null && Number.isFinite(parsed) && parsed >= 1
                                  ? parsed - 1
                                  : null;
                              updateAnswer(page, idx, { question_index: next });
                            }}
                            placeholder="e.g. 1"
                            keyboardType="number-pad"
                            editable={!isBusy}
                          />

                          <Text className="mt-2 text-xs font-bold text-ink">Student answer</Text>
                          <GraiderTextInput
                            className="mt-1"
                            value={answer.answer}
                            onChangeText={(text) => updateAnswer(page, idx, { answer: text })}
                            placeholder="Fix any OCR misreads…"
                            multiline
                            editable={!isBusy}
                          />
                        </View>
                      ))
                    )}

                    <TouchableOpacity
                      onPress={() => addAnswer(page)}
                      disabled={isBusy}
                      className="items-center rounded-full border border-dashed border-pen/40 bg-pen-wash/20 py-2"
                    >
                      <Text className="text-xs font-semibold text-pen-deep">+ Add answer</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}
          </Card>
        );
      })}

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <TouchableOpacity onPress={onBack} disabled={isBusy} className={btnSecondary}>
          <Text className="text-sm font-medium text-pen-deep">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onConfirm} disabled={isBusy || groups.length === 0} className={btnPrimary}>
          <Text className="text-sm font-semibold text-white">
            {isBusy ? "Grading…" : `Confirm & grade (${groups.length})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
