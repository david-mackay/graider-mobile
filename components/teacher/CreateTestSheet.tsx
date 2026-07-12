import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable } from "react-native";
import FormSheet from "@/components/shared/FormSheet";
import PdfImportPanel from "@/components/shared/PdfImportPanel";
import { FormField, GraiderTextInput } from "@/components/shared/ui";
import { handleJson, normalizeTopic } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { DashboardQuestion, GroupedQuestions } from "@/lib/dashboard-types";
import type { TestSummary } from "@/lib/types";

type CreateTestSheetProps = {
  visible: boolean;
  classId: string;
  className: string;
  onClose: () => void;
  onCreated: (test: TestSummary) => void;
  onStatus?: (message: string, type?: "info" | "error") => void;
};

export default function CreateTestSheet({
  visible,
  classId,
  className,
  onClose,
  onCreated,
  onStatus,
}: CreateTestSheetProps) {
  const graiderFetch = useGraiderFetch();
  const [testTitle, setTestTitle] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<DashboardQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (!visible || !classId) return;
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const payload = await handleJson<{ questions: DashboardQuestion[] }>(
          await graiderFetch(`/api/questions?classId=${encodeURIComponent(classId)}`, {
            cache: "no-store",
          }),
        );
        if (!cancelled) setQuestions(payload.questions ?? []);
      } catch (error) {
        if (!cancelled) {
          onStatus?.(error instanceof Error ? error.message : "Failed to load questions.", "error");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [visible, classId, graiderFetch, onStatus]);

  const grouped: GroupedQuestions[] = useMemo(() => {
    const map = new Map<string, DashboardQuestion[]>();
    for (const q of questions) {
      const topic = normalizeTopic(q.topic);
      map.set(topic, [...(map.get(topic) ?? []), q]);
    }
    return Array.from(map.entries())
      .map(([topic, items]) => ({ topic, items }))
      .sort((a, b) => a.topic.localeCompare(b.topic));
  }, [questions]);

  function reset() {
    setTestTitle("");
    setSelectedQuestionIds([]);
  }

  function toggleQuestion(questionId: string) {
    setSelectedQuestionIds((current) =>
      current.includes(questionId) ? current.filter((id) => id !== questionId) : [...current, questionId],
    );
  }

  async function createTest() {
    if (!testTitle.trim() || selectedQuestionIds.length === 0) {
      onStatus?.("Enter a title and select at least one question.", "error");
      return;
    }
    setIsBusy(true);
    try {
      const payload = await handleJson<{
        testId: string;
        title: string;
        classId: string;
      }>(
        await graiderFetch("/api/tests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classId, title: testTitle.trim(), questionIds: selectedQuestionIds }),
        }),
      );
      onCreated({
        id: payload.testId,
        title: payload.title,
        class_id: payload.classId,
        teacher_id: "",
        grades_released: false,
        show_ai_feedback: false,
      });
      reset();
      onClose();
      onStatus?.("Test created.");
    } catch (error) {
      onStatus?.(error instanceof Error ? error.message : "Failed to create test.", "error");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <FormSheet
      visible={visible}
      title="Create test"
      subtitle={`${className} — pick questions or import a PDF`}
      onClose={() => {
        reset();
        onClose();
      }}
      primaryLabel="Create test"
      onPrimary={() => void createTest()}
      primaryDisabled={isBusy || isLoading || selectedQuestionIds.length === 0 || !testTitle.trim()}
      primaryLoading={isBusy}
    >
      <View className="gap-4">
        <PdfImportPanel
          classId={classId}
          kind="test"
          onComplete={async () => {
            try {
              const payload = await handleJson<{ tests: TestSummary[] }>(
                await graiderFetch(`/api/tests?classId=${encodeURIComponent(classId)}`, {
                  cache: "no-store",
                }),
              );
              const latest = (payload.tests ?? []).sort((a, b) =>
                (b.created_at ?? "").localeCompare(a.created_at ?? ""),
              )[0];
              if (latest) {
                onCreated(latest);
                reset();
                onClose();
                onStatus?.("Test imported from PDF.");
              }
            } catch (error) {
              onStatus?.(error instanceof Error ? error.message : "Failed to load new test.", "error");
            }
          }}
          onStatus={(message, type) => onStatus?.(message, type)}
          disabled={isBusy}
        />

        <FormField label="Test title">
          <GraiderTextInput value={testTitle} onChangeText={setTestTitle} placeholder="e.g. Chapter 3 quiz" />
        </FormField>

        {isLoading ? (
          <Text className="text-sm text-ink-soft">Loading questions…</Text>
        ) : questions.length === 0 ? (
          <Text className="text-sm text-ink-soft">
            Add questions in the Question Bank first, or import a test PDF above.
          </Text>
        ) : (
          <View>
            <Text className="mb-2 text-sm font-medium text-ink">Select questions</Text>
            <View className="gap-3">
              {grouped.map((group) => (
                <View key={group.topic}>
                  <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    {group.topic}
                  </Text>
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
        )}
      </View>
    </FormSheet>
  );
}
