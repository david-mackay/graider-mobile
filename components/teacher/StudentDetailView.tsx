import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Card, SectionHeader, btnSecondary } from "@/components/shared/ui";
import AttemptBreakdownCard from "@/components/teacher/AttemptBreakdownCard";
import { handleJson } from "@/lib/dashboard-client";
import { formatShortDate } from "@/lib/format-date";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { DashboardAttempt, GradedAttemptDetail } from "@/lib/dashboard-types";

type StudentDetailViewProps = {
  studentId?: string;
  classId?: string;
  className?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  initialAttemptId?: string;
};

function attemptSortKey(attempt: DashboardAttempt): number {
  const iso = attempt.graded_at ?? attempt.submitted_at;
  if (!iso) return 0;
  const ts = new Date(iso).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

export default function StudentDetailView({
  studentId,
  classId,
  className,
  studentName,
  studentEmail,
  initialAttemptId,
}: StudentDetailViewProps) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<GradedAttemptDetail | null>(null);

  const hasContext = Boolean(studentId);

  async function loadAttempts() {
    if (!studentId) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await handleJson<{ attempts: DashboardAttempt[] }>(
        await graiderFetch("/api/submissions", { cache: "no-store" }),
      );
      const scoped = (payload.attempts ?? []).filter((attempt) => {
        if (attempt.student_id !== studentId) return false;
        if (classId && attempt.test_class_id && attempt.test_class_id !== classId) return false;
        return true;
      });
      setAttempts(scoped);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student history.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAttempts();
  }, [studentId, classId]);

  useEffect(() => {
    if (!initialAttemptId) return;
    void openAttemptDetail(initialAttemptId);
  }, [initialAttemptId]);

  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => attemptSortKey(b) - attemptSortKey(a)),
    [attempts],
  );

  const selectedAttemptIndex = useMemo(() => {
    if (!selectedAttemptDetail) return -1;
    return sortedAttempts.findIndex((attempt) => attempt.id === selectedAttemptDetail.id);
  }, [selectedAttemptDetail, sortedAttempts]);

  const stats = useMemo(() => {
    let graded = 0;
    let pending = 0;
    let totalScore = 0;
    let maxScore = 0;
    for (const attempt of attempts) {
      if (attempt.status === "graded") {
        graded += 1;
        totalScore += attempt.total_marks ?? 0;
        maxScore += attempt.max_marks ?? 0;
      } else if (attempt.status === "submitted") {
        pending += 1;
      }
    }
    return { graded, pending, totalScore, maxScore, total: attempts.length };
  }, [attempts]);

  async function openAttemptDetail(attemptId: string) {
    try {
      const payload = await handleJson<{ attempt: GradedAttemptDetail }>(
        await graiderFetch(`/api/submissions/${attemptId}`, { cache: "no-store" }),
      );
      setSelectedAttemptDetail(payload.attempt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submission.");
    }
  }

  async function openRelativeAttempt(offset: -1 | 1) {
    if (sortedAttempts.length === 0) return;
    const fallbackIndex = offset > 0 ? 0 : sortedAttempts.length - 1;
    const currentIndex = selectedAttemptIndex >= 0 ? selectedAttemptIndex : fallbackIndex;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= sortedAttempts.length) return;
    await openAttemptDetail(sortedAttempts[nextIndex].id);
  }

  const displayName = studentName ?? "Student";

  return (
    <ScrollView className="flex-1 bg-cream px-4 py-4">
      <SectionHeader
        title={displayName}
        subtitle={className ?? (studentEmail ? studentEmail : "Student history")}
        action={
          <Pressable className={btnSecondary} onPress={() => router.back()}>
            <Text className="text-sm font-medium text-pen-deep">Back</Text>
          </Pressable>
        }
      />

      {!hasContext ? (
        <Card className="border-marigold/30 bg-marigold-wash">
          <Text className="text-sm font-semibold text-marigold-deep">No student selected</Text>
          <Text className="mt-1 text-xs text-marigold-deep">Open this screen from the Students list.</Text>
        </Card>
      ) : (
        <View className="gap-3 pb-8">
          {isLoading ? (
            <Card>
              <Text className="text-sm text-ink-soft">Loading history…</Text>
            </Card>
          ) : null}
          {error ? (
            <Card className="border-pen-soft/60 bg-pen-wash">
              <Text className="text-sm font-medium text-pen-deep">{error}</Text>
            </Card>
          ) : null}

          <Card className="border-line">
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Term summary</Text>
            <View className="mt-2 flex-row flex-wrap gap-3">
              <View>
                <Text className="text-lg font-bold text-ink">{stats.total}</Text>
                <Text className="text-xs text-ink-faint">attempt{stats.total !== 1 ? "s" : ""}</Text>
              </View>
              {stats.graded > 0 ? (
                <View>
                  <Text className="text-lg font-bold text-pen">
                    {stats.totalScore}
                    <Text className="text-sm font-normal text-ink-faint"> / {stats.maxScore}</Text>
                  </Text>
                  <Text className="text-xs text-ink-faint">graded total</Text>
                </View>
              ) : null}
              {stats.pending > 0 ? (
                <View>
                  <Text className="text-lg font-bold text-ink">{stats.pending}</Text>
                  <Text className="text-xs text-ink-faint">pending</Text>
                </View>
              ) : null}
            </View>
            {studentEmail ? <Text className="mt-2 text-xs text-ink-soft">{studentEmail}</Text> : null}
          </Card>

          <Card className="border-line">
            <Text className="text-sm font-semibold text-ink">Tests & submissions ({sortedAttempts.length})</Text>
            <View className="mt-3 gap-2">
              {sortedAttempts.length === 0 ? (
                <Text className="text-xs text-ink-soft">No submissions yet for this student.</Text>
              ) : (
                sortedAttempts.map((attempt) => {
                  const dateLabel = formatShortDate(attempt.graded_at ?? attempt.submitted_at);
                  return (
                    <Pressable
                      key={attempt.id}
                      className="flex-row items-center justify-between rounded-lg border border-line bg-pen-wash/30 px-3 py-2.5"
                      onPress={() => void openAttemptDetail(attempt.id)}
                    >
                      <View className="min-w-0 flex-1 pr-2">
                        <Text className="text-xs font-semibold text-ink" numberOfLines={1}>
                          {attempt.test_title}
                        </Text>
                        <Text className="mt-0.5 text-[11px] text-ink-soft">
                          {attempt.status === "graded"
                            ? `Score ${attempt.total_marks ?? 0}/${attempt.max_marks ?? 0}`
                            : "Not graded yet"}
                          {dateLabel ? ` · ${dateLabel}` : ""}
                        </Text>
                      </View>
                      <Badge
                        variant={
                          attempt.status === "graded" ? "green" : attempt.status === "submitted" ? "blue" : "gray"
                        }
                      >
                        {attempt.status === "submitted" ? "pending" : attempt.status}
                      </Badge>
                    </Pressable>
                  );
                })
              )}
            </View>
          </Card>

          {selectedAttemptDetail ? (
            <AttemptBreakdownCard
              attempt={selectedAttemptDetail}
              studentName={displayName}
              onClose={() => setSelectedAttemptDetail(null)}
              prevLabel="Previous"
              nextLabel="Next"
              onPrevious={() => void openRelativeAttempt(-1)}
              onNext={() => void openRelativeAttempt(1)}
              canGoPrevious={selectedAttemptIndex > 0}
              canGoNext={selectedAttemptIndex >= 0 && selectedAttemptIndex < sortedAttempts.length - 1}
            />
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
