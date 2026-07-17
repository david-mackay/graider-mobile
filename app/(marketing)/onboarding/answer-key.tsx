import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import { ClipboardList } from "lucide-react-native";
import { getVault, setVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import {
  answerKeyVaultUpdate,
  normalizeAnswerKeys,
  type OnboardingAnswerKey,
} from "@/lib/onboarding/types";
import { resolveGraiderApiUrl } from "@/lib/graider-fetch";
import { appendDocumentToFormData } from "@/lib/picked-document";

const DEFAULT_PROMPT = "Name two functions of the mitochondria.";
const DEFAULT_CORRECT_ANSWER =
  "Mitochondria produce ATP via cellular respiration, and they regulate cellular metabolism / signal apoptosis.";

type ParseResponse = {
  questions?: OnboardingAnswerKey[];
  truncated?: boolean;
  error?: string;
};

export default function OnboardingAnswerKeyPage() {
  const [mode, setMode] = useState<"choose" | "manual" | "preview">("choose");
  const [keys, setKeys] = useState<OnboardingAnswerKey[]>([]);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [marks, setMarks] = useState("5");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.ANSWER_KEY);
    void getVault().then((vault) => {
      const existing = normalizeAnswerKeys(vault);
      if (existing.length > 0) {
        setKeys(existing);
        setMode(vault?.answerKeySource === "manual" && existing.length === 1 ? "manual" : "preview");
        if (existing.length === 1) {
          setPrompt(existing[0].prompt);
          setCorrectAnswer(existing[0].correctAnswer);
          setMarks(existing[0].marks.toString());
        }
      }
    });
  }, []);

  async function continueWithKeys(nextKeys: OnboardingAnswerKey[], source: "pdf" | "manual") {
    await setVault(answerKeyVaultUpdate(nextKeys, source));
    router.push("/onboarding/upload");
  }

  async function onPickPdf() {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setBusy(true);
      setPdfName(asset.name);

      const formData = new FormData();
      appendDocumentToFormData(formData, "pdf", {
        uri: asset.uri,
        name: asset.name || "answer-key.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });

      const res = await fetch(resolveGraiderApiUrl("/api/onboarding/parse-answer-key"), {
        method: "POST",
        body: formData,
      });
      const payload = (await res.json()) as ParseResponse;
      if (!res.ok) {
        throw new Error(payload.error ?? "Could not read that PDF.");
      }
      const questions = payload.questions ?? [];
      if (questions.length === 0) {
        throw new Error("No questions found in that PDF.");
      }
      setKeys(questions);
      setTruncated(Boolean(payload.truncated));
      setMode("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that PDF.");
      setPdfName(null);
    } finally {
      setBusy(false);
    }
  }

  async function onManualSubmit() {
    setError(null);
    const trimmedPrompt = prompt.trim();
    const trimmedAnswer = correctAnswer.trim();
    const marksNum = parseInt(marks, 10);

    if (!trimmedPrompt) {
      setError("Add a question prompt so Graider knows what to grade.");
      return;
    }
    if (!trimmedAnswer) {
      setError("Add the correct answer so Graider has something to compare against.");
      return;
    }
    if (isNaN(marksNum) || marksNum <= 0) {
      setError("Marks must be a positive whole number.");
      return;
    }

    await continueWithKeys(
      [{ prompt: trimmedPrompt, correctAnswer: trimmedAnswer, marks: marksNum }],
      "manual",
    );
  }

  const totalMarks = keys.reduce((sum, key) => sum + key.marks, 0);

  return (
    <OnboardingShell step={3} backHref="/onboarding/capabilities">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View className="mb-6 items-center">
            <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper">
              <ClipboardList size={32} color="white" />
            </View>
            <Text className="text-center font-display text-3xl font-semibold tracking-tight text-ink">
              Bring the answer key you already trust.
            </Text>
            <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
              Upload the full PDF — the same way you would in the app — or type one question if you
              just want a quick taste.
            </Text>
          </View>

          {(mode === "choose" || mode === "preview") && (
            <View className="gap-4">
              <View className="rounded-2xl border border-line bg-paper p-4 shadow-paper">
                <Text className="text-xs font-bold uppercase tracking-[0.18em] text-pen">
                  Recommended
                </Text>
                <Text className="mt-2 font-display text-xl font-semibold text-ink">
                  Upload your answer key PDF
                </Text>
                <Text className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Drop in the key for this test. Graider extracts prompts, model answers, and marks —
                  then you photograph student papers against your rubric.
                </Text>
                <TouchableOpacity
                  onPress={() => void onPickPdf()}
                  disabled={busy}
                  className="mt-4 items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      {pdfName ? `Replace · ${pdfName}` : "Choose PDF answer key"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {mode === "preview" && keys.length > 0 ? (
                <View className="rounded-2xl border border-line bg-cream/60 p-4">
                  <Text className="text-sm font-semibold text-ink">
                    Found {keys.length} question{keys.length === 1 ? "" : "s"} · {totalMarks} marks
                  </Text>
                  {truncated ? (
                    <Text className="mt-1 text-xs text-ink-faint">
                      Showing the first {keys.length} for this free demo.
                    </Text>
                  ) : null}
                  <View className="mt-3 gap-3">
                    {keys.map((key, index) => (
                      <View
                        key={`${index}-${key.prompt.slice(0, 24)}`}
                        className="rounded-xl border border-line bg-paper px-3 py-2.5"
                      >
                        <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                          Q{index + 1} · {key.marks} mark{key.marks === 1 ? "" : "s"}
                        </Text>
                        <Text className="mt-1 text-sm font-semibold text-ink" numberOfLines={2}>
                          {key.prompt}
                        </Text>
                        <Text className="mt-1 text-xs leading-relaxed text-ink-soft" numberOfLines={2}>
                          Key: {key.correctAnswer}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => void continueWithKeys(keys, "pdf")}
                    className="mt-4 items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
                  >
                    <Text className="text-base font-semibold text-white">
                      Grade a student paper with this key
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  setMode("manual");
                  setError(null);
                }}
                className="items-center py-2"
              >
                <Text className="text-sm font-bold text-ink-soft underline decoration-line">
                  Skip PDF — type one question quickly
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "manual" ? (
            <View className="gap-4">
              <View className="rounded-xl border border-line bg-cream/60 px-3.5 py-2.5">
                <Text className="text-sm leading-relaxed text-ink-soft">
                  Quick route: one question is enough for the demo. You can import a full PDF after
                  you sign up.
                </Text>
              </View>

              <View>
                <Text className="mb-1 text-sm font-semibold text-ink">Question prompt</Text>
                <TextInput
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder={DEFAULT_PROMPT}
                  placeholderTextColor="#a3927b"
                  className="rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View>
                <Text className="mb-1 text-sm font-semibold text-ink">Correct answer</Text>
                <TextInput
                  value={correctAnswer}
                  onChangeText={setCorrectAnswer}
                  placeholder={DEFAULT_CORRECT_ANSWER}
                  placeholderTextColor="#a3927b"
                  className="h-28 rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View>
                <Text className="mb-1 text-sm font-semibold text-ink">Marks</Text>
                <TextInput
                  value={marks}
                  onChangeText={setMarks}
                  keyboardType="numeric"
                  className="w-32 rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink"
                />
              </View>

              <TouchableOpacity
                onPress={() => void onManualSubmit()}
                className="mt-2 items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
              >
                <Text className="text-base font-semibold text-white">Continue to student paper</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMode("choose");
                  setError(null);
                }}
                className="items-center py-2"
              >
                <Text className="text-sm font-bold text-ink-soft">Back to PDF upload</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {error ? (
            <View className="mt-4 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
              <Text className="text-sm text-pen-deep">{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </OnboardingShell>
  );
}
