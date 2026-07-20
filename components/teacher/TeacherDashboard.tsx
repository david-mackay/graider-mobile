import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';

import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/clerk-expo";
import { type AppRole } from "@/lib/types";
import { ALL_CLASSES_VALUE, handleJson, type StatusType } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type {
  ActiveView,
  ClassMember,
  DashboardAttempt,
  DashboardClass,
  DashboardQuestion,
  DashboardTest,
} from "@/lib/dashboard-types";
import StatusBanner from "@/components/shared/StatusBanner";
import AppLoadingScreen from "@/components/shared/AppLoadingScreen";
import ProfileSetup from "@/components/onboarding/ProfileSetup";
import { TeacherTopBar, TeacherBottomNav, activeClassLabel } from "@/components/teacher/DashboardNav";
import { getStoredClassId, pickDefaultClassId, setStoredClassId } from "@/lib/class-preference";
import TeacherClassesView from "@/components/teacher/ClassesView";
import QuestionsView from "@/components/teacher/QuestionsView";
import TestsView from "@/components/teacher/TestsView";
import StudentsView from "@/components/teacher/StudentsView";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useSubscription } from "@/components/subscriptions/SubscriptionProvider";

export default function TeacherDashboard() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const graiderFetch = useGraiderFetch();
  const { subscription, showPaywall } = useSubscription();
  const loadInFlightRef = useRef(false);

  // Profile state
  const [profileName, setProfileName] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [profileFormRole, setProfileFormRole] = useState<AppRole>("teacher");

  // Chrome / nav
  const [activeView, setActiveView] = useState<ActiveView>("tests");
  const [selectedClassId, setSelectedClassId] = useState<string>(ALL_CLASSES_VALUE);

  // Data
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [questions, setQuestions] = useState<DashboardQuestion[]>([]);
  const [tests, setTests] = useState<DashboardTest[]>([]);
  const [attempts, setAttempts] = useState<DashboardAttempt[]>([]);
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);

  // Status / busy
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<StatusType>("info");
  const [isBusy, setIsBusy] = useState(false);

  function setStatus(message: string, type: StatusType = "info") {
    setStatusMessage(message);
    setStatusType(type);
    if (message) {
      setTimeout(() => setStatusMessage(""), 5000);
    }
  }

  function getScopedClassId() {
    return selectedClassId !== ALL_CLASSES_VALUE ? selectedClassId : "";
  }

  async function selectClass(classId: string) {
    setSelectedClassId(classId);
    if (classId !== ALL_CLASSES_VALUE) {
      await setStoredClassId(classId);
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

      const [classRes, testsRes, attemptsRes, storedClassId] = await Promise.all([
        handleJson<{ classes: DashboardClass[] }>(await graiderFetch("/api/classes", { cache: "no-store" })),
        handleJson<{ tests: DashboardTest[] }>(await graiderFetch("/api/tests", { cache: "no-store" })),
        handleJson<{ attempts: DashboardAttempt[] }>(await graiderFetch("/api/submissions", { cache: "no-store" })),
        getStoredClassId(),
      ]);

      const loadedClasses = classRes.classes ?? [];
      const loadedTests = testsRes.tests ?? [];
      const attemptsByClass = new Map(loadedTests.map((t) => [t.id, t.class_id] as const));
      const loadedAttempts = (attemptsRes.attempts ?? []).map((a) => ({
        ...a,
        test_class_id: attemptsByClass.get(a.test_id) ?? null,
      }));

      setClasses(loadedClasses);
      setTests(loadedTests);
      setAttempts(loadedAttempts);

      const hasValidSelection =
        selectedClassId !== ALL_CLASSES_VALUE && loadedClasses.some((c) => c.id === selectedClassId);
      const nextSelectedClassId = hasValidSelection
        ? selectedClassId
        : pickDefaultClassId(loadedClasses, loadedTests, loadedAttempts, storedClassId);

      if (selectedClassId !== nextSelectedClassId) {
        setSelectedClassId(nextSelectedClassId);
        if (nextSelectedClassId !== ALL_CLASSES_VALUE) {
          await setStoredClassId(nextSelectedClassId);
        }
        return;
      }

      const scopedClassId = nextSelectedClassId !== ALL_CLASSES_VALUE ? nextSelectedClassId : "";
      if (scopedClassId) {
        const qRes = await handleJson<{ questions: DashboardQuestion[] }>(
          await graiderFetch(`/api/questions?classId=${scopedClassId}`, { cache: "no-store" }),
        );
        setQuestions(qRes.questions ?? []);

        const mRes = await handleJson<{ members: ClassMember[] }>(
          await graiderFetch(`/api/classes/${scopedClassId}/members`, { cache: "no-store" }),
        );
        setClassMembers(mRes.members ?? []);
      } else {
        setQuestions([]);
        setClassMembers([]);
      }
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

  // Derived
  const activeClass = classes.find((c) => c.id === selectedClassId);
  const scopedClassId = getScopedClassId();
  const classCanManage = scopedClassId !== "" && activeClass?.role_in_class === "teacher";

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

  const attemptsGradedCountByClass = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of attempts) {
      if (a.status !== "graded" || !a.test_class_id) continue;
      map.set(a.test_class_id, (map.get(a.test_class_id) ?? 0) + 1);
    }
    return map;
  }, [attempts]);

  // Loading / profile gates
  if (!isLoaded) {
    return <AppLoadingScreen />;
  }

  if (needsProfile) {
    return (
      <ProfileSetup
        initialRole={profileFormRole}
        onComplete={async ({ full_name, role: nextRole }) => {
          if (nextRole === "student") {
            router.replace("/(student)");
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
    <SafeAreaView className="flex-1 bg-cream" edges={["bottom"]}>
      <TeacherTopBar
        activeClassName={activeClassLabel(classes, selectedClassId)}
        profileName={profileName}
        subscriptionLabel={
          subscription?.isPro
            ? "Pro"
            : subscription
              ? `${subscription.gradesRemaining ?? 0} left`
              : null
        }
        onManageSubscription={() => {
          if (!subscription?.isPro) {
            showPaywall("soft_upsell");
          }
        }}
        onOpenAccount={() => router.push("/(teacher)/account")}
      />

      <View className="flex-1">
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 + Math.max(insets.bottom, 8) }}>
          <View className="px-4 py-6">
            <StatusBanner message={statusMessage} type={statusType} onDismiss={() => setStatusMessage("")} />

            {activeView === "classes" ? (
              <View className="space-y-6">
                <TeacherClassesView
                  classes={classes}
                  tests={tests}
                  selectedClassId={selectedClassId}
                  onSelectClass={(id) => void selectClass(id)}
                  attemptsGradedCountByClass={attemptsGradedCountByClass}
                  onCreated={loadDashboard}
                  onOpenClass={(id) => {
                    void selectClass(id);
                    navigate("students");
                  }}
                  onStatus={setStatus}
                  isBusy={isBusy}
                  setBusy={setIsBusy}
                />
              </View>
            ) : null}

            {activeView === "questions" ? (
              <QuestionsView
                classId={scopedClassId || null}
                className={activeClass?.name ?? null}
                classCanManage={classCanManage}
                questions={questions}
                onChanged={loadDashboard}
                onStatus={setStatus}
                onGoToClasses={() => navigate("classes")}
                isBusy={isBusy}
                setBusy={setIsBusy}
              />
            ) : null}

            {activeView === "tests" ? (
              <TestsView
                classId={scopedClassId || null}
                className={activeClass?.name ?? null}
                classCanManage={classCanManage}
                questions={questions}
                testsInScope={testsInScope}
                attemptsInScope={attemptsInScope}
                onChanged={loadDashboard}
                onStatus={setStatus}
                onGoToClasses={() => navigate("classes")}
                onGoToQuestions={() => navigate("questions")}
                isBusy={isBusy}
                setBusy={setIsBusy}
              />
            ) : null}

            {activeView === "students" ? (
              <StudentsView
                classId={scopedClassId || null}
                className={activeClass?.name ?? null}
                members={classMembers}
                attemptsInScope={attemptsInScope}
                onChanged={loadDashboard}
                onStatus={setStatus}
                onGoToClasses={() => navigate("classes")}
                isBusy={isBusy}
                setBusy={setIsBusy}
              />
            ) : null}
          </View>
        </ScrollView>
      </View>

      <TeacherBottomNav activeView={activeView} onNavigate={navigate} />
    </SafeAreaView>
  );
}
