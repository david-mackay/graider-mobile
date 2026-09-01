import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import StepCapturePages from "@/components/teacher/grade-wizard/StepCapturePages";
import { getVault, setVault } from "@/lib/onboarding/vault";
import { ONBOARDING_EVENTS, fireEvent } from "@/lib/onboarding/funnel-events";
import {
  ONBOARDING_MAX_STUDENTS,
  hasAnswerKey,
  normalizeAnswerKeys,
  normalizeRoster,
  type OnboardingAnswerKey,
  type OnboardingPaper,
  type OnboardingSampleGrade,
  type OnboardingStudentSubmission,
} from "@/lib/onboarding/types";
import { appendImageToFormData, isPdfPage, type PickedImage } from "@/lib/picked-image";
import { X } from "lucide-react-native";
import DeterminateProgressBar from "@/components/shared/DeterminateProgressBar";
import {
  postFormDataWithProgress,
  resultFromProgressHttp,
} from "@/lib/upload-progress";
import { UNIFIED_PARSE_PRESET } from "@/lib/parse-presets";

function papersToPickedImages(papers: OnboardingPaper[]): PickedImage[] {
  return papers
    .filter((p) => !!p.fileUri)
    .map((p) => ({
      uri: p.fileUri!,
      name: p.filename || "page.jpg",
      type: p.mimeType || "image/jpeg",
      size: 0,
    }));
}

function fileExtension(page: PickedImage): string {
  if (isPdfPage(page)) return "pdf";
  const match = page.name.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function isGraded(student: OnboardingStudentSubmission): boolean {
  return (
    !!student.grade &&
    Number.isInteger(student.grade.marksEarned) &&
    Number.isInteger(student.grade.maxMarks)
  );
}

export default function OnboardingUploadPage() {
  const [keys, setKeys] = useState<OnboardingAnswerKey[]>([]);
  const [students, setStudents] = useState<OnboardingStudentSubmission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [phase, setPhase] = useState<"summary" | "capture">("summary");
  const [mode, setMode] = useState<"photo" | "typed">("photo");
  const [name, setName] = useState("Student 1");
  const [pendingPages, setPendingPages] = useState<PickedImage[]>([]);
  const [typedAnswers, setTypedAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [gradingStudentId, setGradingStudentId] = useState<string | null>(null);
  const [workProgress, setWorkProgress] = useState<{ percent: number; label: string } | null>(
    null,
  );

  useEffect(() => {
    fireEvent(ONBOARDING_EVENTS.PAPER_UPLOAD);
    void getVault().then((vault) => {
      if (!hasAnswerKey(vault)) {
        router.replace("/onboarding/answer-key");
        return;
      }
      const nextKeys = normalizeAnswerKeys(vault);
      const roster = normalizeRoster(vault);
      setKeys(nextKeys);
      setStudents(roster);
      setName(`Student ${roster.length + 1}`);
      setTypedAnswers(nextKeys.map(() => ""));
      if (roster.length === 0) {
        setPhase("capture");
      }
    });
  }, []);

  function onAddPage(page: PickedImage) {
    setPendingPages((prev) => [...prev, page]);
  }

  function onRemovePage(index: number) {
    setPendingPages((prev) => prev.filter((_, i) => i !== index));
  }

  function onMovePage(from: number, to: number) {
    if (to < 0 || to >= pendingPages.length) return;
    setPendingPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onDoneCapturing() {
    void saveStudent();
  }

  function onBackFromCapture() {
    if (!editingId && pendingPages.length === 0 && students.length === 0) {
      setPhase("summary");
      return;
    }
    setPhase("summary");
  }

  function resetCaptureForm(nextStudents: OnboardingStudentSubmission[]) {
    setEditingId(null);
    setPendingPages([]);
    setMode("photo");
    setTypedAnswers(keys.map(() => ""));
    setName(`Student ${nextStudents.length + 1}`);
    setError(null);
    setPhase("summary");
  }

  function startEdit(student: OnboardingStudentSubmission) {
    setEditingId(student.id);
    setName(student.name);
    setMode(student.source);
    setError(null);
    setPhase("capture");
    if (student.source === "typed") {
      setTypedAnswers(keys.map((_, i) => student.typedAnswers?.[i] ?? ""));
      setPendingPages([]);
    } else {
      setTypedAnswers(keys.map(() => ""));
      setPendingPages(papersToPickedImages(student.papers ?? []));
    }
  }

  const apiBase = process.env.EXPO_PUBLIC_APP_URL;

  /** Persist the open form into the roster. Returns the updated list, or null on validation error. */
  async function commitCurrentForm(): Promise<OnboardingStudentSubmission[] | null> {
    const trimmedName =
      name.trim() ||
      (editingId
        ? students.find((s) => s.id === editingId)?.name ?? "Student"
        : `Student ${students.length + 1}`);
    setError(null);

    let submission: Pick<
      OnboardingStudentSubmission,
      "source" | "papers" | "typedAnswers" | "parsePreset"
    >;

    if (mode === "photo") {
      if (pendingPages.length === 0) {
        setError("Add at least one photo or PDF.");
        return null;
      }
      const destDir = `${FileSystem.documentDirectory}onboarding/`;
      const dirInfo = await FileSystem.getInfoAsync(destDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      }
      const papers: OnboardingPaper[] = [];
      for (let i = 0; i < pendingPages.length; i++) {
        const page = pendingPages[i];
        // Reuse existing onboarding path if already persisted; otherwise copy in.
        const alreadyPersisted = page.uri.startsWith(destDir);
        let destPath = page.uri;
        if (!alreadyPersisted) {
          destPath = `${destDir}student_${Date.now()}_p${i + 1}.${fileExtension(page)}`;
          await FileSystem.copyAsync({ from: page.uri, to: destPath });
        }
        papers.push({
          mimeType: isPdfPage(page) ? "application/pdf" : page.type || "image/jpeg",
          base64: "",
          fileUri: destPath,
          filename: page.name,
        });
      }
      submission = { source: "photo", papers, parsePreset: UNIFIED_PARSE_PRESET };
    } else {
      const trimmed = typedAnswers.map((a) => a.trim());
      if (!trimmed.some((a) => a.length > 0)) {
        setError("Type at least one answer.");
        return null;
      }
      submission = { source: "typed", typedAnswers: trimmed };
    }

    if (editingId) {
      return students.map((s) =>
        s.id === editingId
          ? { ...s, name: trimmedName, ...submission, grade: undefined }
          : s,
      );
    }
    return [...students, { id: `${Date.now()}`, name: trimmedName, ...submission }];
  }

  async function saveStudent() {
    const nextStudents = await commitCurrentForm();
    if (!nextStudents) return;
    setStudents(nextStudents);
    await setVault({ students: nextStudents, completedAt: undefined });
    resetCaptureForm(nextStudents);
  }

  async function removeStudent(id: string) {
    const nextStudents = students.filter((s) => s.id !== id);
    setStudents(nextStudents);
    await setVault({ students: nextStudents, completedAt: undefined });
    if (editingId === id) {
      resetCaptureForm(nextStudents);
    } else {
      setName(`Student ${nextStudents.length + 1}`);
    }
  }

  async function gradeOne(
    student: OnboardingStudentSubmission,
    onProgress: (progress: { percent: number; label: string }) => void,
  ): Promise<OnboardingSampleGrade> {
    if (!apiBase) throw new Error("Missing EXPO_PUBLIC_APP_URL.");

    const formData = new FormData();
    formData.append("answerKeys", JSON.stringify(keys));
    formData.append(
      "answerKey",
      JSON.stringify({
        prompt: keys[0].prompt,
        correctAnswer: keys[0].correctAnswer,
        marks: keys[0].marks,
      }),
    );

    if (student.source === "typed" && student.typedAnswers) {
      formData.append("typedAnswers", JSON.stringify(student.typedAnswers));
    } else if (student.papers?.length) {
      formData.append(
        "parsePreset",
        UNIFIED_PARSE_PRESET,
      );
      for (const paper of student.papers) {
        const uri = paper.fileUri;
        if (!uri) throw new Error(`Missing photo for ${student.name}.`);
        appendImageToFormData(formData, "image", {
          uri,
          name: paper.filename,
          type: paper.mimeType || "image/jpeg",
          size: 0,
        });
      }
    } else {
      throw new Error(`No answers for ${student.name}.`);
    }

    const sampleGradeUrl = new URL("/api/onboarding/sample-grade", apiBase).href;
    const http = await postFormDataWithProgress({
      url: sampleGradeUrl,
      formData,
      onProgress,
    });
    const { status, payload } = resultFromProgressHttp(http);
    if (status === 429) throw new Error("RATE_LIMITED");
    if (status < 200 || status >= 300) {
      throw new Error(
        (typeof payload.error === "string" && payload.error) || `Couldn't grade ${student.name}.`,
      );
    }
    return {
      marksEarned: Number(payload.marksEarned),
      maxMarks: Number(payload.maxMarks),
      feedback: String(payload.feedback ?? ""),
      ocrAnswerText:
        typeof payload.ocrAnswerText === "string" ? payload.ocrAnswerText : undefined,
      questions: payload.questions as OnboardingSampleGrade["questions"],
    };
  }

  async function gradeStudent(student: OnboardingStudentSubmission) {
    if (!apiBase) {
      setError("Missing EXPO_PUBLIC_APP_URL — add it in .env for this build.");
      return;
    }
    if (rateLimited || isBusy) return;

    setError(null);
    setIsBusy(true);
    setGradingStudentId(student.id);
    const label = `Grading ${student.name}`;
    setWorkProgress({ percent: 0, label });
    try {
      const grade = await gradeOne(student, (progress) => {
        setWorkProgress({
          percent: progress.percent,
          label: progress.label ? `${label} · ${progress.label}` : label,
        });
      });
      const next = students.map((entry) =>
        entry.id === student.id ? { ...entry, grade } : entry,
      );
      setStudents(next);
      await setVault({
        students: next,
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMITED") {
        setRateLimited(true);
      } else {
        console.error("[upload] gradeStudent error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "We're having trouble grading right now — please try again.",
        );
      }
    } finally {
      setIsBusy(false);
      setGradingStudentId(null);
      setWorkProgress(null);
    }
  }

  function startNewStudent() {
    if (students.length >= ONBOARDING_MAX_STUDENTS || isBusy) return;
    setEditingId(null);
    setPendingPages([]);
    setMode("photo");
    setTypedAnswers(keys.map(() => ""));
    setName(`Student ${students.length + 1}`);
    setError(null);
    setPhase("capture");
  }

  const atCap = students.length >= ONBOARDING_MAX_STUDENTS;
  const gradedCount = students.filter(isGraded).length;

  if (phase === "capture") {
    return (
      <SafeAreaView className="flex-1 bg-cream px-4 pt-4">
        {mode === "typed" ? (
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <TouchableOpacity onPress={onBackFromCapture} className="mb-4">
              <Text className="text-sm font-medium text-ink-soft">Back</Text>
            </TouchableOpacity>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Student name"
              placeholderTextColor="#a3927b"
              className="mb-4 rounded-2xl border border-line bg-paper px-4 py-3 text-base font-semibold text-ink"
            />
            {keys.map((key, index) => (
              <View key={`${index}-${key.prompt.slice(0, 24)}`} className="mb-4 gap-1.5">
                <Text className="text-sm font-semibold text-ink">
                  {keys.length === 1 ? "Student answer" : `Answer for Q${index + 1}`}
                </Text>
                <Text className="text-xs text-ink-faint" numberOfLines={2}>
                  {key.prompt}
                </Text>
                <TextInput
                  value={typedAnswers[index] ?? ""}
                  onChangeText={(text) => {
                    const next = [...typedAnswers];
                    next[index] = text;
                    setTypedAnswers(next);
                  }}
                  multiline
                  placeholderTextColor="#9ca3af"
                  className="min-h-[72px] rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
                  textAlignVertical="top"
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => void saveStudent()}
              className="items-center rounded-full bg-pen py-4"
            >
              <Text className="text-base font-bold text-white">Done</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <StepCapturePages
            studentName={name.trim() || `Student ${students.length + 1}`}
            onStudentNameChange={setName}
            pages={pendingPages}
            onAddPage={onAddPage}
            onRemovePage={onRemovePage}
            onMovePage={onMovePage}
            onDone={onDoneCapturing}
            onBack={onBackFromCapture}
            errorMessage={error ?? ""}
            doneLabel={`Done with ${name.trim() || "this student"}`}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <OnboardingShell step={4} backHref="/onboarding/answer-key">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="items-center">
          <Text className="text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Capture papers, then grade each student.
          </Text>
          <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
            Same flow as the full app: add pages or a PDF, preview, then send that student off to
            grade. Up to {ONBOARDING_MAX_STUDENTS} students in this demo.
          </Text>
        </View>

        {students.length > 0 ? (
          <View className="mt-8 gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {students.length}/{ONBOARDING_MAX_STUDENTS} student{students.length === 1 ? "" : "s"}
            </Text>
            {students.map((s) => {
              const gradingThis = gradingStudentId === s.id;
              const graded = isGraded(s);
              const pageCount = s.source === "photo" ? (s.papers?.length ?? 0) : 0;
              return (
                <View
                  key={s.id}
                  className="rounded-2xl border border-line bg-paper px-4 py-3 shadow-paper"
                >
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => startEdit(s)}
                      disabled={isBusy}
                      className="min-w-0 flex-1 flex-row items-center"
                    >
                      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
                        <Text className="text-sm font-bold text-pen-deep">
                          {s.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
                          {s.name}
                        </Text>
                        <Text className="text-xs text-ink-soft">
                          {s.source === "photo"
                            ? `${pageCount} page${pageCount === 1 ? "" : "s"} · tap to preview`
                            : "Typed · tap to edit"}
                          {graded
                            ? ` · ${s.grade!.marksEarned}/${s.grade!.maxMarks}`
                            : ""}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => void removeStudent(s.id)}
                      disabled={isBusy}
                      className="ml-2 rounded-full bg-pen-wash p-2"
                    >
                      <X size={16} color="#be3a2e" />
                    </TouchableOpacity>
                  </View>
                  {gradingThis && workProgress ? (
                    <DeterminateProgressBar
                      className="mt-3"
                      percent={workProgress.percent}
                      label={workProgress.label}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => void gradeStudent(s)}
                      disabled={isBusy || rateLimited}
                      className={`mt-3 items-center rounded-full py-3 ${
                        graded ? "border border-line bg-cream" : "bg-pen"
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${graded ? "text-pen-deep" : "text-white"}`}
                      >
                        {graded ? "Grade again" : "Grade this student"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <View className="mt-8 rounded-2xl border border-dashed border-line bg-paper p-5">
            <Text className="text-sm font-semibold text-ink">No papers yet</Text>
            <Text className="mt-1 text-xs text-ink-faint">
              Capture photos or a PDF for the first student, then grade them on their own.
            </Text>
          </View>
        )}

        {atCap ? (
          <View className="mt-4 rounded-2xl border border-line bg-paper p-4">
            <Text className="text-sm font-semibold text-ink">
              Demo limit: {ONBOARDING_MAX_STUDENTS} students.
            </Text>
            <Text className="mt-1 text-xs text-ink-faint">
              Grade each paper independently, then sign up to run a full class.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={startNewStudent}
            disabled={isBusy}
            className="mt-6 items-center rounded-full border border-dashed border-pen/40 bg-pen-wash/20 py-3"
          >
            <Text className="text-sm font-semibold text-pen-deep">
              {students.length === 0 ? "+ Add first student" : "+ Add another student"}
            </Text>
          </TouchableOpacity>
        )}

        {error ? (
          <View className="mt-4 rounded-lg border border-pen-soft/60 bg-pen-wash px-3 py-2">
            <Text className="text-sm text-pen-deep">{error}</Text>
          </View>
        ) : null}

        {rateLimited ? (
          <View className="mt-4 rounded-lg border border-marigold/30 bg-marigold-wash px-3 py-2">
            <Text className="text-sm text-marigold-deep">
              We&apos;ve hit our free demo quota. Sign up for unlimited grading.
            </Text>
          </View>
        ) : null}

        {gradedCount > 0 ? (
          <TouchableOpacity
            onPress={() => router.push("/onboarding/result")}
            disabled={isBusy}
            className="mt-6 items-center justify-center rounded-full bg-pen px-8 py-4 active:bg-pen-deep"
          >
            <Text className="text-base font-semibold text-white">
              See results ({gradedCount})
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </OnboardingShell>
  );
}
