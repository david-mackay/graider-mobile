import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
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
import ParsePresetPicker from "@/components/shared/ParsePresetPicker";
import {
  defaultPresetForSurface,
  type DocumentParsePreset,
} from "@/lib/parse-presets";

const DEFAULT_PROMPT = "Name two functions of the mitochondria.";
const DEFAULT_CORRECT_ANSWER =
  "Mitochondria produce ATP via cellular respiration, and they regulate cellular metabolism / signal apoptosis.";

type ParseResponse = {
  questions?: OnboardingAnswerKey[];
  truncated?: boolean;
  error?: string;
  needsPhoto?: boolean;
};

function blankKey(): OnboardingAnswerKey {
  return {
    prompt: "",
    correctAnswer: "",
    marks: 1,
    questionType: "open",
    choices: null,
  };
}

function ReadingProgressBar() {
  const translateX = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(translateX, {
        toValue: 1,
        duration: 1150,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [translateX]);

  return (
    <View className="mt-4 gap-2">
      <Text className="text-xs font-semibold text-ink-soft">Reading your answer key…</Text>
      <View className="h-1.5 overflow-hidden rounded-full bg-line">
        <Animated.View
          className="h-full w-2/5 rounded-full bg-pen"
          style={{
            transform: [
              {
                translateX: translateX.interpolate({
                  inputRange: [-1, 1],
                  outputRange: [-80, 220],
                }),
              },
            ],
          }}
        />
      </View>
    </View>
  );
}

function normalizeIncoming(raw: OnboardingAnswerKey[]): OnboardingAnswerKey[] {
  return raw.map((q) => ({
    prompt: q.prompt ?? "",
    correctAnswer: q.correctAnswer ?? "",
    marks: Number.isInteger(q.marks) && q.marks > 0 ? q.marks : 1,
    questionType: q.questionType === "mcq" ? "mcq" : "open",
    choices: Array.isArray(q.choices) ? q.choices : null,
  }));
}

export default function OnboardingAnswerKeyPage() {
  const [mode, setMode] = useState<"choose" | "manual" | "preview">("choose");
  const [keys, setKeys] = useState<OnboardingAnswerKey[]>([]);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [marks, setMarks] = useState("5");
  const [manualType, setManualType] = useState<"open" | "mcq">("open");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [parsePreset, setParsePreset] = useState<DocumentParsePreset>(() =>
    defaultPresetForSurface("answer_key_pdf"),
  );

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.ANSWER_KEY);
    void getVault().then((vault) => {
      const existing = normalizeAnswerKeys(vault);
      if (existing.length > 0) {
        setKeys(normalizeIncoming(existing));
        setMode(vault?.answerKeySource === "manual" && existing.length === 1 ? "manual" : "preview");
        if (existing.length === 1) {
          setPrompt(existing[0].prompt);
          setCorrectAnswer(existing[0].correctAnswer);
          setMarks(existing[0].marks.toString());
          setManualType(existing[0].questionType === "mcq" ? "mcq" : "open");
        }
      }
    });
  }, []);

  async function continueWithKeys(nextKeys: OnboardingAnswerKey[], source: "pdf" | "manual") {
    const cleaned = nextKeys
      .map((q) => ({
        ...q,
        prompt: q.prompt.trim(),
        correctAnswer: q.correctAnswer.trim(),
        marks: Number.isInteger(q.marks) && q.marks > 0 ? q.marks : 1,
        questionType: q.questionType === "mcq" ? ("mcq" as const) : ("open" as const),
        choices: q.questionType === "mcq" ? q.choices ?? null : null,
      }))
      .filter((q) => q.prompt && q.correctAnswer);
    if (cleaned.length === 0) {
      setError("Add at least one question with a prompt and correct answer.");
      return;
    }
    await setVault(answerKeyVaultUpdate(cleaned, source));
    router.push("/onboarding/upload");
  }

  async function handleParseResponse(res: Response) {
    const raw = await res.text();
    let payload: ParseResponse;
    try {
      payload = JSON.parse(raw) as ParseResponse;
    } catch {
      if (res.status === 413) {
        throw new Error("File is too large. Keep it under 4 MB, or add the key manually.");
      }
      throw new Error(
        "That upload didn't go through — the file may be too large or took too long. Try again or add the key manually.",
      );
    }
    const questions = normalizeIncoming(payload.questions ?? []);
    if (!res.ok) {
      if (payload.needsPhoto || questions.length === 0) {
        setKeys([blankKey()]);
        setMode("preview");
        setError(
          payload.error ??
            "We couldn't prefill from that file. Tweak the review below, or photograph the key.",
        );
        return;
      }
      throw new Error(payload.error ?? "Could not read that answer key.");
    }
    if (questions.length === 0) {
      setKeys([blankKey()]);
      setMode("preview");
      setError("Nothing found — add questions in the review below.");
      return;
    }
    setKeys(questions);
    setTruncated(Boolean(payload.truncated));
    setMode("preview");
    setError(null);
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
      setUploadName(asset.name);

      const formData = new FormData();
      appendDocumentToFormData(formData, "pdf", {
        uri: asset.uri,
        name: asset.name || "answer-key.pdf",
        mimeType: asset.mimeType || "application/pdf",
      });
      formData.append("parsePreset", parsePreset);

      const res = await fetch(resolveGraiderApiUrl("/api/onboarding/parse-answer-key"), {
        method: "POST",
        body: formData,
      });
      await handleParseResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that PDF.");
      setUploadName(null);
    } finally {
      setBusy(false);
    }
  }

  async function onPickPhotos() {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo library access is needed to upload a circled answer key.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.length) return;
      setBusy(true);
      setUploadName(
        result.assets.length === 1
          ? result.assets[0].fileName ?? "answer-key.jpg"
          : `${result.assets.length} photos`,
      );

      const formData = new FormData();
      const preset =
        parsePreset === "typed_pdf"
          ? defaultPresetForSurface("answer_key_photo")
          : parsePreset;
      if (preset !== parsePreset) setParsePreset(preset);
      result.assets.forEach((asset, index) => {
        appendDocumentToFormData(formData, "image", {
          uri: asset.uri,
          name: asset.fileName || `key-${index + 1}.jpg`,
          mimeType: asset.mimeType || "image/jpeg",
        });
      });
      formData.append("parsePreset", preset);

      const res = await fetch(resolveGraiderApiUrl("/api/onboarding/parse-answer-key"), {
        method: "POST",
        body: formData,
      });
      await handleParseResponse(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read those photos.");
      setUploadName(null);
    } finally {
      setBusy(false);
    }
  }

  function updateKey(index: number, patch: Partial<OnboardingAnswerKey>) {
    setKeys((prev) => prev.map((key, i) => (i === index ? { ...key, ...patch } : key)));
  }

  function removeKey(index: number) {
    setKeys((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [blankKey()];
    });
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
      [
        {
          prompt: trimmedPrompt,
          correctAnswer: trimmedAnswer,
          marks: marksNum,
          questionType: manualType,
          choices: null,
        },
      ],
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
              {"Upload a PDF or photo — including MCQ letter keys or circled answers. We'll prefill what we can; you tweak the review before grading."}
            </Text>
          </View>

          {(mode === "choose" || mode === "preview") && (
            <View className="gap-4">
              <View className="rounded-2xl border border-line bg-paper p-4 shadow-paper">
                <Text className="text-xs font-bold uppercase tracking-[0.18em] text-pen">
                  Recommended
                </Text>
                <Text className="mt-2 font-display text-xl font-semibold text-ink">
                  Upload your answer key
                </Text>
                <Text className="mt-2 text-sm leading-relaxed text-ink-soft">
                  PDF for typed keys, or a photo if answers are circled / the PDF is a scan.
                </Text>
                <View className="mt-4">
                  <ParsePresetPicker
                    surface="answer_key_pdf"
                    value={parsePreset}
                    onChange={setParsePreset}
                    disabled={busy}
                  />
                </View>
                <TouchableOpacity
                  onPress={() => void onPickPdf()}
                  disabled={busy}
                  className="mt-4 items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
                  style={busy ? { opacity: 0.6 } : undefined}
                >
                  <Text className="text-base font-semibold text-white">
                    {busy
                      ? "Reading…"
                      : uploadName?.endsWith(".pdf")
                        ? `Replace · ${uploadName}`
                        : "Choose PDF"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => void onPickPhotos()}
                  disabled={busy}
                  className="mt-2 items-center justify-center rounded-full border border-line bg-cream px-8 py-3.5 active:bg-cream-deep"
                  style={busy ? { opacity: 0.6 } : undefined}
                >
                  <Text className="text-base font-semibold text-pen-deep">
                    {busy ? "Reading…" : "Upload photo(s)"}
                  </Text>
                </TouchableOpacity>
                {busy ? (
                  <ReadingProgressBar />
                ) : (
                  <Text className="mt-2 text-xs text-ink-faint">
                    {"Circled answers? Photograph the marked key — circles aren't in PDF text."}
                  </Text>
                )}
              </View>

              {mode === "preview" ? (
                <View className="rounded-2xl border border-line bg-cream/60 p-4">
                  <Text className="text-sm font-semibold text-ink">
                    Review {keys.length} question{keys.length === 1 ? "" : "s"} · {totalMarks} marks
                  </Text>
                  <Text className="mt-1 text-xs text-ink-faint">
                    Prefill is a draft — fix letters, stems, and types before continuing.
                  </Text>
                  {truncated ? (
                    <Text className="mt-1 text-xs text-ink-faint">
                      Showing the first {keys.length} for this free demo.
                    </Text>
                  ) : null}
                  <View className="mt-3 gap-3">
                    {keys.map((key, index) => (
                      <View
                        key={`row-${index}`}
                        className="gap-2 rounded-xl border border-line bg-paper px-3 py-2.5"
                      >
                        <View className="flex-row flex-wrap items-center gap-2">
                          <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">
                            Q{index + 1}
                          </Text>
                          <Pressable
                            onPress={() =>
                              updateKey(index, {
                                questionType: key.questionType === "mcq" ? "open" : "mcq",
                                marks: key.questionType === "mcq" ? key.marks : 1,
                              })
                            }
                            className="rounded-full border border-line bg-cream px-2.5 py-1"
                          >
                            <Text className="text-xs font-bold text-ink-soft">
                              {key.questionType === "mcq" ? "MCQ" : "Open"}
                            </Text>
                          </Pressable>
                          <TextInput
                            value={String(key.marks)}
                            onChangeText={(text) => {
                              const next = parseInt(text, 10);
                              updateKey(index, { marks: Number.isFinite(next) && next > 0 ? next : 1 });
                            }}
                            keyboardType="numeric"
                            className="w-14 rounded-xl border border-line bg-cream px-2 py-1 text-xs text-ink"
                          />
                          <Pressable onPress={() => removeKey(index)} className="ml-auto">
                            <Text className="text-xs font-bold text-ink-faint">Remove</Text>
                          </Pressable>
                        </View>
                        <TextInput
                          value={key.prompt}
                          onChangeText={(text) => updateKey(index, { prompt: text })}
                          placeholder="Question prompt"
                          placeholderTextColor="#a3927b"
                          className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink"
                          multiline
                        />
                        <TextInput
                          value={key.correctAnswer}
                          onChangeText={(text) => updateKey(index, { correctAnswer: text })}
                          placeholder={
                            key.questionType === "mcq" ? "Correct letter (e.g. B)" : "Correct answer"
                          }
                          placeholderTextColor="#a3927b"
                          className="rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink"
                        />
                        {key.questionType === "mcq" && key.choices && key.choices.length > 0
                          ? key.choices.map((c) => (
                              <Text key={c.key} className="text-xs text-ink-soft">
                                <Text className="font-semibold text-ink">{c.key}. </Text>
                                {c.text}
                              </Text>
                            ))
                          : null}
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    onPress={() => setKeys((prev) => [...prev, blankKey()])}
                    className="mt-3 items-center py-1"
                  >
                    <Text className="text-sm font-bold text-ink-soft underline">Add question</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void continueWithKeys(keys, "pdf")}
                    className="mt-3 items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper active:bg-pen-deep"
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
                  Skip upload — type one question quickly
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {mode === "manual" ? (
            <View className="gap-4">
              <View className="rounded-xl border border-line bg-cream/60 px-3.5 py-2.5">
                <Text className="text-sm leading-relaxed text-ink-soft">
                  Quick route: one question is enough for the demo.
                </Text>
              </View>

              <View className="flex-row gap-2">
                {(["open", "mcq"] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => {
                      setManualType(type);
                      if (type === "mcq") setMarks("1");
                    }}
                    className={`rounded-full px-4 py-2 ${
                      manualType === type ? "bg-pen" : "border border-line bg-cream"
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        manualType === type ? "text-white" : "text-ink-soft"
                      }`}
                    >
                      {type === "mcq" ? "MCQ" : "Open"}
                    </Text>
                  </Pressable>
                ))}
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
                <Text className="mb-1 text-sm font-semibold text-ink">
                  {manualType === "mcq" ? "Correct letter" : "Correct answer"}
                </Text>
                <TextInput
                  value={correctAnswer}
                  onChangeText={setCorrectAnswer}
                  placeholder={manualType === "mcq" ? "B" : DEFAULT_CORRECT_ANSWER}
                  placeholderTextColor="#a3927b"
                  className={`${
                    manualType === "mcq" ? "" : "h-28 "
                  }rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink`}
                  multiline={manualType !== "mcq"}
                  numberOfLines={manualType === "mcq" ? 1 : 4}
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
                <Text className="text-sm font-bold text-ink-soft">Back to upload</Text>
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
