import { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import SocialProofCard from "@/components/marketing/SocialProofCard";
import { Sparkles } from "lucide-react-native";
import { getResumeStep, getVault, setVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import {
  hasAnswerKey,
  normalizeAnswerKeys,
  type OnboardingSampleGrade,
} from "@/lib/onboarding/types";

type ResultState =
  | { kind: "loading" }
  | { kind: "ready"; grade: OnboardingSampleGrade }
  | { kind: "soft-fail"; grade: OnboardingSampleGrade }
  | { kind: "rate-limited"; message: string }
  | { kind: "error"; message: string };

export default function OnboardingResultPage() {
  const [state, setState] = useState<ResultState>({ kind: "loading" });
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    fireEvent(ONBOARDING_EVENTS.FIRST_GRADE_RENDERED);

    getVault().then((vault) => {
      if (!vault) {
        router.replace("/onboarding/hook");
        return;
      }

      const step = getResumeStep(vault);
      if (step !== "result" && step !== "save" && step !== "completed") {
        router.replace(`/onboarding/${step}`);
        return;
      }

      if (vault.sampleGrade) {
        const isSoftFail = vault.sampleGrade.marksEarned === 0 && vault.sampleGrade.ocrAnswerText === "";
        setState({ kind: isSoftFail ? "soft-fail" : "ready", grade: vault.sampleGrade as any });
        return;
      }

      if (!hasAnswerKey(vault) || !vault.studentPaper) {
        console.warn("[result] Missing answer key or studentPaper in vault, redirecting to upload");
        router.replace("/onboarding/upload");
        return;
      }

      const answerKeys = normalizeAnswerKeys(vault);
      const { studentPaper } = vault;

      // Check for required fields
      if (!studentPaper.fileUri && !studentPaper.base64) {
        console.warn("[result] studentPaper has no fileUri or base64");
        router.replace("/onboarding/upload");
        return;
      }

      const formData = new FormData();

      // React Native FormData accepts { uri, name, type } for file uploads
      // Prefer fileUri (local file path) over base64 for better performance
      if (studentPaper.fileUri) {
        formData.append("image", {
          uri: studentPaper.fileUri,
          name: studentPaper.filename || "paper.jpg",
          type: studentPaper.mimeType || "image/jpeg",
        } as any);
      } else if (studentPaper.base64) {
        // Fallback: construct a data URI and use it as the file URI
        const dataUri = `data:${studentPaper.mimeType};base64,${studentPaper.base64}`;
        formData.append("image", {
          uri: dataUri,
          name: studentPaper.filename || "paper.jpg",
          type: studentPaper.mimeType || "image/jpeg",
        } as any);
      }

      formData.append("answerKeys", JSON.stringify(answerKeys));
      formData.append(
        "answerKey",
        JSON.stringify({
          prompt: answerKeys[0].prompt,
          correctAnswer: answerKeys[0].correctAnswer,
          marks: answerKeys[0].marks,
        }),
      );

      const apiBase = process.env.EXPO_PUBLIC_APP_URL;
      if (!apiBase) {
        setState({
          kind: "error",
          message: "Missing EXPO_PUBLIC_APP_URL — add it in .env for this build.",
        });
        return;
      }
      // Use URL() so a trailing slash on EXPO_PUBLIC_APP_URL does not produce "//api/..."
      // (Vercel 308-redirects that path; RN multipart POST + redirect can hang or fail).
      const sampleGradeUrl = new URL("/api/onboarding/sample-grade", apiBase).href;
      console.log("[result] Submitting to:", sampleGradeUrl);

      fetch(sampleGradeUrl, {
        method: "POST",
        body: formData,
      })
      .then(async (res) => {
        if (res.status === 429) {
          setState({
            kind: "rate-limited",
            message: "We've hit our free demo quota. Sign up for unlimited grading.",
          });
          return;
        }
        const payload = await res.json();
        if (!res.ok) {
          setState({
            kind: "error",
            message: payload.error ?? "We're having trouble grading right now — please try again.",
          });
          return;
        }
        const grade: OnboardingSampleGrade = {
          marksEarned: payload.marksEarned,
          maxMarks: payload.maxMarks,
          feedback: payload.feedback,
          ocrAnswerText: payload.ocrAnswerText,
          questions: payload.questions,
        };
        await setVault({ sampleGrade: grade, completedAt: new Date().toISOString() });
        const isSoftFail = grade.marksEarned === 0 && grade.ocrAnswerText === "";
        setState({ kind: isSoftFail ? "soft-fail" : "ready", grade });
      })
      .catch((err) => {
        console.error('[result] fetch error:', err);
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "We're having trouble grading right now — please try again.",
        });
      });
    });
  }, []);

  return (
    <OnboardingShell step={5} backHref="/onboarding/upload" backLabel="Re-upload">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="items-center mb-6">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-pen shadow-paper shadow-paper">
            <Sparkles size={32} color="white" />
          </View>
          <Text className="text-center text-3xl font-semibold tracking-tight text-ink">
            Sample grade — your first paper
          </Text>
        </View>

        <View className="gap-5">
          {state.kind === "loading" ? (
            <View className="rounded-2xl border border-line bg-paper py-12 items-center shadow-paper shadow-paper">
              <ActivityIndicator size="large" color="#be3a2e" className="mb-4" />
              <Text className="text-sm font-medium text-ink-faint">
                Reading your student's handwriting...
              </Text>
            </View>
          ) : null}

          {(state.kind === "ready" || state.kind === "soft-fail") ? (
            <View className="rounded-2xl border border-line bg-paper p-5 shadow-paper shadow-paper">
              <View className="items-center">
                <View className="flex-row items-baseline gap-1">
                  <Text className="text-5xl font-semibold text-pen">{state.grade.marksEarned}</Text>
                  <Text className="text-xl font-semibold text-ink-faint">/ {state.grade.maxMarks}</Text>
                </View>
                {state.grade.feedback ? (
                  <Text className="mt-3 text-center text-sm leading-relaxed text-ink">
                    {state.grade.feedback}
                  </Text>
                ) : null}
              </View>

              {state.grade.questions && state.grade.questions.length > 1 ? (
                <View className="mt-5 gap-3 border-t border-line pt-4">
                  <Text className="text-xs font-bold uppercase tracking-[0.18em] text-ink-faint">
                    Per question
                  </Text>
                  {state.grade.questions.map((q, index) => (
                    <View
                      key={`${index}-${q.prompt.slice(0, 20)}`}
                      className="rounded-xl border border-line bg-cream px-3 py-2.5"
                    >
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-ink" numberOfLines={2}>
                          Q{index + 1}. {q.prompt}
                        </Text>
                        <Text className="font-hand text-lg font-bold text-pen">
                          {q.marksEarned}/{q.maxMarks}
                        </Text>
                      </View>
                      {q.feedback ? (
                        <Text className="mt-1 text-xs leading-relaxed text-ink-soft">{q.feedback}</Text>
                      ) : null}
                    </View>
                  ))}
                </View>
              ) : null}

              {state.grade.ocrAnswerText ? (
                <View className="mt-5 border-t border-line pt-4">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">What we read</Text>
                  <View className="mt-2 rounded-md border border-line bg-cream/40 p-3">
                    <Text className="text-xs leading-relaxed text-ink">
                      {state.grade.ocrAnswerText}
                    </Text>
                  </View>
                </View>
              ) : null}

              {state.kind === "soft-fail" ? (
                <View className="mt-4 rounded-lg border border-marigold/30 bg-marigold-wash px-3 py-2">
                  <Text className="text-xs text-marigold-deep">
                    We couldn't read the answer clearly. Try a clearer photo for a real grade, or continue anyway.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {state.kind === "rate-limited" ? (
            <View className="rounded-2xl border border-marigold/30 bg-marigold-wash/40 p-5">
              <Text className="text-sm font-semibold text-marigold-deep">{state.message}</Text>
              <Text className="mt-1 text-xs text-marigold-deep">Sign up to keep grading without limits.</Text>
            </View>
          ) : null}

          {state.kind === "error" ? (
            <View className="rounded-2xl border border-pen-soft/60 bg-pen-wash/40 p-5">
              <Text className="text-sm font-semibold text-pen-deep">Something went wrong</Text>
              <Text className="mt-1 text-xs text-pen-deep">{state.message}</Text>
              <View className="mt-4 flex-row gap-2">
                <TouchableOpacity onPress={() => router.push("/onboarding/upload")} className="flex-1 items-center justify-center rounded-2xl bg-paper border border-line py-3">
                  <Text className="text-xs font-semibold text-ink">Try clearer photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push("/onboarding/save")} className="flex-1 items-center justify-center rounded-full bg-pen py-3">
                  <Text className="text-xs font-semibold text-white">Continue anyway</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {state.kind !== "loading" && state.kind !== "error" ? (
            <SocialProofCard />
          ) : null}

          {state.kind === "ready" || state.kind === "soft-fail" ? (
            <View className="mt-4 items-center">
              <TouchableOpacity
                onPress={() => router.push("/onboarding/save")}
                className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
              >
                <Text className="text-base font-semibold text-white">Save my first graded test</Text>
              </TouchableOpacity>
              <Text className="mt-3 text-center text-xs text-ink-faint">
                Re-uploading will rerun the demo grade.
              </Text>
            </View>
          ) : null}

          {state.kind === "rate-limited" ? (
            <View className="mt-4 items-center">
              <TouchableOpacity
                onPress={() => router.push("/onboarding/save")}
                className="w-full items-center justify-center rounded-full bg-pen px-8 py-4 shadow-paper shadow-paper active:bg-pen-deep"
              >
                <Text className="text-base font-semibold text-white">Sign up to keep grading</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </OnboardingShell>
  );
}
