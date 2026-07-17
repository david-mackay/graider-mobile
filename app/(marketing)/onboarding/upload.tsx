import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import OnboardingShell from "@/components/marketing/OnboardingShell";
import StepCapturePages from "@/components/teacher/grade-wizard/StepCapturePages";
import { X } from "lucide-react-native";
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
import { appendImageToFormData, type PickedImage } from "@/lib/picked-image";

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

export default function OnboardingUploadPage() {
  const [keys, setKeys] = useState<OnboardingAnswerKey[]>([]);
  const [students, setStudents] = useState<OnboardingStudentSubmission[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [phase, setPhase] = useState<"form" | "capture">("form");
  const [mode, setMode] = useState<"photo" | "typed">("photo");
  const [name, setName] = useState("Student 1");
  const [pendingPages, setPendingPages] = useState<PickedImage[]>([]);
  const [typedAnswers, setTypedAnswers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [gradingProgress, setGradingProgress] = useState<string | null>(null);

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
    setPhase("form");
  }

  function onBackFromCapture() {
    // Keep pending pages when backing out of capture during edit —
    // only clear if we had nothing useful (user abandoned empty capture for new student).
    if (!editingId && pendingPages.length === 0) {
      setPhase("form");
      return;
    }
    setPhase("form");
  }

  function resetCaptureForm(nextStudents: OnboardingStudentSubmission[]) {
    setEditingId(null);
    setPendingPages([]);
    setMode("photo");
    setTypedAnswers(keys.map(() => ""));
    setName(`Student ${nextStudents.length + 1}`);
    setError(null);
    setPhase("form");
  }

  function startEdit(student: OnboardingStudentSubmission) {
    setEditingId(student.id);
    setName(student.name);
    setMode(student.source);
    setError(null);
    setPhase("form");
    if (student.source === "typed") {
      setTypedAnswers(keys.map((_, i) => student.typedAnswers?.[i] ?? ""));
      setPendingPages([]);
    } else {
      setTypedAnswers(keys.map(() => ""));
      setPendingPages(papersToPickedImages(student.papers ?? []));
    }
  }

  function cancelEdit() {
    resetCaptureForm(students);
  }

  const apiBase = process.env.EXPO_PUBLIC_APP_URL;

  const draftReady =
    mode === "photo"
      ? pendingPages.length > 0
      : typedAnswers.some((a) => a.trim().length > 0);

  /** Persist the open form into the roster. Returns the updated list, or null on validation error. */
  async function commitCurrentForm(): Promise<OnboardingStudentSubmission[] | null> {
    const trimmedName =
      name.trim() ||
      (editingId
        ? students.find((s) => s.id === editingId)?.name ?? "Student"
        : `Student ${students.length + 1}`);
    setError(null);

    let submission: Pick<OnboardingStudentSubmission, "source" | "papers" | "typedAnswers">;

    if (mode === "photo") {
      if (pendingPages.length === 0) {
        setError("Add at least one photo.");
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
          destPath = `${destDir}student_${Date.now()}_p${i + 1}.jpg`;
          await FileSystem.copyAsync({ from: page.uri, to: destPath });
        }
        papers.push({
          mimeType: page.type || "image/jpeg",
          base64: "",
          fileUri: destPath,
          filename: page.name,
        });
      }
      submission = { source: "photo", papers };
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

  async function gradeOne(student: OnboardingStudentSubmission): Promise<OnboardingSampleGrade> {
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
    const res = await fetch(sampleGradeUrl, { method: "POST", body: formData });
    if (res.status === 429) throw new Error("RATE_LIMITED");
    const payload = await res.json();
    if (!res.ok) {
      throw new Error(payload.error ?? `Couldn't grade ${student.name}.`);
    }
    return {
      marksEarned: payload.marksEarned,
      maxMarks: payload.maxMarks,
      feedback: payload.feedback,
      ocrAnswerText: payload.ocrAnswerText,
      questions: payload.questions,
    };
  }

  async function gradeClass() {
    if (!apiBase) {
      setError("Missing EXPO_PUBLIC_APP_URL — add it in .env for this build.");
      return;
    }

    // Include whoever is on the open form — no need to tap "Add student" first.
    let roster = students;
    if (editingId || draftReady) {
      const next = await commitCurrentForm();
      if (!next) return;
      roster = next;
      setStudents(next);
      await setVault({ students: next, completedAt: undefined });
      resetCaptureForm(next);
    }
    if (roster.length === 0) {
      setError("Add at least one student first.");
      return;
    }

    setError(null);
    setIsBusy(true);
    try {
      const graded: OnboardingStudentSubmission[] = [];
      for (let i = 0; i < roster.length; i++) {
        const student = roster[i];
        setGradingProgress(`Grading ${student.name} (${i + 1}/${roster.length})…`);
        if (
          student.grade &&
          Number.isInteger(student.grade.marksEarned) &&
          Number.isInteger(student.grade.maxMarks)
        ) {
          graded.push(student);
          continue;
        }
        const grade = await gradeOne(student);
        graded.push({ ...student, grade });
      }
      setStudents(graded);
      await setVault({ students: graded, completedAt: new Date().toISOString() });
      router.push("/onboarding/result");
    } catch (err) {
      if (err instanceof Error && err.message === "RATE_LIMITED") {
        setRateLimited(true);
      } else {
        console.error("[upload] gradeClass error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "We're having trouble grading right now — please try again.",
        );
      }
    } finally {
      setIsBusy(false);
      setGradingProgress(null);
    }
  }

  const atCap = students.length >= ONBOARDING_MAX_STUDENTS;
  const isEditing = Boolean(editingId);
  const showNewForm = !isEditing && !atCap;
  const gradeCount = students.length + (draftReady && !isEditing ? 1 : 0);
  const canGrade = gradeCount > 0 && !isBusy && !rateLimited;

  function renderStudentForm(opts: { forEdit: boolean }) {
    return (
      <View className="gap-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-ink-faint">
          {opts.forEdit ? "Editing student" : "New student"}
        </Text>

        <View className="gap-1.5">
          <Text className="text-sm font-semibold text-ink">Student name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!isBusy}
            className="rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
          />
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity
            onPress={() => setMode("photo")}
            disabled={isBusy}
            className={`flex-1 items-center justify-center rounded-full px-4 py-3 ${mode === "photo" ? "bg-pen" : "border border-line bg-paper"}`}
          >
            <Text className={`text-sm font-semibold ${mode === "photo" ? "text-white" : "text-ink"}`}>
              Photo
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("typed")}
            disabled={isBusy}
            className={`flex-1 items-center justify-center rounded-full px-4 py-3 ${mode === "typed" ? "bg-pen" : "border border-line bg-paper"}`}
          >
            <Text className={`text-sm font-semibold ${mode === "typed" ? "text-white" : "text-ink"}`}>
              Type answer
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "photo" ? (
          <TouchableOpacity
            onPress={() => setPhase("capture")}
            disabled={isBusy}
            className="items-center rounded-2xl border-2 border-dashed border-line bg-cream py-8"
          >
            <Text className="text-sm font-bold text-ink">
              {pendingPages.length === 0
                ? "Tap to capture pages"
                : `${pendingPages.length} page${pendingPages.length === 1 ? "" : "s"} — tap to review`}
            </Text>
            <Text className="mt-1 text-xs text-ink-faint">
              Camera or photo library · reorder after
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="gap-4">
            {keys.map((key, index) => (
              <View key={`${index}-${key.prompt.slice(0, 24)}`} className="gap-1.5">
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
                  editable={!isBusy}
                  multiline
                  placeholderTextColor="#9ca3af"
                  className="min-h-[72px] rounded-2xl border border-line bg-cream px-4 py-3 text-base text-ink"
                  textAlignVertical="top"
                />
              </View>
            ))}
          </View>
        )}

        <View className="gap-2">
          {opts.forEdit ? (
            <TouchableOpacity
              onPress={cancelEdit}
              disabled={isBusy}
              className="items-center justify-center rounded-full border-2 border-line bg-paper px-8 py-3"
            >
              <Text className="text-base font-semibold text-ink-soft">Cancel</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => void saveStudent()}
            disabled={isBusy}
            className="items-center justify-center rounded-full border-2 border-line bg-paper px-8 py-4"
          >
            <Text className="text-base font-semibold text-pen-deep">
              {opts.forEdit ? "Save changes" : "Add student"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === "capture") {
    return (
      <SafeAreaView className="flex-1 bg-cream px-4 pt-4">
        <StepCapturePages
          studentName={name.trim() || `Student ${students.length + 1}`}
          pages={pendingPages}
          onAddPage={onAddPage}
          onRemovePage={onRemovePage}
          onMovePage={onMovePage}
          onDone={onDoneCapturing}
          onBack={onBackFromCapture}
          errorMessage=""
          doneLabel={`Done — ${pendingPages.length} page${pendingPages.length === 1 ? "" : "s"} ready`}
        />
      </SafeAreaView>
    );
  }

  return (
    <OnboardingShell step={4} backHref="/onboarding/answer-key">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="items-center">
          <Text className="text-center font-display text-3xl font-semibold tracking-tight text-ink">
            Add each student and their paper.
          </Text>
          <Text className="mt-4 text-center text-base leading-relaxed text-ink-soft">
            Collect the whole stack first. Tap any student to edit. We&apos;ll grade everyone when
            you&apos;re ready.
          </Text>
        </View>

        {students.length > 0 ? (
          <View className="mt-8 gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-ink-faint">
              {students.length} student{students.length === 1 ? "" : "s"} ready
            </Text>
            {students.map((s) => {
              const active = editingId === s.id;
              if (active) {
                return (
                  <View
                    key={s.id}
                    className="rounded-2xl border border-pen bg-paper p-5 shadow-paper"
                  >
                    {renderStudentForm({ forEdit: true })}
                  </View>
                );
              }
              return (
                <View
                  key={s.id}
                  className="flex-row items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-4 shadow-paper"
                >
                  <TouchableOpacity
                    onPress={() => startEdit(s)}
                    disabled={isBusy || isEditing}
                    className="min-w-0 flex-1"
                  >
                    <Text className="text-sm font-bold text-ink" numberOfLines={1}>
                      {s.name}
                    </Text>
                    <Text className="text-xs text-ink-faint">
                      {s.source === "photo"
                        ? `${s.papers?.length ?? 1} photo${(s.papers?.length ?? 1) === 1 ? "" : "s"}`
                        : "Typed"}
                      {isEditing ? "" : " · tap to edit"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void removeStudent(s.id)}
                    disabled={isBusy || isEditing}
                    className="ml-2 rounded-full bg-pen-wash p-2"
                  >
                    <X size={16} color="#be3a2e" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}

        {atCap && !isEditing ? (
          <View className="mt-8 rounded-2xl border border-line bg-paper p-5">
            <Text className="text-sm font-semibold text-ink">
              That&apos;s the free demo limit ({ONBOARDING_MAX_STUDENTS} students).
            </Text>
            <Text className="mt-1 text-xs text-ink-faint">
              Tap a student above to edit, or sign up to grade a full class.
            </Text>
          </View>
        ) : null}

        {showNewForm ? (
          <View className="mt-8 gap-4 rounded-2xl border border-line bg-paper p-5">
            {renderStudentForm({ forEdit: false })}
          </View>
        ) : null}

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

        <TouchableOpacity
          onPress={() => void gradeClass()}
          disabled={!canGrade}
          className={`mt-6 items-center justify-center rounded-full px-8 py-4 ${
            !canGrade ? "bg-pen-soft" : "bg-pen active:bg-pen-deep"
          }`}
        >
          <Text className="text-base font-semibold text-white">
            {isBusy
              ? gradingProgress ?? "Grading..."
              : `Grade my class${gradeCount > 0 ? ` (${gradeCount})` : ""}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </OnboardingShell>
  );
}
