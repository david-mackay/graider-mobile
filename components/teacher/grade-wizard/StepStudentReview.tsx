import { View, Text, TouchableOpacity } from "react-native";
import { useMemo, useState } from "react";
import { Badge, Card, btnPrimary, btnSecondary } from "@/components/shared/ui";
import UploadAssetImage from "@/components/shared/UploadAssetImage";
import type { RosterEntry, StackPagePreview } from "@/lib/types";
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

export default function StepStudentReview({
  pages,
  pageToStudentId,
  roster,
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

  const emptyGroups = groups.filter((g) => g.pages.length === 0);

  return (
    <View className="gap-4">
      <Card>
        <Text className="text-base font-semibold text-ink">Review before grading</Text>
        <Text className="mt-1 text-sm text-ink-soft">
          {groups.length} student{groups.length === 1 ? "" : "s"} · {totalAnswers} answer
          {totalAnswers === 1 ? "" : "s"} detected
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
              <Badge variant="green">Assigned</Badge>
            </TouchableOpacity>

            {isOpen ? (
              <View className="mt-4 gap-3 border-t border-line pt-4">
                <View className="flex-row flex-wrap gap-2">
                  {group.pages.map((page) =>
                    page.storagePath ? (
                      <UploadAssetImage
                        key={page.pageIndex}
                        storagePath={page.storagePath}
                        className="h-20 w-16 rounded-md"
                      />
                    ) : null,
                  )}
                </View>
                {group.pages.flatMap((page) =>
                  page.ocrAnswers.map((answer, idx) => (
                    <View key={`${page.pageIndex}-${idx}`} className="rounded-lg bg-cream px-3 py-2">
                      <Text className="text-xs font-semibold text-ink-faint">Q</Text>
                      <Text className="text-sm text-ink">{answer.question}</Text>
                      <Text className="mt-1 text-xs font-semibold text-ink-faint">Answer</Text>
                      <Text className="text-sm text-ink-soft">{answer.answer || "—"}</Text>
                    </View>
                  )),
                )}
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
