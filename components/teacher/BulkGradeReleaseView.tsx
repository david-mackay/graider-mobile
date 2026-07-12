import { View, Text, TouchableOpacity } from "react-native";
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, SectionHeader, btnPrimary, btnSecondary } from "@/components/shared/ui";
import { resolveReleaseState, handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { BulkReleaseItem, BulkReleaseSummary, DashboardAttempt } from "@/lib/dashboard-types";
import type { TestSummary } from "@/lib/types";
import { formatStudentDisplayName } from "@/lib/roster-display";

type BulkGradeReleaseViewProps = {
  testId?: string;
  classId?: string;
};

export default function BulkGradeReleaseView({ testId, classId }: BulkGradeReleaseViewProps) {
  const graiderFetch = useGraiderFetch();
  const [summary, setSummary] = useState<BulkReleaseSummary | null>(null);
  const [items, setItems] = useState<BulkReleaseItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReleasing, setIsReleasing] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const hasContext = Boolean(testId);

  const readyItems = useMemo(() => items.filter((i) => i.release_state === "ready"), [items]);

  const load = useCallback(async () => {
    if (!testId) return;
    setIsLoading(true);
    setError("");
    try {
      const [attemptsPayload, testsPayload, membersPayload] = await Promise.all([
        handleJson<{ attempts: DashboardAttempt[] }>(await graiderFetch("/api/submissions", { cache: "no-store" })),
        handleJson<{ tests: TestSummary[] }>(await graiderFetch("/api/tests", { cache: "no-store" })),
        classId
          ? handleJson<{ members: { user_id: string; full_name: string | null; email: string | null }[] }>(
              await graiderFetch(`/api/classes/${classId}/members`, { cache: "no-store" }),
            )
          : Promise.resolve({ members: [] }),
      ]);

      const test = (testsPayload.tests ?? []).find((t) => t.id === testId);
      const attempts = (attemptsPayload.attempts ?? []).filter((a) => a.test_id === testId);
      const memberById = new Map(
        (membersPayload.members ?? []).map((m) => [m.user_id, m] as const),
      );

      const nextItems: BulkReleaseItem[] = attempts.map((a) => {
        const release_state = resolveReleaseState({
          grades_released: test?.grades_released,
          release_status: a.release_status,
        });
        const member = memberById.get(a.student_id);
        return {
          attempt_id: a.id,
          student_id: a.student_id,
          student_name: formatStudentDisplayName({
            fullName: member?.full_name ?? a.student_name,
            email: member?.email,
          }),
          release_state,
          score_label:
            a.total_marks != null && a.max_marks != null ? `${a.total_marks}/${a.max_marks}` : null,
        };
      });

      const graded_count = nextItems.filter((item) => item.release_state !== "grading").length;
      setSummary({
        test_id: testId,
        test_title: test?.title ?? "Selected Test",
        class_name: classId ?? "Current class",
        graded_count,
        total_count: nextItems.length,
      });
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load release data.");
    } finally {
      setIsLoading(false);
    }
  }, [classId, graiderFetch, testId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function releaseReady() {
    if (!testId || readyItems.length === 0) return;
    setIsReleasing(true);
    setMessage("");
    setError("");
    try {
      const payload = await handleJson<{ released_attempt_ids?: string[]; failed_attempt_ids?: string[] }>(
        await graiderFetch("/api/submissions/release-bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId,
            attemptIds: readyItems.map((item) => item.attempt_id),
          }),
        }),
      );

      const releasedSet = new Set(payload.released_attempt_ids ?? readyItems.map((item) => item.attempt_id));
      setItems((prev) =>
        prev.map((item) =>
          releasedSet.has(item.attempt_id) ? { ...item, release_state: "released" } : item,
        ),
      );
      const failCount = payload.failed_attempt_ids?.length ?? 0;
      setMessage(
        failCount > 0
          ? `Released ${releasedSet.size} attempts. ${failCount} failed and need retry.`
          : `Released ${releasedSet.size} ready grades.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to release ready grades.");
    } finally {
      setIsReleasing(false);
    }
  }

  return (
    <View className="flex-1 bg-cream px-4 py-4">
      <SectionHeader
        title="Bulk Grade Release"
        subtitle="Review grading states and release all ready grades."
        action={
          <Link href="/(teacher)" asChild>
            <TouchableOpacity className={btnSecondary}>
              <Text className="text-sm font-medium text-pen-deep">Back</Text>
            </TouchableOpacity>
          </Link>
        }
      />

      {!hasContext ? (
        <Card className="border-marigold/30 bg-marigold-wash">
          <Text className="text-sm font-semibold text-marigold-deep">No test selected</Text>
          <Text className="mt-1 text-xs text-marigold-deep">
            Open this from the Tests screen so we know which test to release.
          </Text>
          <Link href="/(teacher)" asChild>
            <TouchableOpacity className={`${btnPrimary} mt-4 justify-center`}>
              <Text className="text-sm font-semibold text-white">Go to Tests</Text>
            </TouchableOpacity>
          </Link>
        </Card>
      ) : (
        <View className="gap-3">
          {summary ? (
            <Card>
              <Text className="text-sm font-semibold text-ink">Test: {summary.test_title}</Text>
              <Text className="mt-1 text-xs text-ink-soft">Class: {summary.class_name}</Text>
              <Text className="mt-3 text-sm text-ink">
                {summary.graded_count} graded / {summary.total_count} total
              </Text>
            </Card>
          ) : null}

          {error ? (
            <Card className="border-pen-soft/60 bg-pen-wash">
              <Text className="text-sm font-medium text-pen-deep">{error}</Text>
            </Card>
          ) : null}
          {message ? (
            <Card className="border-moss/30 bg-moss-wash">
              <Text className="text-sm font-medium text-moss-deep">{message}</Text>
            </Card>
          ) : null}

          <Card>
            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Student grades</Text>
            {isLoading ? (
              <Text className="mt-3 text-sm text-ink-soft">Loading students…</Text>
            ) : items.length === 0 ? (
              <Text className="mt-3 text-sm text-ink-soft">No submissions found for this test.</Text>
            ) : (
              <View className="mt-3 gap-2">
                {items.map((item) => (
                  <View key={item.attempt_id} className="flex-row items-center justify-between rounded-lg border border-line px-3 py-2">
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-ink">{item.student_name}</Text>
                    </View>
                    <View className="items-end">
                      <Text className="text-xs text-ink-soft">
                        {item.release_state === "ready"
                          ? "Ready"
                          : item.release_state === "grading"
                            ? "Grading"
                            : "Released"}
                      </Text>
                      {item.score_label ? <Text className="text-sm font-semibold text-ink">{item.score_label}</Text> : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <TouchableOpacity
            className={`${btnPrimary} justify-center`}
            onPress={() => void releaseReady()}
            disabled={isReleasing || readyItems.length === 0}
          >
            <Text className="text-sm font-semibold text-white">
              {isReleasing ? "Releasing…" : `Release All Ready Grades (${readyItems.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
