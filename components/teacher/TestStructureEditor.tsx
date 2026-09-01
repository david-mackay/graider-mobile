import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderHandlers,
} from "react-native";
import { GripVertical } from "lucide-react-native";
import AnimatedReanimated, { LinearTransition } from "react-native-reanimated";
import {
  Badge,
  Card,
  FormField,
  GraiderTextInput,
  btnPrimary,
  btnSecondary,
} from "@/components/shared/ui";
import { handleJson } from "@/lib/dashboard-client";
import { indexFromWindowMids, moveIndex, scrollDeltaForEdge } from "@/lib/reorder";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { TestDetail, TestQuestion } from "@/lib/types";

export type EditableQuestion = {
  question_id: string;
  prompt: string;
  correct_answer: string;
  marks: string;
  question_type: "open" | "mcq";
  choices: Array<{ key: string; text: string }>;
  dirty: boolean;
  saving: boolean;
};

export type LiftedQuestion = {
  row: EditableQuestion;
  index: number;
  width: number;
};

type TestStructureEditorProps = {
  test: TestDetail;
  graiderFetch: ReturnType<typeof useGraiderFetch>;
  onChanged: () => void | Promise<void>;
  onError: (message: string) => void;
  onDraggingChange?: (dragging: boolean) => void;
  scrollRef?: RefObject<ScrollView | null>;
  scrollOffsetRef?: RefObject<number>;
  hostRef?: RefObject<View | null>;
  liftX: Animated.Value;
  liftY: Animated.Value;
  onLiftStart: (payload: LiftedQuestion) => void;
  onLiftEnd: () => void;
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

export function LiftedQuestionCard({ row, index }: { row: EditableQuestion; index: number }) {
  return (
    <View
      className="rounded-xl border border-pen bg-paper p-3"
      style={{
        shadowColor: "#2c231b",
        shadowOpacity: 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 14,
      }}
    >
      <QuestionCardFace row={row} index={index} interactive={false} />
    </View>
  );
}

function QuestionCardFace({
  row,
  index,
  interactive,
  busy,
  onPrompt,
  onAnswer,
  onMarks,
  onChoice,
  onSave,
}: {
  row: EditableQuestion;
  index: number;
  interactive: boolean;
  busy?: boolean;
  onPrompt?: (value: string) => void;
  onAnswer?: (value: string) => void;
  onMarks?: (value: string) => void;
  onChoice?: (key: string, value: string) => void;
  onSave?: () => void;
}) {
  return (
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

      {interactive ? (
        <FormField label="Question">
          <GraiderTextInput
            value={row.prompt}
            onChangeText={onPrompt}
            editable={!busy}
            multiline
            textAlignVertical="top"
            className="min-h-[72px]"
          />
        </FormField>
      ) : (
        <Text className="text-sm text-ink" numberOfLines={4}>
          {row.prompt}
        </Text>
      )}

      {row.question_type === "mcq" ? (
        <View className="gap-2">
          {row.choices.map((choice) =>
            interactive ? (
              <View key={choice.key} className="flex-row items-center gap-2">
                <Text className="w-5 text-sm font-bold text-pen">{choice.key}.</Text>
                <View className="flex-1">
                  <GraiderTextInput
                    value={choice.text}
                    onChangeText={(value) => onChoice?.(choice.key, value)}
                    editable={!busy}
                    placeholder={`Option ${choice.key}`}
                  />
                </View>
              </View>
            ) : (
              <Text key={choice.key} className="text-xs text-ink-soft" numberOfLines={1}>
                {choice.key}. {choice.text}
              </Text>
            ),
          )}
          {interactive ? (
            <FormField label="Answer key" hint="Correct letter">
              <GraiderTextInput
                value={row.correct_answer}
                autoCapitalize="characters"
                maxLength={1}
                onChangeText={onAnswer}
                editable={!busy}
              />
            </FormField>
          ) : (
            <Text className="text-xs text-ink-faint" numberOfLines={2}>
              Key: {row.correct_answer || "—"}
            </Text>
          )}
        </View>
      ) : interactive ? (
        <FormField label="Answer key">
          <GraiderTextInput
            value={row.correct_answer}
            onChangeText={onAnswer}
            editable={!busy}
            multiline
            textAlignVertical="top"
            className="min-h-[64px]"
          />
        </FormField>
      ) : (
        <Text className="text-xs text-ink-faint" numberOfLines={3}>
          Key: {row.correct_answer || "—"}
        </Text>
      )}

      {interactive ? (
        <View className="flex-row items-end gap-2">
          <View className="w-24">
            <FormField label="Marks">
              <GraiderTextInput
                value={row.marks}
                keyboardType="number-pad"
                onChangeText={onMarks}
                editable={!busy}
              />
            </FormField>
          </View>
          {row.dirty ? (
            <Pressable disabled={busy} onPress={onSave} className={`${btnPrimary} mb-0.5`}>
              <Text className="text-sm font-medium text-white">{row.saving ? "Saving…" : "Save"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text className="text-xs font-semibold text-ink-soft">
          {row.marks} mark{row.marks === "1" ? "" : "s"}
        </Text>
      )}
    </View>
  );
}

function DragHandle({
  disabled,
  onStart,
  onMove,
  onEnd,
}: {
  disabled: boolean;
  onStart: (pageX: number, pageY: number) => void;
  onMove: (pageX: number, pageY: number) => void;
  onEnd: () => void;
}) {
  const callbacks = useRef({ disabled, onStart, onMove, onEnd });
  callbacks.current = { disabled, onStart, onMove, onEnd };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !callbacks.current.disabled,
        onMoveShouldSetPanResponder: (_, gesture) =>
          !callbacks.current.disabled && Math.abs(gesture.dy) + Math.abs(gesture.dx) > 2,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) =>
          callbacks.current.onStart(event.nativeEvent.pageX, event.nativeEvent.pageY),
        onPanResponderMove: (event) =>
          callbacks.current.onMove(event.nativeEvent.pageX, event.nativeEvent.pageY),
        onPanResponderRelease: () => callbacks.current.onEnd(),
        onPanResponderTerminate: () => callbacks.current.onEnd(),
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
  scrollRef,
  scrollOffsetRef,
  hostRef,
  liftX,
  liftY,
  onLiftStart,
  onLiftEnd,
}: TestStructureEditorProps) {
  const [title, setTitle] = useState(test.title);
  const [titleDirty, setTitleDirty] = useState(false);
  const [titleSaving, setTitleSaving] = useState(false);
  const [rows, setRows] = useState<EditableQuestion[]>(() => toEditable(test.questions));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [orderSaving, setOrderSaving] = useState(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const draggingIdRef = useRef<string | null>(null);
  const originRef = useRef({ x: 0, y: 0, pageX: 0, pageY: 0 });
  const itemRefs = useRef(new Map<string, View>());
  const heightsRef = useRef(new Map<string, number>());
  const fingerRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);
  const measuringRef = useRef(false);
  const startOrderRef = useRef<string[]>([]);

  useEffect(() => {
    setTitle((current) => (titleDirty ? current : test.title));
    const keepLocalEdits = rowsRef.current.some((row) => row.dirty || row.saving);
    if (!keepLocalEdits && !draggingIdRef.current) {
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
    const ids = nextRows.map((row) => row.question_id);
    if (ids.join() === startOrderRef.current.join()) return;
    setOrderSaving(true);
    try {
      await handleJson(
        await graiderFetch(`/api/tests/${test.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_ids: ids }),
        }),
      );
    } catch (err) {
      setRows(toEditable(test.questions));
      onError(err instanceof Error ? err.message : "Failed to save question order.");
    } finally {
      setOrderSaving(false);
    }
  }

  function setLiftPosition(pageX: number, pageY: number) {
    const origin = originRef.current;
    hostRef?.current?.measureInWindow((hx, hy) => {
      liftX.setValue(origin.x - hx + (pageX - origin.pageX));
      liftY.setValue(origin.y - hy + (pageY - origin.pageY));
    });
  }

  function maybeReorder(pageY: number) {
    const currentId = draggingIdRef.current;
    if (!currentId || measuringRef.current) return;
    const currentRows = rowsRef.current;
    const from = currentRows.findIndex((row) => row.question_id === currentId);
    if (from < 0) return;
    measuringRef.current = true;

    const mids: number[] = [];
    let pending = currentRows.length;
    currentRows.forEach((row, index) => {
      const node = itemRefs.current.get(row.question_id);
      if (!node) {
        mids[index] = Number.NaN;
        pending -= 1;
        if (pending === 0) applyHover();
        return;
      }
      node.measureInWindow((_x, y, _w, h) => {
        mids[index] = y + h / 2;
        pending -= 1;
        if (pending === 0) applyHover();
      });
    });

    function applyHover() {
      measuringRef.current = false;
      if (draggingIdRef.current !== currentId) return;
      const valid = mids.map((mid, index) => (Number.isFinite(mid) ? mid : index * 120));
      const to = indexFromWindowMids(pageY, valid);
      const latestFrom = rowsRef.current.findIndex((row) => row.question_id === currentId);
      if (latestFrom < 0 || to === latestFrom) return;
      setRows((prev) => moveIndex(prev, latestFrom, to));
    }
  }

  function autoScroll(pageY: number) {
    const scroller = scrollRef?.current;
    if (!scroller) return;
    scroller.measureInWindow((_x, top, _w, height) => {
      const delta = scrollDeltaForEdge(pageY, top, height);
      if (delta === 0) return;
      const current = scrollOffsetRef?.current ?? 0;
      const next = Math.max(0, current + delta);
      if (scrollOffsetRef) scrollOffsetRef.current = next;
      scroller.scrollTo({ y: next, animated: false });
      maybeReorder(pageY);
    });
  }

  function stopLoop() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function loop() {
    if (!draggingIdRef.current) return;
    autoScroll(fingerRef.current.y);
    rafRef.current = requestAnimationFrame(loop);
  }

  function beginDrag(index: number, pageX: number, pageY: number) {
    const row = rowsRef.current[index];
    if (!row) return;
    const node = itemRefs.current.get(row.question_id);
    if (!node) return;
    node.measureInWindow((x, y, width) => {
      originRef.current = { x, y, pageX, pageY };
      fingerRef.current = { x: pageX, y: pageY };
      draggingIdRef.current = row.question_id;
      startOrderRef.current = rowsRef.current.map((item) => item.question_id);
      setDraggingId(row.question_id);
      onDraggingChange?.(true);
      hostRef?.current?.measureInWindow((hx, hy) => {
        liftX.setValue(x - hx);
        liftY.setValue(y - hy);
      });
      onLiftStart({ row, index, width });
      stopLoop();
      rafRef.current = requestAnimationFrame(loop);
    });
  }

  function moveDrag(pageX: number, pageY: number) {
    fingerRef.current = { x: pageX, y: pageY };
    setLiftPosition(pageX, pageY);
    maybeReorder(pageY);
  }

  function endDrag() {
    stopLoop();
    const next = rowsRef.current;
    draggingIdRef.current = null;
    setDraggingId(null);
    onDraggingChange?.(false);
    onLiftEnd();
    void persistOrder(next);
  }

  const busy = titleSaving || orderSaving || rows.some((row) => row.saving);

  return (
    <Card className="border-line">
      <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        Test structure
      </Text>
      <Text className="mt-1 text-xs text-ink-soft">
        Edit the prompt, answer key, and marks. Drag a question by the handle — others slide out of
        the way. Drag to the top or bottom of the screen to scroll.
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

      <View className="mt-4">
        {rows.map((row, index) => {
          const isLifted = draggingId === row.question_id;
          const slotHeight = heightsRef.current.get(row.question_id);
          return (
            <AnimatedReanimated.View
              key={row.question_id}
              layout={LinearTransition.duration(180)}
              style={{ marginBottom: 8 }}
            >
              <View
                ref={(node) => {
                  if (node) itemRefs.current.set(row.question_id, node);
                  else itemRefs.current.delete(row.question_id);
                }}
                onLayout={(event) => {
                  if (draggingIdRef.current === row.question_id) return;
                  heightsRef.current.set(row.question_id, event.nativeEvent.layout.height);
                }}
                collapsable={false}
              >
              {isLifted ? (
                <View
                  className="rounded-xl border border-dashed border-line bg-cream-deep/70"
                  style={{ height: slotHeight ?? 160 }}
                />
              ) : (
                <View className="rounded-xl border border-line bg-pen-wash/30 p-3">
                  <View className="flex-row items-start gap-2">
                    <DragHandle
                      disabled={busy || rows.length < 2}
                      onStart={(pageX, pageY) => beginDrag(index, pageX, pageY)}
                      onMove={moveDrag}
                      onEnd={endDrag}
                    />
                    <QuestionCardFace
                      row={row}
                      index={index}
                      interactive
                      busy={busy}
                      onPrompt={(value) => patchRow(row.question_id, { prompt: value })}
                      onAnswer={(value) =>
                        patchRow(row.question_id, {
                          correct_answer: row.question_type === "mcq" ? value.toUpperCase() : value,
                        })
                      }
                      onMarks={(value) => patchRow(row.question_id, { marks: value })}
                      onChoice={(key, value) => setChoice(row.question_id, key, value)}
                      onSave={() => void saveQuestion(row)}
                    />
                  </View>
                </View>
              )}
              </View>
            </AnimatedReanimated.View>
          );
        })}
        {rows.length === 0 ? (
          <Text className="text-xs text-ink-soft">No questions on this test yet.</Text>
        ) : null}
      </View>
    </Card>
  );
}
