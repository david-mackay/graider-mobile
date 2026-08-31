import { useEffect, useMemo, useRef, useState } from "react";
import {
  PanResponder,
  Pressable,
  Text,
  View,
  type GestureResponderHandlers,
} from "react-native";
import { GripVertical } from "lucide-react-native";
import {
  Badge,
  Card,
  FormField,
  GraiderTextInput,
  btnPrimary,
  btnSecondary,
} from "@/components/shared/ui";
import { handleJson } from "@/lib/dashboard-client";
import { dropIndexForOffset, moveIndex } from "@/lib/reorder";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { TestDetail, TestQuestion } from "@/lib/types";

type EditableQuestion = {
  question_id: string;
  prompt: string;
  correct_answer: string;
  marks: string;
  question_type: "open" | "mcq";
  choices: Array<{ key: string; text: string }>;
  dirty: boolean;
  saving: boolean;
};

type TestStructureEditorProps = {
  test: TestDetail;
  graiderFetch: ReturnType<typeof useGraiderFetch>;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

function toEditable(questions: TestQuestion[]): EditableQuestion[] {
  return questions.map((q) => ({
    question_id: q.question_id,
    prompt: q.prompt,
    correct_answer: q.correct_answer ?? "",
    marks: String(q.marks),
    question_type: q.question_type === "mcq" ? "mcq" : "open",
    choices: q.question_type === "mcq" ? (q.choices ?? []) : [],
    dirty: false,
    saving: false,
  }));
}

function DragHandle({
  disabled,
  onStart,
  onMove,
  onEnd,
}: {
  disabled: boolean;
  onStart: () => void;
  onMove: (dy: number) => void;
  onEnd: (dy: number) => void;
}) {
  const callbacks = useRef({ disabled, onStart, onMove, onEnd });
  callbacks.current = { disabled, onStart, onMove, onEnd };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !callbacks.current.disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !callbacks.current.disabled && Math.abs(gesture.dy) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => callbacks.current.onStart(),
        onPanResponderMove: (_, gesture) => callbacks.current.onMove(gesture.dy),
        onPanResponderRelease: (_, gesture) => callbacks.current.onEnd(gesture.dy),
        onPanResponderTerminate: (_, gesture) => callbacks.current.onEnd(gesture.dy),
      }),
    [],
  );

  return (
    <View
      {...(pan.panHandlers as GestureResponderHandlers)}
      hitSlop={8}
      accessibilityRole="adjustable"
      accessibilityLabel="Drag to reorder question"
      className="h-11 w-11 items-center justify-center rounded-xl border border-line bg-cream"
    >
      <GripVertical size={18} color={disabled ? "#c4b8a5" : "#6f6151"} />
    </View>
  );
}

export default function TestStructureEditor({
  test,
  graiderFetch,
  onChanged,
  onError,
  onDraggingChange,
}: TestStructureEditorProps) {
  const [title, setTitle] = useState(test.title);
  const [titleDirty, setTitleDirty] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [rows, setRows] = useState<EditableQuestion[]>(() => toEditable(test.questions));
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const heightsRef = useRef<number[]>([]);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  useEffect(() => {
    setTitle((current) => (titleDirty ? current : test.title));
    const keepLocalEdits = rowsRef.current.some((row) => row.dirty || row.saving);
    if (!keepLocalEdits) {
      setRows(toEditable(test.questions));
    }
  }, [test, titleDirty]);

  function patchRow(questionId: string, patch: Partial<EditableQuestion>) {
    setRows((prev) =>
      prev.map((row) =>
        row.question_id === questionId ? { ...row, ...patch, dirty: true } : row,
      ),
    );
  }

  function setChoice(questionId: string, key: string, text: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.question_id !== questionId) return row;
        return {
          ...row,
          dirty: true,
          choices: row.choices.map((choice) => (choice.key === key ? { ...choice, text } : choice)),
        };
      }),
    );
  }

  async function saveTitle() {
    const next = title.trim();
    if (!next) {
      onError("Test title is required.");
      return;
    }
    setTitleSaving(true);
    try {
      await handleJson(
        await graiderFetch(`/api/tests/${test.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: next }),
        }),
      );
      setTitleDirty(false);
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save title.");
    } finally {
      setTitleSaving(false);
    }
  }

  async function saveQuestion(row: EditableQuestion) {
    const prompt = row.prompt.trim();
    const correctAnswer = row.correct_answer.trim();
    const marks = Number(row.marks);
    if (!prompt) {
      onError("Question prompt is required.");
      return;
    }
    if (!correctAnswer) {
      onError("Answer key is required.");
      return;
    }
    if (!Number.isFinite(marks) || marks < 0) {
      onError("Marks must be a non-negative number.");
      return;
    }

    const isMcq = row.question_type === "mcq";
    const choices = isMcq
      ? row.choices
          .map((choice) => ({ key: choice.key.toUpperCase(), text: choice.text.trim() }))
          .filter((choice) => /^[A-E]$/.test(choice.key))
      : null;
    if (isMcq && choices && choices.length > 0 && choices.some((choice) => !choice.text)) {
      onError("Fill in text for every MCQ choice.");
      return;
    }

    setRows((prev) =>
      prev.map((item) => (item.question_id === row.question_id ? { ...item, saving: true } : item)),
    );
    try {
      await handleJson(
        await graiderFetch(`/api/questions/${row.question_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_id: test.class_id,
            prompt,
            correct_answer: isMcq ? correctAnswer.toUpperCase().slice(0, 1) : correctAnswer,
            marks,
            question_type: row.question_type,
            choices,
          }),
        }),
      );
      setRows((prev) =>
        prev.map((item) =>
          item.question_id === row.question_id
            ? {
                ...item,
                prompt,
                correct_answer: isMcq ? correctAnswer.toUpperCase().slice(0, 1) : correctAnswer,
                marks: String(marks),
                dirty: false,
                saving: false,
              }
            : item,
        ),
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((item) =>
          item.question_id === row.question_id ? { ...item, saving: false } : item,
        ),
      );
      onError(err instanceof Error ? err.message : "Failed to save question.");
    }
  }

  async function persistOrder(nextRows: EditableQuestion[]) {
    setOrderSaving(true);
    try {
      await handleJson(
        await graiderFetch(`/api/tests/${test.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_ids: nextRows.map((row) => row.question_id) }),
        }),
      );
    } catch (err) {
      setRows(toEditable(test.questions));
      onError(err instanceof Error ? err.message : "Failed to save question order.");
    } finally {
      setOrderSaving(false);
    }
  }

  function beginDrag(index: number) {
    setDraggingIndex(index);
    setDropIndex(index);
    onDraggingChange?.(true);
  }

  function moveDrag(from: number, dy: number) {
    setDropIndex(dropIndexForOffset(from, dy, heightsRef.current));
  }

  function endDrag(from: number, dy: number) {
    const to = dropIndexForOffset(from, dy, heightsRef.current);
    setDraggingIndex(null);
    setDropIndex(null);
    onDraggingChange?.(false);
    if (to === from) return;
    const next = moveIndex(rowsRef.current, from, to);
    setRows(next);
    void persistOrder(next);
  }

  const busy = titleSaving || orderSaving || rows.some((row) => row.saving);

  return (
    <Card className="border-line">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Test structure
      </Text>
      <Text className="mt-1 text-xs text-ink-soft">
        Edit the prompt, answer key, and marks. Hold the handle to drag a question to a new position.
      </Text>

      <View className="mt-3 gap-2">
        <FormField label="Title">
          <GraiderTextInput
            value={title}
            onChangeText={(value) => {
              setTitle(value);
              setTitleDirty(true);
            }}
            editable={!busy}
          />
        </FormField>
        {titleDirty ? (
          <Pressable
            disabled={busy}
            onPress={() => void saveTitle()}
            className={`${btnSecondary} self-start`}
          >
            <Text className="text-sm font-medium text-pen-deep">
              {titleSaving ? "Saving…" : "Save title"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-4 gap-2">
        {rows.map((row, index) => {
          const isDragging = draggingIndex === index;
          const isDropTarget = dropIndex === index && draggingIndex !== null && draggingIndex !== index;
          return (
            <View
              key={row.question_id}
              onLayout={(event) => {
                heightsRef.current[index] = event.nativeEvent.layout.height + 8;
              }}
              className={`rounded-xl border bg-pen-wash/30 p-3 ${
                isDropTarget ? "border-pen" : "border-line"
              } ${isDragging ? "opacity-60" : ""}`}
            >
              <View className="flex-row items-start gap-2">
                <DragHandle
                  disabled={busy || rows.length < 2}
                  onStart={() => beginDrag(index)}
                  onMove={(dy) => moveDrag(index, dy)}
                  onEnd={(dy) => endDrag(index, dy)}
                />
                <View className="min-w-0 flex-1 gap-3">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Q{index + 1}
                      {row.dirty ? " · unsaved" : ""}
                    </Text>
                    <Badge variant={row.question_type === "mcq" ? "blue" : "gray"}>
                      {row.question_type === "mcq" ? "MCQ" : "Open"}
                    </Badge>
                  </View>

                  <FormField label="Question">
                    <GraiderTextInput
                      value={row.prompt}
                      onChangeText={(value) => patchRow(row.question_id, { prompt: value })}
                      editable={!busy}
                      multiline
                      textAlignVertical="top"
                      className="min-h-[72px]"
                    />
                  </FormField>

                  {row.question_type === "mcq" ? (
                    <View className="gap-2">
                      {row.choices.map((choice) => (
                        <View key={choice.key} className="flex-row items-center gap-2">
                          <Text className="w-5 text-sm font-bold text-pen">{choice.key}.</Text>
                          <View className="flex-1">
                            <GraiderTextInput
                              value={choice.text}
                              onChangeText={(value) => setChoice(row.question_id, choice.key, value)}
                              editable={!busy}
                              placeholder={`Option ${choice.key}`}
                            />
                          </View>
                        </View>
                      ))}
                      <FormField label="Answer key" hint="Correct letter">
                        <GraiderTextInput
                          value={row.correct_answer}
                          autoCapitalize="characters"
                          maxLength={1}
                          onChangeText={(value) =>
                            patchRow(row.question_id, { correct_answer: value.toUpperCase() })
                          }
                          editable={!busy}
                        />
                      </FormField>
                    </View>
                  ) : (
                    <FormField label="Answer key">
                      <GraiderTextInput
                        value={row.correct_answer}
                        onChangeText={(value) =>
                          patchRow(row.question_id, { correct_answer: value })
                        }
                        editable={!busy}
                        multiline
                        textAlignVertical="top"
                        className="min-h-[64px]"
                      />
                    </FormField>
                  )}

                  <View className="flex-row items-end gap-2">
                    <View className="w-24">
                      <FormField label="Marks">
                        <GraiderTextInput
                          value={row.marks}
                          keyboardType="number-pad"
                          onChangeText={(value) => patchRow(row.question_id, { marks: value })}
                          editable={!busy}
                        />
                      </FormField>
                    </View>
                    {row.dirty ? (
                      <Pressable
                        disabled={busy}
                        onPress={() => void saveQuestion(row)}
                        className={`${btnPrimary} mb-0.5`}
                      >
                        <Text className="text-sm font-medium text-white">
                          {row.saving ? "Saving…" : "Save"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          );
        })}
        {rows.length === 0 ? (
          <Text className="text-xs text-ink-soft">No questions on this test yet.</Text>
        ) : null}
      </View>
    </Card>
  );
}
