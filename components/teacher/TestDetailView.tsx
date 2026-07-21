import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Badge, Card, SectionHeader, btnPrimary, btnSecondary } from "@/components/shared/ui";
import AttemptBreakdownCard from "@/components/teacher/AttemptBreakdownCard";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { ClassMember, DashboardAttempt, GradedAttemptDetail } from "@/lib/dashboard-types";
import type { TestDetail } from "@/lib/types";
import { formatStudentDisplayName } from "@/lib/roster-display";

function statusBadgeVariant(status?: string | null): "green" | "yellow" | "gray" | "blue" {
  switch (status) {
    case "open": return "green";
    case "scheduled": return "yellow";
    case "closed": return "gray";
    default: return "gray";
  }
}

function formatScheduleDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type TestDetailViewProps = {
  testId?: string;
  classId?: string;
  className?: string | null;
  initialAttemptId?: string;
};

export default function TestDetailView({
  testId,
  classId,
  className,
  initialAttemptId,
}: TestDetailViewProps) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [test, setTest] = useState<TestDetail | null>(null);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [studentNameById, setStudentNameById] = useState<Map<string, string>>(new Map());
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<GradedAttemptDetail | null>(null);

  const [isAdminBusy, setIsAdminBusy] = useState(false);

  const hasContext = Boolean(testId);

  async function administerTest(action: "open_now") {
    if (!testId) return;
    setIsAdminBusy(true);
    try {
      await handleJson(
        await graiderFetch(`/api/tests/${testId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }),
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update test.");
    } finally {
      setIsAdminBusy(false);
    }
  }

  async function loadData() {
    if (!testId) return;
    setIsLoading(true);
    setError("");
    try {
      const [testRes, attemptsRes, rosterRes] = await Promise.all([
        graiderFetch(`/api/tests/${testId}`, { cache: "no-store" }),
        graiderFetch("/api/submissions", { cache: "no-store" }),
        classId ? graiderFetch(`/api/classes/${classId}/roster`, { cache: "no-store" }) : Promise.resolve(null),
      ]);

      const testPayload = await handleJson<{ test: TestDetail }>(testRes);
      const attemptsPayload = await handleJson<{ attempts: DashboardAttempt[] }>(attemptsRes);

      setTest(testPayload.test);
      setAttempts((attemptsPayload.attempts ?? []).filter((attempt) => attempt.test_id === testId));

      if (rosterRes) {
        const rosterPayload = await handleJson<{ roster: ClassMember[] }>(rosterRes);
        const names = new Map<string, string>();
        for (const member of rosterPayload.roster ?? []) {
          names.set(
            member.user_id,
            formatStudentDisplayName({
              fullName: member.full_name,
              email: member.email,
            }),
          );
        }
        setStudentNameById(names);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load test details.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [testId, classId]);

  useEffect(() => {
    if (!initialAttemptId) return;
    void openAttemptDetail(initialAttemptId);
  }, [initialAttemptId]);

  const sortedAttempts = useMemo(
    () => [...attempts].sort((a, b) => a.student_id.localeCompare(b.student_id)),
    [attempts],
  );
  const selectedAttemptIndex = useMemo(() => {
    if (!selectedAttemptDetail) return -1;
    return sortedAttempts.findIndex((attempt) => attempt.id === selectedAttemptDetail.id);
  }, [selectedAttemptDetail, sortedAttempts]);

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

  async function openRelativeSubmission(offset: -1 | 1) {
    if (sortedAttempts.length === 0) return;
    const fallbackIndex = offset > 0 ? 0 : sortedAttempts.length - 1;
    const currentIndex = selectedAttemptIndex >= 0 ? selectedAttemptIndex : fallbackIndex;
    const nextIndex = currentIndex + offset;
    if (nextIndex < 0 || nextIndex >= sortedAttempts.length) return;
    await openAttemptDetail(sortedAttempts[nextIndex].id);
  }

  const gradedCount = attempts.filter((a) => a.status === "graded").length;
  const pendingCount = attempts.filter((a) => a.status === "submitted").length;

  return (
    <ScrollView className="flex-1 bg-cream px-4 py-4">
      <SectionHeader
        title={test?.title ?? "Test details"}
        subtitle={className ?? "Class results for this test"}
        action={
          <Pressable className={btnSecondary} onPress={() => router.back()}>
            <Text className="text-sm font-medium text-pen-deep">Back</Text>
          </Pressable>
        }
      />

      {!hasContext ? (
        <Card className="border-marigold/30 bg-marigold-wash">
          <Text className="text-sm font-semibold text-marigold-deep">No test selected</Text>
          <Text className="mt-1 text-xs text-marigold-deep">Open this screen from the Tests list.</Text>
        </Card>
      ) : (
        <View className="gap-3 pb-8">
          {isLoading ? (
            <Card>
              <Text className="text-sm text-ink-soft">Loading test details…</Text>
            </Card>
          ) : null}
          {error ? (
            <Card className="border-pen-soft/60 bg-pen-wash">
              <Text className="text-sm font-medium text-pen-deep">{error}</Text>
            </Card>
          ) : null}

          {test ? (
            <Card className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Administer</Text>
                <Badge variant={statusBadgeVariant(test.status)}>{test.status ?? "draft"}</Badge>
              </View>
              {(test.opens_at ?? test.closes_at ?? test.duration_minutes) ? (
                <View className="flex-row flex-wrap gap-x-4 gap-y-0.5">
                  {test.opens_at ? (
                    <Text className="text-xs text-ink-faint">Opens {formatScheduleDate(test.opens_at)}</Text>
                  ) : null}
                  {test.closes_at ? (
                    <Text className="text-xs text-ink-faint">Closes {formatScheduleDate(test.closes_at)}</Text>
                  ) : null}
                  {test.duration_minutes ? (
                    <Text className="text-xs text-ink-faint">{test.duration_minutes} min</Text>
                  ) : null}
                </View>
              ) : null}
              {test.status !== "open" ? (
                <View className="flex-row gap-2">
                  <Pressable
                    disabled={isAdminBusy}
                    onPress={() => void administerTest("open_now")}
                    className={`${btnPrimary} flex-1 items-center`}
                  >
                    <Text className="text-sm font-medium text-white">Open now</Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ) : null}

          {attempts.length > 0 ? (
            <Card className="border-line bg-cream/40">
              <Text className="text-sm font-semibold text-ink">
                {gradedCount} graded
                {pendingCount > 0 ? ` · ${pendingCount} pending` : ""}
              </Text>
              {pendingCount > 0 ? (
                <Pressable className={`${btnSecondary} mt-3 items-center`} onPress={() => router.push("/(teacher)/grade")}>
                  <Text className="text-sm font-medium text-pen-deep">Grade pending papers</Text>
                </Pressable>
              ) : null}
            </Card>
          ) : null}

          {test ? (
            <Card className="border-line">
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Test structure</Text>
              <View className="mt-2 gap-2">
                {test.questions.map((q, i) => (
                  <View key={q.question_id} className="rounded-lg border border-line bg-pen-wash/30 p-3">
                    <Text className="text-xs font-semibold text-ink-faint">
                      Q{i + 1} · {q.marks} mark{q.marks !== 1 ? "s" : ""}
                    </Text>
                    <Text className="mt-0.5 text-sm text-ink">{q.prompt}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}

          <Card className="border-line">
            <Text className="text-sm font-semibold text-ink">Class submissions ({sortedAttempts.length})</Text>
            <View className="mt-3 gap-2">
              {sortedAttempts.map((attempt) => {
                const name = formatStudentDisplayName({
                  fullName: studentNameById.get(attempt.student_id) ?? attempt.student_name,
                });
                return (
                <Pressable
                  key={attempt.id}
                  className="flex-row items-center justify-between rounded-lg border border-line bg-pen-wash/30 px-3 py-2.5"
                  onPress={() => void openAttemptDetail(attempt.id)}
                >
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="text-xs font-semibold text-ink" numberOfLines={1}>
                      {name}
                    </Text>
                    <Text className="mt-0.5 text-[11px] text-ink-soft">
                      {attempt.status === "graded"
                        ? `Score ${attempt.total_marks ?? 0}/${attempt.max_marks ?? 0}`
                        : "Not graded yet"}
                    </Text>
                  </View>
                  <Badge variant={attempt.status === "graded" ? "green" : attempt.status === "submitted" ? "blue" : "gray"}>
                    {attempt.status === "submitted" ? "pending" : attempt.status}
                  </Badge>
                </Pressable>
              );
              })}
              {sortedAttempts.length === 0 ? <Text className="text-xs text-ink-soft">No submissions yet.</Text> : null}
            </View>
          </Card>

          {selectedAttemptDetail ? (
            <AttemptBreakdownCard
              attempt={selectedAttemptDetail}
              studentName={formatStudentDisplayName({
                fullName:
                  studentNameById.get(selectedAttemptDetail.student_id) ??
                  selectedAttemptDetail.student_name,
              })}
              onClose={() => setSelectedAttemptDetail(null)}
              prevLabel="Previous student"
              nextLabel="Next student"
              onPrevious={() => void openRelativeSubmission(-1)}
              onNext={() => void openRelativeSubmission(1)}
              canGoPrevious={selectedAttemptIndex > 0}
              canGoNext={selectedAttemptIndex >= 0 && selectedAttemptIndex < sortedAttempts.length - 1}
            />
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}
