import { Modal, Pressable, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useEffect, useState } from "react";
import { btnPrimary, btnSecondary } from "@/components/shared/ui";

type GradeOverrideSheetProps = {
  visible: boolean;
  questionLabel: string;
  maxMarks: number;
  initialMarks: number;
  initialFeedback: string;
  onClose: () => void;
  onSave: (marksEarned: number, feedback: string) => Promise<void>;
};

export default function GradeOverrideSheet({
  visible,
  questionLabel,
  maxMarks,
  initialMarks,
  initialFeedback,
  onClose,
  onSave,
}: GradeOverrideSheetProps) {
  const [marksText, setMarksText] = useState(String(initialMarks));
  const [feedback, setFeedback] = useState(initialFeedback);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      setMarksText(String(initialMarks));
      setFeedback(initialFeedback);
      setError("");
    }
  }, [visible, initialMarks, initialFeedback]);

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
      await onSave(Math.round(marks), feedback.trim());
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
        <Pressable className="rounded-t-2xl bg-cream px-4 pb-10 pt-4" onPress={(e) => e.stopPropagation()}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-line" />
          <Text className="text-base font-bold text-ink">Adjust grade</Text>
          <Text className="mt-1 text-sm text-ink-soft" numberOfLines={2}>
            {questionLabel}
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}
