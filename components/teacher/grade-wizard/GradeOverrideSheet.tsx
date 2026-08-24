import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/shared/ui";

type GradeOverrideSheetProps = {
  visible: boolean;
  questionLabel: string;
  maxMarks: number;
  initialMarks: number;
  initialFeedback: string;
  initialCorrectAnswer?: string;
  initialStudentAnswer?: string;
  onClose: () => void;
  onSave: (payload: {
    marksEarned: number;
    feedback: string;
    correctAnswer: string;
    studentAnswer: string;
  }) => Promise<void>;
};

export default function GradeOverrideSheet({
  visible,
  questionLabel,
  maxMarks,
  initialMarks,
  initialFeedback,
  initialCorrectAnswer = "",
  initialStudentAnswer = "",
  onClose,
  onSave,
}: GradeOverrideSheetProps) {
  const [marksText, setMarksText] = useState(String(initialMarks));
  const [feedback, setFeedback] = useState(initialFeedback);
  const [correctAnswer, setCorrectAnswer] = useState(initialCorrectAnswer);
  const [studentAnswer, setStudentAnswer] = useState(initialStudentAnswer);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setMarksText(String(initialMarks));
      setFeedback(initialFeedback);
      setCorrectAnswer(initialCorrectAnswer);
      setStudentAnswer(initialStudentAnswer);
      setError("");
    }
  }, [visible, initialMarks, initialFeedback, initialCorrectAnswer, initialStudentAnswer]);

  async function handleSave() {
    const marks = Number(marksText);
    if (!Number.isFinite(marks)) {
      setError("Enter a valid number of marks.");
      return;
    }
    if (marks < 0 || marks > maxMarks) {
      setError(`Marks must be between 0 and ${maxMarks}.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        marksEarned: Math.round(marks),
        feedback: feedback.trim(),
        correctAnswer: correctAnswer.trim(),
        studentAnswer: studentAnswer.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save override.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable className="max-h-[88%] rounded-t-2xl bg-cream px-4 pb-10 pt-4" onPress={(e) => e.stopPropagation()}>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
            <Text className="text-base font-bold text-ink">Edit question</Text>
            <Text className="mt-1 text-sm text-ink-soft" numberOfLines={3}>
              {questionLabel}
            </Text>

            <ScrollView keyboardShouldPersistTaps="handled" className="mt-2">
              <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-faint">
                Student answer
              </Text>
              <TextInput
                value={studentAnswer}
                onChangeText={setStudentAnswer}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="min-h-[88px] rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink"
              />
              <Text className="mt-1 text-[11px] text-ink-faint">
                Changing this re-grades the question against the answer key.
              </Text>

              <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-faint">Answer key</Text>
              <TextInput
                value={correctAnswer}
                onChangeText={setCorrectAnswer}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-[72px] rounded-xl border border-moss/40 bg-moss-wash/40 px-4 py-3 text-sm text-ink"
              />
              <Text className="mt-1 text-[11px] text-ink-faint">
                Shared across this test. Saving re-grades this student against the new key.
              </Text>

              <Text className="mb-1 mt-4 text-xs font-semibold uppercase text-ink-faint">
                Marks (0–{maxMarks})
              </Text>
              <TextInput
                value={marksText}
                onChangeText={setMarksText}
                keyboardType="number-pad"
                className="rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink"
              />

              <Text className="mb-1 mt-3 text-xs font-semibold uppercase text-ink-faint">Feedback</Text>
              <TextInput
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="min-h-[80px] rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink"
              />

              {error ? <Text className="mt-2 text-sm text-pen-deep">{error}</Text> : null}

              <View className="mt-5 flex-row justify-end gap-3">
                <TouchableOpacity onPress={onClose} disabled={saving} className={btnSecondary}>
                  <Text className="text-sm font-medium text-pen-deep">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => void handleSave()} disabled={saving} className={btnPrimary}>
                  <Text className="text-sm font-semibold text-white">{saving ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}
