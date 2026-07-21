import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";

import { Card, btnPrimary, btnSecondary, inputClass } from "@/components/shared/ui";
import type { TestDetail } from "@/lib/types";

type TestTakingFormProps = {
  test: TestDetail;
  answers: Record<string, string>;
  onChangeAnswer: (questionId: string, value: string) => void;
  onSubmit: (opts?: { timedOut?: boolean }) => void | Promise<void>;
  onClose: () => void;
  isBusy: boolean;
  deadlineAt: string | null;
  durationMinutes: number | null;
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}

export default function TestTakingForm({
  test,
  answers,
  onChangeAnswer,
  onSubmit,
  onClose,
  isBusy,
  deadlineAt,
  durationMinutes,
}: TestTakingFormProps) {
  const totalMarks = test.questions.reduce((sum, q) => sum + q.marks, 0);

  const deadlineMs = useMemo(() => {
    if (!deadlineAt) return null;
    const d = new Date(deadlineAt);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }, [deadlineAt]);

  const [now, setNow] = useState(() => Date.now());
  const timedOutFiredRef = useRef(false);

  useEffect(() => {
    if (!deadlineMs) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [deadlineMs]);

  const remainingMs = deadlineMs ? deadlineMs - now : null;

  useEffect(() => {
    if (remainingMs === null) return;
    if (remainingMs > 0) return;
    if (timedOutFiredRef.current) return;
    if (isBusy) return;
    timedOutFiredRef.current = true;
    void onSubmit({ timedOut: true });
  }, [remainingMs, isBusy, onSubmit]);

  const isCritical = remainingMs !== null && remainingMs <= 60_000;
  const isWarning = remainingMs !== null && remainingMs <= 5 * 60_000 && remainingMs > 60_000;

  return (
    <View className="mb-6">
      <View
        className={`mb-4 rounded-2xl border px-4 py-3 ${
          isCritical
            ? "border-pen bg-pen-wash"
            : isWarning
              ? "border-marigold/40 bg-marigold-wash"
              : "border-line bg-paper"
        }`}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Time left</Text>
            <Text
              className={`mt-0.5 text-2xl font-bold tabular-nums ${
                isCritical ? "text-pen" : isWarning ? "text-marigold-deep" : "text-ink"
              }`}
            >
              {remainingMs !== null ? formatRemaining(remainingMs) : "No time limit"}
            </Text>
            {durationMinutes && durationMinutes > 0 ? (
              <Text className="mt-0.5 text-xs text-ink-faint">{durationMinutes} min limit</Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="rounded-2xl border border-line bg-paper px-3 py-2"
          >
            <Text className="text-sm font-medium text-ink-soft">Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mb-6">
        <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">In progress</Text>
        <Text className="mt-0.5 text-xl font-bold text-ink">{test.title}</Text>
        <Text className="mt-1 text-sm text-ink-faint">
          {test.questions.length} question{test.questions.length !== 1 ? "s" : ""} · {totalMarks} marks
        </Text>
      </View>

      <View className="gap-4">
        {test.questions.map((q, i) => (
          <Card key={q.question_id} className="border-line">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                Question {i + 1}
              </Text>
              <Text className="rounded-full bg-pen-wash px-2.5 py-0.5 text-xs font-semibold text-pen">
                {q.marks} mark{q.marks !== 1 ? "s" : ""}
              </Text>
            </View>
            <Text className="text-base font-semibold text-ink leading-relaxed">{q.prompt}</Text>
            <TextInput
              multiline
              className={`${inputClass} mt-4 min-h-[120px]`}
              value={answers[q.question_id] ?? ""}
              onChangeText={(text) => onChangeAnswer(q.question_id, text)}
              placeholder="Type your answer here…"
              textAlignVertical="top"
            />
          </Card>
        ))}

        <View className="mt-4 flex-row gap-3 rounded-2xl border border-line bg-paper p-3">
          <TouchableOpacity
            className={`${btnPrimary} flex-1 justify-center py-3`}
            onPress={() => void onSubmit()}
            disabled={isBusy}
          >
            <Text className="text-center font-semibold text-white">
              {isBusy ? "Submitting…" : "Submit test"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className={btnSecondary} onPress={onClose}>
            <Text className="font-medium text-pen-deep">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
