import { View, Text, TouchableOpacity } from "react-native";

import { Link } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Badge, Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import ExportGradePdfButton from "@/components/shared/ExportGradePdfButton";
import GradeOverrideSheet from "@/components/teacher/grade-wizard/GradeOverrideSheet";
import { formatRelativeDate } from "@/lib/format-date";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { handleJson } from "@/lib/dashboard-client";
import { formatStudentDisplayName } from "@/lib/roster-display";
import type { GradedAttemptDetail, RosterEntry } from "@/lib/dashboard-types";
import type { StackCommitResult } from "@/lib/types";

type StepResultsProps = {
  results: StackCommitResult;
  roster: RosterEntry[];
  testTitle: string;
  onRestart: () => void;
  fetchAttempt: (attemptId: string) => Promise<GradedAttemptDetail>;
};

type OverrideTarget = {
  attemptId: string;
  questionId: string;
  questionLabel: string;
  maxMarks: number;
  marksEarned: number;
  feedback: string;
};

function ratioColor(ratio: number): string {
  if (ratio >= 0.8) return "text-moss";
  if (ratio >= 0.5) return "text-pen-deep";
  return "text-pen";
}

export default function StepResults({
  results,
  roster,
  testTitle,
  onRestart,
  fetchAttempt,
}: StepResultsProps) {
  const graiderFetch = useGraiderFetch();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [attemptDetails, setAttemptDetails] = useState<Map<string, GradedAttemptDetail>>(new Map());
  const [loadingAttempt, setLoadingAttempt] = useState<string | null>(null);
  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget | null>(null);
  const [localResults, setLocalResults] = useState(results);

  const rosterById = useMemo(() => {
    const map = new Map<string, RosterEntry>();
    for (const entry of roster) map.set(entry.user_id, entry);
    return map;
  }, [roster]);

  // Commit used to emit one row per page; keep the latest row per student.
  const uniqueResults = useMemo(() => {
    const byStudent = new Map<string, (typeof localResults.results)[number]>();
    for (const row of localResults.results) {
      byStudent.set(row.studentId, row);
    }
    return Array.from(byStudent.values());
  }, [localResults.results]);

  const loadAttemptDetail = useCallback(
    async (attemptId: string) => {
      if (attemptDetails.has(attemptId)) return attemptDetails.get(attemptId)!;
      setLoadingAttempt(attemptId);
      try {
        const detail = await fetchAttempt(attemptId);
        setAttemptDetails((prev) => new Map(prev).set(attemptId, detail));
        return detail;
      } finally {
        setLoadingAttempt(null);
      }
    },
    [attemptDetails, fetchAttempt],
  );

  async function toggle(studentId: string, attemptId: string) {
    const isOpen = expanded.has(studentId);
    if (!isOpen) {
      await loadAttemptDetail(attemptId);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }

  async function saveOverride(marksEarned: number, feedback: string) {
    if (!overrideTarget) return;
    const payload = await handleJson<{
      answer: { marks_earned: number; feedback: string; updated_at: string | null };
      attempt: { total_marks: number; max_marks: number };
    }>(
      await graiderFetch(
        `/api/submissions/${overrideTarget.attemptId}/answers/${overrideTarget.questionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marksEarned, feedback }),
        },
      ),
    );

    setAttemptDetails((prev) => {
      const existing = prev.get(overrideTarget.attemptId);
      if (!existing) return prev;
      const next = new Map(prev);
      next.set(overrideTarget.attemptId, {
        ...existing,
        total_marks: payload.attempt.total_marks,
        max_marks: payload.attempt.max_marks,
        questions: existing.questions.map((q) =>
          q.question_id === overrideTarget.questionId
            ? {
                ...q,
                marks_earned: payload.answer.marks_earned,
                feedback: payload.answer.feedback,
                graded_by: "teacher",
                updated_at: payload.answer.updated_at,
              }
            : q,
        ),
      });
      return next;
    });

    setLocalResults((prev) => ({
      results: prev.results.map((row) =>
        row.attemptId === overrideTarget.attemptId
          ? {
              ...row,
              totalMarks: payload.attempt.total_marks,
              maxMarks: payload.attempt.max_marks,
              grades: row.grades.map((g) =>
                g.questionId === overrideTarget.questionId
                  ? { ...g, marksEarned: payload.answer.marks_earned, feedback: payload.answer.feedback }
                  : g,
              ),
            }
          : row,
      ),
    }));
  }

  if (uniqueResults.length === 0) {
    return (
      <Card>
        <View className="items-center gap-3 py-10">
          <Text className="text-base font-semibold text-ink">Nothing graded</Text>
          <TouchableOpacity onPress={onRestart} className={btnPrimary}>
            <Text className="text-sm font-semibold text-white">Grade another session</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View>
            <Text className="text-base font-semibold text-ink">
              Graded {uniqueResults.length} student
              {uniqueResults.length === 1 ? "" : "s"}
            </Text>
            <Text className="mt-1 text-sm text-ink-soft">{testTitle}</Text>
          </View>
          <Badge variant="green">Done</Badge>
        </View>
      </Card>

      <Card>
        <View className="gap-3">
          {uniqueResults.map((row) => {
            const entry = rosterById.get(row.studentId);
            const name = formatStudentDisplayName({
              fullName: entry?.full_name,
              email: entry?.email,
            });
            const ratio = row.maxMarks > 0 ? row.totalMarks / row.maxMarks : 0;
            const isOpen = expanded.has(row.studentId);
            const detail = attemptDetails.get(row.attemptId);

            return (
              <View key={row.studentId} className="rounded-lg border border-line bg-paper p-3">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-semibold text-ink">{name}</Text>
                    <Text className={`mt-1 text-xl font-bold ${ratioColor(ratio)}`}>
                      {row.totalMarks}
                      <Text className="text-sm text-ink-faint"> / {row.maxMarks}</Text>
                    </Text>
                    {detail?.graded_at ? (
                      <Text className="mt-1 text-xs text-ink-faint">
                        Graded {formatRelativeDate(detail.graded_at)}
                      </Text>
                    ) : null}
                  </View>
                  <View className="items-end gap-2">
                    <ExportGradePdfButton
                      attemptId={row.attemptId}
                      studentName={name}
                      fetchAttempt={fetchAttempt}
                      label="Share PDF"
                      compact
                    />
                    <TouchableOpacity onPress={() => void toggle(row.studentId, row.attemptId)}>
                      <Text className="text-xs font-medium text-pen">
                        {loadingAttempt === row.attemptId
                          ? "Loading…"
                          : isOpen
                            ? "Hide"
                            : "Show"}{" "}
                        per-question
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {isOpen && detail ? (
                  <View className="mt-3 gap-2">
                    {detail.questions.map((question, idx) => (
                      <TouchableOpacity
                        key={question.question_id}
                        onPress={() =>
                          setOverrideTarget({
                            attemptId: row.attemptId,
                            questionId: question.question_id,
                            questionLabel: question.prompt,
                            maxMarks: question.marks,
                            marksEarned: question.marks_earned ?? 0,
                            feedback: question.feedback ?? "",
                          })
                        }
                        className="rounded-lg border border-line bg-pen-wash/30 px-3 py-2"
                      >
                        <View className="flex-row items-center justify-between">
                          <View className="flex-row items-center gap-2">
                            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                              Q{idx + 1}
                            </Text>
                            {question.graded_by === "teacher" ? (
                              <Badge variant="yellow">Edited</Badge>
                            ) : (
                              <Badge variant="gray">AI</Badge>
                            )}
                          </View>
                          <Text className="text-sm font-bold text-pen-deep">
                            {question.marks_earned ?? "—"}/{question.marks}
                          </Text>
                        </View>
                        <Text className="mt-1 text-sm text-ink">{question.prompt}</Text>
                        <Text className="mt-1.5 text-sm text-ink-soft">
                          Answer: {question.student_answer || "—"}
                        </Text>
                        {question.feedback ? (
                          <Text className="mt-1.5 text-xs text-moss-deep">{question.feedback}</Text>
                        ) : null}
                        {question.updated_at ? (
                          <Text className="mt-1 text-[10px] text-ink-faint">
                            Updated {formatRelativeDate(question.updated_at)} · tap to edit
                          </Text>
                        ) : (
                          <Text className="mt-1 text-[10px] text-ink-faint">Tap to override</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <Link href="/(teacher)" asChild>
          <TouchableOpacity className={btnSecondary}>
            <Text className="text-sm font-medium text-pen-deep">Back to dashboard</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={onRestart} className={btnPrimary}>
          <Text className="text-sm font-semibold text-white">Grade another session</Text>
        </TouchableOpacity>
      </View>

      <GradeOverrideSheet
        visible={overrideTarget !== null}
        questionLabel={overrideTarget?.questionLabel ?? ""}
        maxMarks={overrideTarget?.maxMarks ?? 0}
        initialMarks={overrideTarget?.marksEarned ?? 0}
        initialFeedback={overrideTarget?.feedback ?? ""}
        onClose={() => setOverrideTarget(null)}
        onSave={saveOverride}
      />
    </View>
  );
}
