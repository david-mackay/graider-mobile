import { View, Text, Pressable, Alert } from "react-native";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react-native";
import {
  Badge,
  Card,
  FormField,
  GraiderTextInput,
  SectionHeader,
  btnPrimary,
  btnSecondaryBlock,
} from "@/components/shared/ui";
import FormSheet from "@/components/shared/FormSheet";
import IconButton from "@/components/shared/IconButton";
import PdfImportPanel from "@/components/shared/PdfImportPanel";
import { IconBook } from "@/components/shared/icons";
import { handleJson, normalizeTopic } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { DashboardQuestion, GroupedQuestions } from "@/lib/dashboard-types";

type QuestionsViewProps = {
  classId: string | null;
  className: string | null;
  classCanManage: boolean;
  questions: DashboardQuestion[];
  onChanged: () => void | Promise<void>;
  onStatus: (message: string, type?: "info" | "error") => void;
  onGoToClasses: () => void;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

function MarksPill({ marks }: { marks: number }) {
  return (
    <View className="h-9 min-w-[52px] items-center justify-center rounded-full border border-line bg-cream-deep/80 px-2.5">
      <Text className="text-xs font-bold text-ink-soft">
        {marks}m
      </Text>
    </View>
  );
}

export default function QuestionsView({
  classId,
  className,
  classCanManage,
  questions,
  onChanged,
  onStatus,
  onGoToClasses,
  isBusy,
  setBusy,
}: QuestionsViewProps) {
  const graiderFetch = useGraiderFetch();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [topic, setTopic] = useState("");
  const [marks, setMarks] = useState("2");

  const [editId, setEditId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [editTopic, setEditTopic] = useState("");
  const [editMarks, setEditMarks] = useState("2");

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

  const filteredGroups = topicFilter ? grouped.filter((g) => g.topic === topicFilter) : grouped;
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  function openAddModal() {
    setPrompt("");
    setAnswer("");
    setTopic("");
    setMarks("2");
    setAddModalOpen(true);
  }

  function openEditModal(q: DashboardQuestion) {
    setEditId(q.id);
    setEditPrompt(q.prompt);
    setEditAnswer(q.correct_answer);
    setEditTopic(q.topic ?? "");
    setEditMarks(String(q.marks));
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditId(null);
  }

  async function createQuestion() {
    if (!classId) {
      onStatus("Select a class first.", "error");
      return;
    }
    setBusy(true);
    try {
      await handleJson(
        await graiderFetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: classId,
            prompt,
            correct_answer: answer,
            marks: Number(marks),
            topic,
          }),
        }),
      );
      setAddModalOpen(false);
      onStatus("Question added.");
      await onChanged();
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editId || !classId) return;
    setBusy(true);
    try {
      await handleJson(
        await graiderFetch(`/api/questions/${editId}?classId=${classId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: classId,
            prompt: editPrompt,
            correct_answer: editAnswer,
            marks: Number(editMarks),
            topic: editTopic,
          }),
        }),
      );
      closeEditModal();
      onStatus("Question updated.");
      await onChanged();
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  function deleteQuestion(questionId: string) {
    if (!classId) return;
    Alert.alert("Delete question?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void (async () => {
          try {
            await handleJson(
              await graiderFetch(`/api/questions/${questionId}?classId=${classId}`, { method: "DELETE" }),
            );
            onStatus("Question deleted.");
            await onChanged();
          } catch (error) {
            if (error instanceof Error) onStatus(error.message, "error");
          }
        })(),
      },
    ]);
  }

  return (
    <View className="gap-6">
      <SectionHeader
        title="Question Bank"
        subtitle={
          className
            ? `${className} · ${questions.length} question${questions.length !== 1 ? "s" : ""} · ${totalMarks} marks total`
            : "Select a class to manage questions."
        }
        action={
          classCanManage ? (
            <Pressable className={btnPrimary} onPress={openAddModal}>
              <Text className="font-bold text-white">+ Add</Text>
            </Pressable>
          ) : undefined
        }
      />

      {!classCanManage ? (
        <Card className="items-center py-10">
          <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
            <IconBook className="h-5 w-5 text-ink-faint" />
          </View>
          <Text className="text-sm font-semibold text-ink">{!classId ? "No class selected" : "Access restricted"}</Text>
          <Text className="mt-1 text-center text-xs text-ink-faint">
            {!classId
              ? "Open a class from the Classes tab to manage its questions."
              : "You need to be a teacher of this class to manage questions."}
          </Text>
          {!classId ? (
            <Pressable className={`${btnSecondaryBlock} mt-4 px-5`} onPress={onGoToClasses}>
              <Text className="text-sm font-medium text-pen-deep">Go to Classes</Text>
            </Pressable>
          ) : null}
        </Card>
      ) : (
        <>
          {grouped.length > 1 ? (
            <View className="flex-row flex-wrap gap-2">
              <Pressable
                onPress={() => setTopicFilter(null)}
                className={`rounded-full px-3 py-1.5 ${topicFilter === null ? "bg-pen" : "bg-pen-wash"}`}
              >
                <Text className={`text-xs font-medium ${topicFilter === null ? "text-white" : "text-pen"}`}>
                  All topics
                </Text>
              </Pressable>
              {grouped.map((g) => (
                <Pressable
                  key={g.topic}
                  onPress={() => setTopicFilter(g.topic === topicFilter ? null : g.topic)}
                  className={`rounded-full px-3 py-1.5 ${topicFilter === g.topic ? "bg-pen" : "bg-pen-wash"}`}
                >
                  <Text className={`text-xs font-medium ${topicFilter === g.topic ? "text-white" : "text-pen"}`}>
                    {g.topic} ({g.items.length})
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {questions.length === 0 ? (
            <Card className="items-center py-10">
              <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
                <IconBook className="h-5 w-5 text-ink-faint" />
              </View>
              <Text className="text-sm font-semibold text-ink">No questions yet</Text>
              <Text className="mt-1 text-center text-xs text-ink-faint">Add manually or import a question bank PDF.</Text>
              <Pressable className={`${btnSecondaryBlock} mt-4 px-5`} onPress={openAddModal}>
                <Text className="text-sm font-medium text-pen-deep">Add your first question</Text>
              </Pressable>
            </Card>
          ) : (
            <View className="gap-4">
              {filteredGroups.map((group) => (
                <View key={group.topic}>
                  <View className="mb-2 flex-row items-center gap-2">
                    <View className="h-px flex-1 bg-line" />
                    <Text className="text-xs font-semibold uppercase tracking-wider text-ink-faint">{group.topic}</Text>
                    <Badge variant="gray">{group.items.length}</Badge>
                    <View className="h-px flex-1 bg-line" />
                  </View>
                  <View className="gap-2">
                    {group.items.map((q) => (
                      <Card key={q.id}>
                        <View className="flex-row items-start gap-3">
                          <View className="min-w-0 flex-1">
                            <Text className="text-sm font-medium leading-snug text-ink">{q.prompt}</Text>
                            <Text className="mt-1.5 text-xs text-ink-faint" numberOfLines={2}>
                              Answer key: <Text className="italic">{q.correct_answer}</Text>
                            </Text>
                          </View>
                          <View className="flex-row items-center gap-2">
                            <MarksPill marks={q.marks} />
                            <IconButton
                              icon={Pencil}
                              accessibilityLabel="Edit question"
                              onPress={() => openEditModal(q)}
                              disabled={isBusy}
                            />
                            <IconButton
                              icon={Trash2}
                              accessibilityLabel="Delete question"
                              variant="danger"
                              onPress={() => deleteQuestion(q.id)}
                              disabled={isBusy}
                            />
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <FormSheet
        visible={addModalOpen}
        title="Add question"
        subtitle="Build your bank manually or import from a PDF."
        onClose={() => setAddModalOpen(false)}
        primaryLabel="Add question"
        onPrimary={() => void createQuestion()}
        primaryDisabled={!prompt.trim() || !answer.trim() || isBusy}
        primaryLoading={isBusy}
      >
        <View className="gap-4">
          {classId ? (
            <PdfImportPanel
              classId={classId}
              kind="question_bank"
              onComplete={async () => {
                setAddModalOpen(false);
                await onChanged();
              }}
              onStatus={onStatus}
              disabled={isBusy}
            />
          ) : null}
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Topic">
                <GraiderTextInput value={topic} onChangeText={setTopic} placeholder="e.g. Photosynthesis" />
              </FormField>
            </View>
            <View className="w-24">
              <FormField label="Marks">
                <GraiderTextInput keyboardType="numeric" value={marks} onChangeText={setMarks} />
              </FormField>
            </View>
          </View>
          <FormField label="Question">
            <GraiderTextInput
              multiline
              className="min-h-[100px]"
              value={prompt}
              onChangeText={setPrompt}
              placeholder="What students will see…"
              textAlignVertical="top"
            />
          </FormField>
          <FormField label="Answer key" hint="Model answer for AI grading — students won't see this.">
            <GraiderTextInput
              multiline
              className="min-h-[80px]"
              value={answer}
              onChangeText={setAnswer}
              placeholder="Be specific for better grading."
              textAlignVertical="top"
            />
          </FormField>
        </View>
      </FormSheet>

      <FormSheet
        visible={editModalOpen}
        title="Edit question"
        onClose={closeEditModal}
        primaryLabel="Save changes"
        onPrimary={() => void saveEdit()}
        primaryDisabled={!editPrompt.trim() || !editAnswer.trim() || isBusy}
        primaryLoading={isBusy}
      >
        <View className="gap-4">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField label="Topic">
                <GraiderTextInput value={editTopic} onChangeText={setEditTopic} placeholder="Topic" />
              </FormField>
            </View>
            <View className="w-24">
              <FormField label="Marks">
                <GraiderTextInput keyboardType="numeric" value={editMarks} onChangeText={setEditMarks} />
              </FormField>
            </View>
          </View>
          <FormField label="Question">
            <GraiderTextInput
              multiline
              className="min-h-[80px]"
              value={editPrompt}
              onChangeText={setEditPrompt}
              textAlignVertical="top"
            />
          </FormField>
          <FormField label="Answer key">
            <GraiderTextInput
              multiline
              className="min-h-[60px]"
              value={editAnswer}
              onChangeText={setEditAnswer}
              textAlignVertical="top"
            />
          </FormField>
        </View>
      </FormSheet>
    </View>
  );
}
