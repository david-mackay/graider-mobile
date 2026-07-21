import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { btnPrimary, btnSecondary, Card, SettingSwitchRow } from "@/components/shared/ui";
import type { GradedAttemptDetail } from "@/lib/dashboard-types";
import { generateAttemptPdf, sharePdfFile } from "@/lib/export-grade-pdf";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";

type ExportGradePdfButtonProps = {
  attempt?: GradedAttemptDetail | null;
  attemptId?: string;
  studentName?: string | null;
  fetchAttempt?: (attemptId: string) => Promise<GradedAttemptDetail>;
  label?: string;
  compact?: boolean;
};

type ModalStep = "options" | "preview";

export default function ExportGradePdfButton({
  attempt,
  attemptId,
  studentName,
  fetchAttempt,
  label = "Export PDF",
  compact = false,
}: ExportGradePdfButtonProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<ModalStep>("options");
  const [includeGrade, setIncludeGrade] = useState(true);
  const [includeFeedback, setIncludeFeedback] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewAttempt, setPreviewAttempt] = useState<GradedAttemptDetail | null>(null);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  function resetState() {
    setStep("options");
    setBusy(false);
    setError(null);
    setPreviewAttempt(null);
    setPdfUri(null);
    setPdfFilename(null);
  }

  function closeModal() {
    setVisible(false);
    resetState();
  }

  function openModal() {
    resetState();
    setVisible(true);
  }

  // iOS shareAsync can hang after Print — clear loading when returning to the app.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setBusy(false);
      }
    });
    return () => subscription.remove();
  }, []);

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const options = { includeGrade, includeFeedback, studentName };
      let detail = attempt ?? null;
      if (!detail && attemptId && fetchAttempt) {
        detail = await fetchAttempt(attemptId);
      }
      if (!detail) {
        throw new Error("Missing graded paper details.");
      }

      const file = await generateAttemptPdf(detail, options);
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error("Sharing is not available on this device.");
      }

      setPreviewAttempt(detail);
      setPdfUri(file.uri);
      setPdfFilename(file.filename);
      setStep("preview");
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not generate PDF.");
      setBusy(false);
    }
  }

  async function handleOpenPreview() {
    if (!pdfUri) return;
    try {
      const canOpen = await Linking.canOpenURL(pdfUri);
      if (!canOpen) {
        setError("Could not open PDF preview on this device.");
        return;
      }
      await Linking.openURL(pdfUri);
    } catch {
      setError("Could not open PDF preview on this device.");
    }
  }

  function handleShare() {
    if (!pdfUri || !pdfFilename) return;
    setBusy(false);
    sharePdfFile(pdfUri, pdfFilename);
  }

  const displayName =
    studentName?.trim() ||
    previewAttempt?.student_name?.trim() ||
    "this student";

  return (
    <>
      <TouchableOpacity
        onPress={openModal}
        className={compact ? "rounded-full border border-line bg-paper px-3 py-1.5" : `${btnSecondary} items-center`}
      >
        <Text className={`font-medium text-pen-deep ${compact ? "text-xs" : "text-sm"}`}>{label}</Text>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-ink/40">
          <View className="max-h-[90%] rounded-t-3xl bg-paper px-5 pb-8 pt-6">
            {step === "options" ? (
              <>
                <Text className="font-display text-xl font-semibold text-ink">Send graded paper</Text>
                <Text className="mt-1 text-sm text-ink-soft">
                  Choose what to include, then preview before sharing with {displayName}.
                </Text>

                <Card className="mt-4 border-line bg-cream/40">
                  <SettingSwitchRow
                    label="Include overall grade"
                    value={includeGrade}
                    onValueChange={setIncludeGrade}
                    disabled={busy}
                  />
                  <SettingSwitchRow
                    label="Include feedback"
                    value={includeFeedback}
                    onValueChange={setIncludeFeedback}
                    disabled={busy}
                  />
                </Card>

                {error ? (
                  <View className="mt-3 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
                    <Text className="text-sm text-pen-deep">{error}</Text>
                  </View>
                ) : null}

                <View className="mt-5 gap-3">
                  <TouchableOpacity
                    onPress={() => void handleGenerate()}
                    disabled={busy}
                    className={`${btnPrimary} items-center py-3.5`}
                  >
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text className="text-sm font-semibold text-white">Generate PDF</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={closeModal} className={`${btnSecondary} items-center py-3`}>
                    <Text className="text-sm font-medium text-pen-deep">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text className="font-display text-xl font-semibold text-ink">Preview PDF</Text>
                <Text className="mt-1 text-sm text-ink-soft">
                  Review the graded paper, then share with the system share sheet.
                </Text>

                <ScrollView className="mt-4 max-h-96" contentContainerStyle={{ paddingBottom: 8 }}>
                  <Card className="border-line bg-cream/30">
                    <Text className="mt-1 text-lg font-semibold text-ink">
                      {previewAttempt?.test_title ?? "Graded paper"}
                    </Text>
                    <Text className="mt-1 text-sm text-ink-soft">{displayName}</Text>
                    {includeGrade &&
                    previewAttempt?.total_marks != null &&
                    previewAttempt?.max_marks != null ? (
                      <Text className="mt-3 text-2xl font-bold text-pen">
                        {previewAttempt.total_marks}
                        <Text className="text-sm font-normal text-ink-faint">
                          {" "}
                          / {previewAttempt.max_marks}
                        </Text>
                      </Text>
                    ) : null}

                    <View className="mt-4 gap-2">
                      {(previewAttempt?.questions ?? []).map((question, index) => (
                        <View
                          key={question.question_id}
                          className="rounded-xl border border-line bg-paper px-3 py-2.5"
                        >
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                              Question {index + 1}
                            </Text>
                            {includeGrade && question.marks_earned != null ? (
                              <Text className="text-sm font-bold text-pen-deep">
                                {question.marks_earned}/{question.marks}
                              </Text>
                            ) : null}
                          </View>
                          <Text className="mt-1 text-sm text-ink">{question.prompt}</Text>
                          <Text className="mt-2 text-sm text-ink-soft">
                            Answer: {question.student_answer || "—"}
                          </Text>
                          {includeFeedback && question.feedback ? (
                            <Text className="mt-2 text-xs text-moss-deep">{question.feedback}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </Card>
                </ScrollView>

                {error ? (
                  <View className="mt-3 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
                    <Text className="text-sm text-pen-deep">{error}</Text>
                  </View>
                ) : null}

                <View className="mt-4 gap-3">
                  <TouchableOpacity
                    onPress={handleShare}
                    className={`${btnPrimary} items-center py-3.5`}
                  >
                    <Text className="text-sm font-semibold text-white">Share PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleOpenPreview()}
                    className={`${btnSecondary} items-center py-3`}
                  >
                    <Text className="text-sm font-medium text-pen-deep">Open full PDF</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setStep("options");
                      setError(null);
                    }}
                    className="items-center py-2"
                  >
                    <Text className="text-sm font-medium text-ink-soft">Back to options</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
