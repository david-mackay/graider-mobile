import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Badge,
  Card,
  FormField,
  GraiderTextInput,
  SectionHeader,
  btnSecondary,
  btnSecondaryBlock,
} from "@/components/shared/ui";
import FormSheet from "@/components/shared/FormSheet";
import PdfImportPanel from "@/components/shared/PdfImportPanel";
import { IconClipboard } from "@/components/shared/icons";
import { handleJson, normalizeTopic } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { DashboardAttempt, DashboardQuestion, DashboardTest, GroupedQuestions } from "@/lib/dashboard-types";

type TestsViewProps = {
  classId: string | null;
  className: string | null;
  classCanManage: boolean;
  questions: DashboardQuestion[];
  testsInScope: DashboardTest[];
  attemptsInScope: DashboardAttempt[];
  onChanged: () => void | Promise<void>;
  onStatus: (message: string, type?: "info" | "error") => void;
  onGoToClasses: () => void;
  onGoToQuestions: () => void;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

export default function TestsView({
  classId,
  className,
  classCanManage,
  questions,
  testsInScope,
  attemptsInScope,
  onChanged,
  onStatus,
  onGoToClasses,
  onGoToQuestions,
  isBusy,
  setBusy,
}: TestsViewProps) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);

  const attemptsByTest = useMemo(() => {
    const map = new Map<string, { graded: number; pending: number; total: number }>();
    for (const attempt of attemptsInScope) {
      const existing = map.get(attempt.test_id) ?? { graded: 0, pending: 0, total: 0 };
      existing.total += 1;
      if (attempt.status === "graded") existing.graded += 1;
      if (attempt.status === "submitted") existing.pending += 1;
      map.set(attempt.test_id, existing);
    }
    return map;
  }, [attemptsInScope]);

  const pendingTotal = attemptsInScope.filter((a) => a.status === "submitted").length;
  const gradedTotal = attemptsInScope.filter((a) => a.status === "graded").length;

  const grouped: GroupedQuestions[] = (() => {
    const map = new Map<string, DashboardQuestion[]>();
    for (const q of questions) {
      const t = normalizeTopic(q.topic);
      map.set(t, [...(map.get(t) ?? []), q]);
    }
    return Array.from(map.entries())
      .map(([t, items]) => ({ topic: t, items }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  })();

  function toggleQuestion(qid: string) {
    setSelectedQuestionIds((current) =>
      current.includes(qid) ? current.filter((id) => id !== qid) : [...current, qid],
    );
  }

  async function createTest() {
    if (!classId || !testTitle.trim() || selectedQuestionIds.length === 0) {
      onStatus("Select a class and at least one question.", "error");
      return;
    }
    setBusy(true);
    try {
      await handleJson(
        await graiderFetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, title: testTitle, questionIds: selectedQuestionIds }),
        }),
      );
      setTestTitle("");
      setSelectedQuestionIds([]);
      setCreateModalOpen(false);
      onStatus("Test created.");
      await onChanged();
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-6">
      <SectionHeader
        title="Tests"
        subtitle={
          className
            ? `${className} — tap a test to see class results`
            : "Pick a class from the header to manage tests."
        }
        action={
          classId && classCanManage ? (
            <Pressable className={btnSecondary} onPress={() => setCreateModalOpen(true)}>
              <Text className="text-sm font-semibold text-pen-deep">+ Test</Text>
            </Pressable>
          ) : null
        }
      />

      {classId && pendingTotal > 0 ? (
        <Card className="border-pen-soft/40 bg-pen-wash/50">
          <Text className="text-sm font-semibold text-ink">
            {pendingTotal} paper{pendingTotal !== 1 ? "s" : ""} waiting to grade
          </Text>
          <Text className="mt-1 text-xs text-ink-soft">
            Use the Grade stack button below to scan and grade handwritten papers.
          </Text>
          <Pressable className={`${btnSecondaryBlock} mt-3 px-5`} onPress={() => router.push("/(teacher)/grade")}>
            <Text className="text-sm font-medium text-pen-deep">Grade stack</Text>
          </Pressable>
        </Card>
      ) : classId && gradedTotal > 0 ? (
        <Card className="border-line bg-cream/40">
          <Text className="text-sm font-semibold text-ink">
            {gradedTotal} graded submission{gradedTotal !== 1 ? "s" : ""}
          </Text>
          <Text className="mt-1 text-xs text-ink-soft">
            Open a test below to review scores and share PDFs. Student history lives under the Students tab.
          </Text>
        </Card>
      ) : null}

      {classCanManage && classId && questions.length === 0 ? (
        <Card className="border-line bg-cream/30">
          <Text className="text-sm text-ink-soft">Add questions before creating a test.</Text>
          <Pressable className={`${btnSecondaryBlock} mt-3 px-5`} onPress={onGoToQuestions}>
            <Text className="text-sm font-medium text-pen-deep">Go to Question Bank</Text>
          </Pressable>
        </Card>
      ) : null}

      {!classCanManage ? (
        <Card className="py-8 text-center">
          <View className="mx-auto mb-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
            <IconClipboard className="h-5 w-5 text-ink-faint" />
          </View>
          <Text className="text-sm font-semibold text-ink">{!classId ? "No class selected" : "Access restricted"}</Text>
          <Text className="mt-1 text-xs text-ink-faint">
            {!classId ? "Open a class to manage its tests." : "You need to be a teacher of this class to manage tests."}
          </Text>
          {!classId ? (
            <Pressable className={`${btnSecondaryBlock} mt-4 px-5`} onPress={onGoToClasses}>
              <Text className="text-sm font-medium text-pen-deep">Go to Classes</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      <FormSheet
        visible={createModalOpen}
        title="Create test"
        subtitle="Pick questions manually or import a test PDF."
        onClose={() => {
          setCreateModalOpen(false);
          setTestTitle("");
          setSelectedQuestionIds([]);
        }}
        primaryLabel="Create test"
        onPrimary={() => void createTest()}
        primaryDisabled={isBusy || selectedQuestionIds.length === 0 || !testTitle.trim()}
        primaryLoading={isBusy}
      >
        <View className="gap-4">
          {classId ? (
            <PdfImportPanel
              classId={classId}
              kind="test"
              onComplete={async () => {
                setCreateModalOpen(false);
                await onChanged();
              }}
              onStatus={onStatus}
              disabled={isBusy}
            />
          ) : null}
          <FormField label="Test title">
            <GraiderTextInput value={testTitle} onChangeText={setTestTitle} placeholder="e.g. Chapter 3 Test" />
          </FormField>
          <View>
            <Text className="mb-2 text-sm font-medium text-ink">Select questions</Text>
            <View className="gap-3">
              {grouped.map((group) => (
                <View key={group.topic}>
                  <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group.topic}</Text>
                  <View className="gap-1.5">
                    {group.items.map((q) => {
                      const selected = selectedQuestionIds.includes(q.id);
                      return (
                        <Pressable
                          key={q.id}
                          onPress={() => toggleQuestion(q.id)}
                          className={`flex-row items-start gap-3 rounded-xl border p-3 ${
                            selected ? "border-pen bg-pen-wash/40" : "border-line bg-cream/40"
                          }`}
                        >
                          <View
                            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
                              selected ? "border-pen bg-pen" : "border-line bg-paper"
                            }`}
                          >
                            {selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-sm text-ink">{q.prompt}</Text>
                            <Text className="mt-0.5 text-xs text-ink-faint">{q.marks} marks</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </View>
          {selectedQuestionIds.length > 0 ? (
            <Text className="text-xs text-ink-soft">
              {selectedQuestionIds.length} question{selectedQuestionIds.length !== 1 ? "s" : ""} ·{" "}
              {questions.filter((q) => selectedQuestionIds.includes(q.id)).reduce((sum, q) => sum + q.marks, 0)} marks
            </Text>
          ) : null}
        </View>
      </FormSheet>

      {classCanManage && classId && testsInScope.length === 0 ? (
        <Card className="items-center py-10">
          <Text className="text-sm font-semibold text-ink">No tests yet</Text>
          <Text className="mt-1 text-center text-xs text-ink-faint">
            Create a test or grade a stack — Smart grade can create one from your papers.
          </Text>
        </Card>
      ) : null}

      {testsInScope.length > 0 ? (
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Tests in this class · {testsInScope.length}
          </Text>
          <View className="gap-3">
            {testsInScope.map((test) => {
              const stats = attemptsByTest.get(test.id) ?? { graded: 0, pending: 0, total: 0 };
              const progress = stats.total > 0 ? stats.graded / stats.total : 0;
              return (
                <Card key={test.id}>
                  <Pressable
                    className="gap-2"
                    onPress={() =>
                      router.push({
                        pathname: "/(teacher)/tests/[testId]",
                        params: {
                          testId: test.id,
                          classId: test.class_id,
                          className: className ?? "",
                        },
                      })
                    }
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-semibold text-ink">{test.title}</Text>
                        <Text className="mt-1 text-xs text-ink-soft">
                          {stats.graded > 0 ? `${stats.graded} graded` : "No grades yet"}
                          {stats.pending > 0 ? ` · ${stats.pending} pending` : ""}
                          {stats.total === 0 ? " · No submissions" : ""}
                        </Text>
                      </View>
                      {stats.pending > 0 ? (
                        <Badge variant="blue">{stats.pending} pending</Badge>
                      ) : stats.graded > 0 ? (
                        <Badge variant="green">Graded</Badge>
                      ) : (
                        <Badge variant="gray">Open</Badge>
                      )}
                    </View>
                    {stats.total > 0 ? (
                      <View className="h-1.5 overflow-hidden rounded-full bg-cream-deep">
                        <View
                          className="h-full rounded-full bg-pen"
                          style={{ width: `${Math.round(progress * 100)}%` }}
                        />
                      </View>
                    ) : null}
                  </Pressable>
                </Card>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}
