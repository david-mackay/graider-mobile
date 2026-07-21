import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Platform } from "react-native";
import { type AppRole, type TestDetail } from "@/lib/types";
import {
  ALL_CLASSES_VALUE,
  type AttemptAnswerPayload,
  handleJson,
  type StatusType,
} from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type {
  ActiveView,
  DashboardAttempt,
  DashboardClass,
  DashboardTest,
  GradedAttemptDetail,
} from "@/lib/dashboard-types";
import { BrandMark, Wordmark } from "@/components/shared/Brand";
import { IconHome, IconClipboard } from "@/components/shared/icons";
import StatusBanner from "@/components/shared/StatusBanner";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import StudentClassesView from "@/components/student/ClassesView";
import TestList from "@/components/student/TestList";
import TestTakingForm from "@/components/student/TestTakingForm";
import AttemptDetailCard from "@/components/student/AttemptDetailCard";

// ─── Student Nav ────────────────────────────────────────────────────────
function StudentTopBar({
  classes,
  selectedClassId,
  onSelectClass,
  profileName,
  onOpenAccount,
}: {
  classes: DashboardClass[];
  selectedClassId: string;
  onSelectClass: (id: string) => void;
  profileName: string | null;
  onOpenAccount?: () => void;
}) {
  return (
    <View className="border-b border-line bg-paper/90 px-4 pb-3 pt-3">
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5">
          <BrandMark className="h-8 w-8" />
          <View>
            <Wordmark className="text-lg" />
            <Text className="text-xs text-ink-faint">Student workspace</Text>
          </View>
        </View>
        {profileName ? (
          <TouchableOpacity
            onPress={onOpenAccount}
            accessibilityRole="button"
            accessibilityLabel="Account settings"
            className="h-9 w-9 items-center justify-center rounded-full bg-cream-deep"
          >
            <Text className="font-display text-sm font-bold text-pen">{profileName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View className="overflow-hidden rounded-xl border border-line bg-cream">
        <Picker
          selectedValue={selectedClassId}
          onValueChange={(val) => onSelectClass(val)}
          style={{ height: Platform.OS === "ios" ? 120 : 50, width: "100%", color: "#2c231b" }}
          itemStyle={{ fontSize: 14, height: 120 }}
        >
          <Picker.Item label="All classes" value={ALL_CLASSES_VALUE} />
          {classes.map((c) => (
            <Picker.Item key={c.id} label={c.name} value={c.id} />
          ))}
        </Picker>
      </View>
    </View>
  );
}

const STUDENT_NAV = [
  { id: "classes" as ActiveView, label: "Classes", Icon: IconHome },
  { id: "tests" as ActiveView, label: "Tests", Icon: IconClipboard },
];

function StudentBottomNav({
  activeView,
  onNavigate,
}: {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-20 flex-row items-center justify-around border-t border-line bg-paper px-2 pt-2 shadow-paper"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      {STUDENT_NAV.map((item) => {
        const isActive = activeView === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onNavigate(item.id)}
            className="flex-1 items-center justify-center p-2"
          >
            <item.Icon className={`h-6 w-6 mb-1 ${isActive ? "text-pen" : "text-ink-faint"}`} />
            <Text className={`text-[10px] font-medium ${isActive ? "text-pen-deep" : "text-ink-soft"}`}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const { join: joinParam } = useLocalSearchParams<{ join?: string }>();
  const insets = useSafeAreaInsets();
  const graiderFetch = useGraiderFetch();
  const loadInFlightRef = useRef(false);

  const [profileName, setProfileName] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileFormRole, setProfileFormRole] = useState<AppRole>("student");

  const [activeView, setActiveView] = useState<ActiveView>("classes");
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(ALL_CLASSES_VALUE);

  const [tests, setTests] = useState<DashboardTest[]>([]);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<{
    attempt_id: string;
    started_at: string | null;
    deadline_at: string | null;
    duration_minutes: number | null;
  } | null>(null);

  const [testTakingAnswers, setTestTakingAnswers] = useState<Record<string, string>>({});
  const [selectedAttemptDetail, setSelectedAttemptDetail] = useState<GradedAttemptDetail | null>(null);

  const [joinCode, setJoinCode] = useState(typeof joinParam === "string" ? joinParam : "");
  const [joinEmail, setJoinEmail] = useState("");

  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("info");
  const [isBusy, setIsBusy] = useState(false);

  // Derived
  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of classes) map.set(c.id, c.name);
    return map;
  }, [classes]);

  const testsInScope = useMemo(
    () => (selectedClassId === ALL_CLASSES_VALUE ? tests : tests.filter((t) => t.class_id === selectedClassId)),
    [selectedClassId, tests],
  );

  const attemptsInScope = useMemo(
    () =>
      selectedClassId === ALL_CLASSES_VALUE
        ? attempts
        : attempts.filter((a) => a.test_class_id === selectedClassId),
    [attempts, selectedClassId],
  );

  const studentTestRows = useMemo(
    () =>
      testsInScope.map((test) => ({
        test,
        attempt: attemptsInScope.find((a) => a.test_id === test.id) ?? null,
      })),
    [testsInScope, attemptsInScope],
  );

  // Helpers
  function setStatus(message: string, type: StatusType = "info") {
    setStatusMessage(message);
    setStatusType(type);
    if (message) {
      setTimeout(() => setStatusMessage(""), 5000);
    }
  }

  async function loadDashboard() {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    try {
      const userRes = await handleJson<{ user: { role: AppRole; full_name: string | null } }>(
        await graiderFetch("/api/me/role", { cache: "no-store" }),
      );
      const nextRole = userRes.user.role;
      const name = userRes.user.full_name;
      setProfileName(name);

      const nameMissing = !name || /^user_[a-zA-Z0-9]{20,}$/.test(name);
      if (nameMissing) {
        setNeedsProfile(true);
        setProfileFormRole(nextRole);
        return;
      }

      const classRes = await handleJson<{ classes: DashboardClass[] }>(
        await graiderFetch("/api/classes", { cache: "no-store" }),
      );
      const loadedClasses = classRes.classes ?? [];
      setClasses(loadedClasses);

      const nextSelectedClassId =
        loadedClasses.length > 0
          ? loadedClasses.some((c) => c.id === selectedClassId)
            ? selectedClassId
            : ALL_CLASSES_VALUE
          : ALL_CLASSES_VALUE;

      if (selectedClassId !== nextSelectedClassId) setSelectedClassId(nextSelectedClassId);

      const testsRes = await handleJson<{ tests: DashboardTest[] }>(
        await graiderFetch("/api/tests", { cache: "no-store" }),
      );
      const loadedTests = testsRes.tests ?? [];
      setTests(loadedTests);

      const attemptsRes = await handleJson<{ attempts: DashboardAttempt[] }>(
        await graiderFetch("/api/submissions", { cache: "no-store" }),
      );
      const attemptsByClass = new Map(loadedTests.map((t) => [t.id, t.class_id] as const));
      setSelectedAttemptDetail(null);
      setAttempts(
        (attemptsRes.attempts ?? []).map((a) => ({
          ...a,
          test_class_id: attemptsByClass.get(a.test_id) ?? null,
        })),
      );
    } catch (error) {
      if (error instanceof Error) setStatus(error.message, "error");
    } finally {
      loadInFlightRef.current = false;
    }
  }

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    void loadDashboard();
  }, [isLoaded, isSignedIn, selectedClassId]);

  function navigate(view: ActiveView) {
    setActiveView(view);
  }

  async function joinClass() {
    if (!joinCode.trim()) return;
    setIsBusy(true);
    try {
      await handleJson<{ joined: boolean }>(
        await graiderFetch("/api/classes/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: joinCode, email: joinEmail || undefined }),
        }),
      );
      setJoinCode("");
      setJoinEmail("");
      setStatus("Successfully joined class!");
      await loadDashboard();
    } catch (error) {
      if (error instanceof Error) setStatus(error.message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  async function openTestForSubmission(testId: string) {
    try {
      const started = await handleJson<{
        attempt_id: string;
        started_at: string | null;
        deadline_at: string | null;
        duration_minutes: number | null;
      }>(
        await graiderFetch("/api/submissions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId }),
        }),
      );
      const payload = await handleJson<{ test: TestDetail }>(
        await graiderFetch(`/api/tests/${testId}`, { cache: "no-store" }),
      );
      setSelectedTest({
        ...payload.test,
        available_now: true,
        duration_minutes: started.duration_minutes ?? payload.test.duration_minutes ?? null,
      });
      setActiveAttempt({
        attempt_id: started.attempt_id,
        started_at: started.started_at,
        deadline_at: started.deadline_at,
        duration_minutes: started.duration_minutes,
      });
      const initial: Record<string, string> = {};
      for (const q of payload.test.questions) initial[q.question_id] = "";
      setTestTakingAnswers(initial);
      setSelectedClassId(payload.test.class_id);
    } catch (error) {
      if (error instanceof Error) setStatus(error.message, "error");
      await loadDashboard();
    }
  }

  async function openAttemptDetail(attemptId: string) {
    try {
      const payload = await handleJson<{ attempt: GradedAttemptDetail }>(
        await graiderFetch(`/api/submissions/${attemptId}`, { cache: "no-store" }),
      );
      setSelectedAttemptDetail(payload.attempt);
    } catch (error) {
      if (error instanceof Error) setStatus(error.message, "error");
    }
  }

  async function submitTest(opts?: { timedOut?: boolean }) {
    if (!selectedTest) return;
    setIsBusy(true);
    const answers: AttemptAnswerPayload[] = selectedTest.questions.map((q) => ({
      question_id: q.question_id,
      answer: testTakingAnswers[q.question_id] ?? "",
    }));
    try {
      await handleJson<{ attempt_id: string }>(
        await graiderFetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            testId: selectedTest.id,
            answers,
            timed_out: opts?.timedOut === true,
          }),
        }),
      );
      setStatus(opts?.timedOut ? "Time is up — your test was submitted." : "Test submitted successfully!");
      setSelectedTest(null);
      setActiveAttempt(null);
      await loadDashboard();
    } catch (error) {
      if (error instanceof Error) setStatus(error.message, "error");
    } finally {
      setIsBusy(false);
    }
  }

  // Loading / profile gates
  if (!isLoaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-cream">
        <View className="items-center">
          <View className="mb-4 h-10 w-10 rounded-full border-4 border-pen border-t-transparent" />
          <Text className="text-sm font-medium text-ink-faint">Loading your workspace…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (needsProfile) {
    return (
      <ProfileSetup
        initialRole={profileFormRole}
        onComplete={async ({ full_name, role: nextRole }) => {
          if (nextRole === "teacher") {
            router.replace("/(teacher)");
            return;
          }
          setNeedsProfile(false);
          setProfileName(full_name);
          await loadDashboard();
        }}
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <StudentTopBar
        classes={classes}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        profileName={profileName}
        onOpenAccount={() => router.push("/(student)/account")}
      />

      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96 + Math.max(insets.bottom, 8) }}>
          <View className="px-4 py-6">
            <StatusBanner message={statusMessage} type={statusType} onDismiss={() => setStatusMessage("")} />

            {selectedTest ? (
              <TestTakingForm
                test={selectedTest}
                answers={testTakingAnswers}
                onChangeAnswer={(qid, value) => setTestTakingAnswers((c) => ({ ...c, [qid]: value }))}
                onSubmit={submitTest}
                onClose={() => {
                  setSelectedTest(null);
                  setActiveAttempt(null);
                }}
                isBusy={isBusy}
                deadlineAt={activeAttempt?.deadline_at ?? null}
                durationMinutes={activeAttempt?.duration_minutes ?? null}
              />
            ) : null}

            {activeView === "classes" ? (
              <View className="space-y-6">
                <StudentClassesView
                  classes={classes}
                  tests={tests}
                  attempts={attempts}
                  joinCode={joinCode}
                  setJoinCode={setJoinCode}
                  joinEmail={joinEmail}
                  setJoinEmail={setJoinEmail}
                  onJoin={joinClass}
                  onSelectClass={(id) => {
                    setSelectedClassId(id);
                    navigate("tests");
                  }}
                  isBusy={isBusy}
                />
              </View>
            ) : null}

            {activeView === "tests" ? (
              <View className="space-y-6">
                <Text className="text-xl font-bold text-ink">My Tests</Text>
                {selectedAttemptDetail ? (
                  <AttemptDetailCard attempt={selectedAttemptDetail} onClose={() => setSelectedAttemptDetail(null)} />
                ) : null}
                <TestList
                  rows={studentTestRows}
                  classNameById={classNameById}
                  onStart={openTestForSubmission}
                  onViewResult={openAttemptDetail}
                />
              </View>
            ) : null}
          </View>
        </ScrollView>
      </View>

      <StudentBottomNav activeView={activeView} onNavigate={navigate} />
    </SafeAreaView>
  );
}
