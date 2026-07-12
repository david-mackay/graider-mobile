import { View, Text, TouchableOpacity } from "react-native";

import { useMemo, useState } from "react";
import { Badge, Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import RosterPicker from "@/components/teacher/grade-wizard/RosterPicker";
import {
  SKIP_VALUE,
  type AssignmentMap,
  type AssignmentValue,
} from "@/components/teacher/grade-wizard/use-stack-grade";
import type { RosterEntry, StackPagePreview } from "@/lib/types";

type StepReviewMatchesProps = {
  pages: StackPagePreview[];
  roster: RosterEntry[];
  assignments: AssignmentMap;
  onAssignmentChange: (pageIndex: number, value: AssignmentValue) => void;
  onConfirm: () => void;
  onBack: () => void;
  isBusy: boolean;
  errorMessage: string;
};

const STATUS_ORDER: Record<StackPagePreview["status"], number> = {
  unmatched: 0,
  fuzzy: 1,
  exact: 2,
};

function statusBadge(status: StackPagePreview["status"], confidence: number) {
  if (status === "exact") {
    return <Badge variant="green">Exact match</Badge>;
  }
  if (status === "fuzzy") {
    const pct = Math.round(confidence * 100);
    return <Badge variant="yellow">Likely{pct ? ` · ${pct}%` : ""}</Badge>;
  }
  return <Badge variant="gray">Unmatched</Badge>;
}

export default function StepReviewMatches({
  pages,
  roster,
  assignments,
  onAssignmentChange,
  onConfirm,
  onBack,
  isBusy,
  errorMessage,
}: StepReviewMatchesProps) {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<number>>(new Set());

  const sortedPages = useMemo(() => {
    return [...pages].sort((a, b) => {
      const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (orderDiff !== 0) return orderDiff;
      return a.pageIndex - b.pageIndex;
    });
  }, [pages]);

  const counts = useMemo(() => {
    let toGrade = 0;
    let skipped = 0;
    let needsAssignment = 0;
    for (const page of pages) {
      const value = assignments[page.pageIndex];
      if (value === SKIP_VALUE) skipped += 1;
      else if (value && value.length > 0) toGrade += 1;
      else needsAssignment += 1;
    }
    return { toGrade, skipped, needsAssignment };
  }, [pages, assignments]);

  const duplicateAssignments = useMemo(() => {
    const countsByStudent = new Map<string, number>();
    for (const page of pages) {
      const value = assignments[page.pageIndex];
      if (!value || value === SKIP_VALUE) continue;
      countsByStudent.set(value, (countsByStudent.get(value) ?? 0) + 1);
    }
    return Array.from(countsByStudent.entries()).filter(([, count]) => count > 1);
  }, [assignments, pages]);

  function toggleAnswers(pageIndex: number) {
    setExpandedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex);
      else next.add(pageIndex);
      return next;
    });
  }

  const confirmDisabled = isBusy || counts.toGrade === 0 || counts.needsAssignment > 0;

  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View>
            <Text className="text-base font-semibold text-ink">Review matches</Text>
            <Text className="mt-1 text-sm text-ink-soft">
              Confirm which student each page belongs to. Pages we couldn&apos;t auto-match are at the top.
            </Text>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-xs text-ink-soft">
              <Text className="font-semibold text-pen-deep">{counts.toGrade}</Text> to grade
            </Text>
            <Text className="text-xs text-ink-faint">·</Text>
            <Text className="text-xs text-ink-soft">
              <Text className="font-semibold text-ink-soft">{counts.skipped}</Text> skipped
            </Text>
            {counts.needsAssignment > 0 ? (
              <Text className="text-xs text-ink-soft">
                {" · "}
                <Text className="font-semibold text-marigold-deep">{counts.needsAssignment}</Text> need a student
              </Text>
            ) : null}
          </View>
        </View>
        <Text className="mt-3 text-xs text-ink-faint">
          Re-grading existing attempts will overwrite previous answers.
        </Text>
      </Card>

      {errorMessage ? (
        <Card className="border-pen-soft/60 bg-pen-wash">
          <Text className="text-sm font-medium text-pen-deep">{errorMessage}</Text>
        </Card>
      ) : null}

      {duplicateAssignments.length > 0 ? (
        <Card className="border-marigold/30 bg-marigold-wash">
          <Text className="text-sm font-semibold text-marigold-deep">Duplicate student assignments detected</Text>
          <Text className="mt-1 text-xs text-marigold-deep">
            Each student should only appear once per batch. Reassign duplicate pages before grading.
          </Text>
        </Card>
      ) : null}

      <View className="gap-3">
        {sortedPages.map((page) => {
          const isUnmatched = page.status === "unmatched";
          const value: AssignmentValue = (assignments[page.pageIndex] ?? "") as AssignmentValue;
          const isAnswersOpen = expandedAnswers.has(page.pageIndex);

          return (
            <View key={page.pageIndex}>
              <View
                className={`rounded-xl border p-4 transition-colors duration-150 ${
                  isUnmatched
                    ? "border-pen-soft/60 bg-pen-wash"
                    : "border-line bg-cream"
                }`}
              >
                <View className="gap-4">
                  <View className="flex-row items-start gap-3">
                    <View className="min-w-0 flex-1">
                      <Text className="text-sm font-semibold text-ink">
                        Page {page.pageIndex + 1}
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-soft truncate">
                        OCR read:{" "}
                        <Text className="font-medium text-ink">
                          {page.studentNameGuess
                            ? `“${page.studentNameGuess}”`
                            : "no name detected"}
                        </Text>
                      </Text>
                      <View className="mt-2">{statusBadge(page.status, page.confidence)}</View>
                    </View>
                  </View>

                  <View className="flex-1">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Assign to student
                    </Text>
                    <View className="mt-1.5">
                      <RosterPicker
                        roster={roster}
                        value={value}
                        onChange={(v) => onAssignmentChange(page.pageIndex, v)}
                        disabled={isBusy}
                      />
                    </View>

                    {page.ocrAnswers.length > 0 ? (
                      <View className="mt-3">
                        <TouchableOpacity
                          onPress={() => toggleAnswers(page.pageIndex)}
                          className="rounded px-1 py-1"
                        >
                          <Text className="text-xs font-medium text-pen">
                            {isAnswersOpen ? "Hide" : "Show"} extracted answers ({page.ocrAnswers.length})
                          </Text>
                        </TouchableOpacity>
                        {isAnswersOpen ? (
                          <View className="mt-2 gap-1.5 rounded-lg border border-line bg-cream/40 p-3">
                            {page.ocrAnswers.map((answer, idx) => (
                              <View key={idx} className="text-ink">
                                <Text className="text-xs font-semibold text-pen-deep">
                                  Q{answer.question_index != null ? answer.question_index + 1 : idx + 1}:
                                  {" "}
                                  <Text className="font-medium text-ink">
                                  {answer.question}
                                  </Text>
                                </Text>
                                <Text className="mt-0.5 text-xs text-ink-soft">
                                  {answer.answer || "no answer"}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text className="mt-3 text-xs italic text-ink-faint">
                        No answers were extracted from this page.
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <TouchableOpacity onPress={onBack} disabled={isBusy} className={btnSecondary}>
          <Text className="text-sm font-medium text-pen-deep">Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onConfirm}
          disabled={confirmDisabled}
          className={btnPrimary}
        >
          <Text className="text-sm font-semibold text-white">
            {isBusy ? "Grading…" : `Grade all (${counts.toGrade})`}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
