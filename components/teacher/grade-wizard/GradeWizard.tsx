import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Card, SectionHeader, btnSecondary } from "@/components/shared/ui";
import { IconCheck } from "@/components/shared/icons";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { RosterEntry } from "@/lib/types";
import type { GradedAttemptDetail } from "@/lib/dashboard-types";
import { formatStudentDisplayName } from "@/lib/roster-display";
import {
  useStudentGrade,
  type StudentGradeState,
} from "@/components/teacher/grade-wizard/use-student-grade";
import StepPickTest from "@/components/teacher/grade-wizard/StepPickTest";
import StepPickStudent from "@/components/teacher/grade-wizard/StepPickStudent";
import StepCapturePages from "@/components/teacher/grade-wizard/StepCapturePages";
import StepSessionSummary from "@/components/teacher/grade-wizard/StepSessionSummary";
import StepGradingProgress from "@/components/teacher/grade-wizard/StepGradingProgress";
import StepStudentReview from "@/components/teacher/grade-wizard/StepStudentReview";
import StepResults from "@/components/teacher/grade-wizard/StepResults";
import { useSubscription } from "@/components/subscriptions/SubscriptionProvider";
import { AUTO_GRADE_REQUIRES_PRO } from "@/lib/subscriptions/constants";

type StepDef = {
  id: 1 | 2 | 3 | 4;
  label: string;
  matches: (state: StudentGradeState) => boolean;
};

const STEPS: StepDef[] = [
  { id: 1, label: "Pick test", matches: (s) => s === "pickTest" },
  {
    id: 2,
    label: "Capture",
    matches: (s) => s === "pickStudent" || s === "capture" || s === "sessionSummary",
  },
  { id: 3, label: "Grade", matches: (s) => s === "grading" || s === "reviewing" },
  { id: 4, label: "Results", matches: (s) => s === "results" },
];

function activeStepId(state: StudentGradeState): StepDef["id"] {
  if (state === "pickTest") return 1;
  if (state === "pickStudent" || state === "capture" || state === "sessionSummary") {
    return 2;
  }
  if (state === "grading" || state === "reviewing") return 3;
  return 4;
}

export default function GradeWizard() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId?: string }>();
  const resumedJobRef = useRef<string | null>(null);
  const graiderFetch = useGraiderFetch();
  const wizard = useStudentGrade();
  const {
    state,
    gradingMode,
    selectedTest,
    autoClassId,
    autoClassName,
    testDiscovery,
    buckets,
    activeStudent,
    preview,
    pageToStudentId,
    gradingPhase,
    activeJob,
    studentProgress,
    results,
    errorMessage,
    limitCode,
    isBusy,
    parsePreset,
    actions,
  } = wizard;
  const { canGradeStack, showPaywall, refreshSubscription, subscription } = useSubscription();
  const [showSoftUpsell, setShowSoftUpsell] = useState(false);

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");
  const [rosterClassId, setRosterClassId] = useState<string | null>(null);

  const activeClassId = selectedTest?.class_id ?? autoClassId;

  useEffect(() => {
    if (!jobId || typeof jobId !== "string") return;
    if (resumedJobRef.current === jobId) return;
    resumedJobRef.current = jobId;
    void actions.resumeFromJob(jobId).finally(() => {
      router.setParams({ jobId: undefined });
    });
  }, [jobId, actions, router]);

  useEffect(() => {
    const classId = activeClassId;
    if (!classId) {
      if (roster.length) setRoster([]);
      if (rosterClassId !== null) setRosterClassId(null);
      return;
    }
    if (rosterClassId === classId) return;

    let cancelled = false;
    async function load(classId: string) {
      setRosterLoading(true);
      setRosterError("");
      try {
        const payload = await handleJson<{ roster: RosterEntry[] }>(
          await graiderFetch(`/api/classes/${classId}/roster`, { cache: "no-store" }),
        );
        if (cancelled) return;
        setRoster(payload.roster ?? []);
        setRosterClassId(classId);
      } catch (error) {
        if (cancelled) return;
        setRosterError(error instanceof Error ? error.message : "Failed to load roster.");
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    }
    void load(classId);
    return () => {
      cancelled = true;
    };
  }, [activeClassId, rosterClassId, roster.length, graiderFetch]);

  useEffect(() => {
    if (limitCode === "GRADE_LIMIT") {
      showPaywall("grade_limit");
    }
  }, [limitCode, showPaywall]);

  useEffect(() => {
    if (state === "results" && results && !subscription?.isPro) {
      setShowSoftUpsell(true);
    }
  }, [state, results, subscription?.isPro]);

  const sessionStudentIds = useMemo(
    () => new Set(buckets.map((b) => b.studentId)),
    [buckets],
  );

  const rosterNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of roster) {
      map.set(
        entry.user_id,
        formatStudentDisplayName({ fullName: entry.full_name, email: entry.email }),
      );
    }
    return map;
  }, [roster]);

  const progressStudents = useMemo(
    () =>
      studentProgress.map((student) => ({
        ...student,
        studentName: rosterNameById.get(student.studentId) ?? student.studentName,
      })),
    [studentProgress, rosterNameById],
  );

  const handleSelectAutoGrade = useCallback(
    (classId: string, className: string) => {
      if (AUTO_GRADE_REQUIRES_PRO && !subscription?.isPro) {
        showPaywall("auto_grade");
        return;
      }
      actions.selectSmartGrade(classId, className);
    },
    [actions, showPaywall, subscription?.isPro],
  );

  const handleSubmitSession = useCallback(async () => {
    await refreshSubscription();
    if (!canGradeStack) {
      showPaywall("grade_limit");
      return;
    }
    await actions.submitSession();
    await refreshSubscription();
  }, [actions, canGradeStack, refreshSubscription, showPaywall]);

  const fetchAttemptDetail = useCallback(
    async (attemptId: string): Promise<GradedAttemptDetail> => {
      const payload = await handleJson<{ attempt: GradedAttemptDetail }>(
        await graiderFetch(`/api/submissions/${attemptId}`, { cache: "no-store" }),
      );
      return payload.attempt;
    },
    [graiderFetch],
  );

  const activeId = activeStepId(state);

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerStyle={{ paddingBottom: 24 }}>
      <View className="px-4 pt-2">
        <Link href="/(teacher)" asChild>
          <TouchableOpacity className="mb-4 flex-row items-center gap-1 self-start">
            <ChevronLeft size={18} color="#6f6151" />
            <Text className="text-sm font-medium text-ink-soft">Back to workspace</Text>
          </TouchableOpacity>
        </Link>

        <SectionHeader
          overline="The red pen"
          title="Grade papers"
          subtitle="Pick a student, snap their pages, then grade the whole session in one pass."
        />

        <View className="mb-8 flex-row items-center gap-2">
          {STEPS.map((step, index) => {
            const isActive = step.matches(state);
            const isComplete = step.id < activeId;
            return (
              <View key={step.id} className="flex flex-1 flex-row items-center gap-2">
                <View
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-display ${
                    isComplete ? "bg-moss" : isActive ? "bg-pen" : "bg-cream-deep"
                  }`}
                >
                  {isComplete ? (
                    <IconCheck className="h-4 w-4 text-white" />
                  ) : (
                    <Text
                      className={`font-display text-xs font-bold ${isActive ? "text-white" : "text-ink-faint"}`}
                    >
                      {step.id}
                    </Text>
                  )}
                </View>
                <Text
                  className={`text-sm font-bold ${
                    isActive ? "text-ink" : isComplete ? "text-moss-deep" : "text-ink-faint"
                  }`}
                >
                  {step.label}
                </Text>
                {index < STEPS.length - 1 ? (
                  <View className={`h-px flex-1 ${isComplete ? "bg-moss/40" : "bg-line"}`} />
                ) : null}
              </View>
            );
          })}
        </View>

        {state === "pickTest" ? (
          <StepPickTest
            onSelect={actions.selectTest}
            onSelectAutoGrade={handleSelectAutoGrade}
            showSmartGrade
          />
        ) : null}

        {(selectedTest || (gradingMode === "auto" && autoClassId)) &&
        state !== "pickTest" &&
        state !== "results" ? (
          <Card className="mb-4 flex-row items-center justify-between bg-cream/40">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {gradingMode === "auto" ? "Smart grade" : "Test"}
              </Text>
              <Text className="text-sm font-semibold text-ink">
                {gradingMode === "auto" ? autoClassName ?? "Class" : selectedTest?.title}
              </Text>
              {gradingMode === "auto" ? (
                <Text className="text-xs text-ink-soft">Graider will detect or create the test from your pages</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={actions.restart} disabled={isBusy} className={btnSecondary}>
              <Text className="text-sm font-medium text-pen-deep">Change</Text>
            </TouchableOpacity>
          </Card>
        ) : null}

        {state === "pickStudent" && activeClassId ? (
          <StepPickStudent
            roster={roster}
            rosterLoading={rosterLoading}
            rosterError={rosterError}
            sessionStudentIds={sessionStudentIds}
            onSelect={actions.selectStudent}
            onResume={actions.resumeStudent}
            onBack={actions.back}
          />
        ) : null}

        {state === "capture" && activeStudent ? (
          <StepCapturePages
            studentName={activeStudent.studentName}
            pages={activeStudent.pages}
            onAddPage={actions.addPageToActive}
            onRemovePage={actions.removePageFromActive}
            onMovePage={actions.movePageInActive}
            onDone={actions.finishActiveStudent}
            onBack={actions.back}
            errorMessage={errorMessage}
          />
        ) : null}

        {(state === "sessionSummary") &&
        (selectedTest || gradingMode === "auto") ? (
          <StepSessionSummary
            buckets={buckets}
            testTitle={
              gradingMode === "auto"
                ? autoClassName ?? "Smart grade session"
                : selectedTest!.title
            }
            parsePreset={parsePreset}
            onParsePresetChange={actions.setParsePreset}
            onAddStudent={actions.startAddStudent}
            onResumeStudent={actions.resumeStudent}
            onRemoveStudent={actions.removeBucket}
            onGradeAll={() => void handleSubmitSession()}
            onBack={actions.back}
            isBusy={isBusy}
            errorMessage={errorMessage}
          />
        ) : null}

        {state === "grading" && gradingPhase ? (
          <StepGradingProgress
            phase={gradingPhase}
            testTitle={
              gradingMode === "auto"
                ? autoClassName ?? "Smart grade session"
                : selectedTest?.title ?? testDiscovery?.testTitle ?? "Grading session"
            }
            students={progressStudents}
            activeJob={activeJob}
            errorMessage={errorMessage}
          />
        ) : null}

        {state === "reviewing" && preview && (selectedTest || testDiscovery) ? (
          <View className="gap-3">
            {testDiscovery ? (
              <Card className="border-pen/20 bg-pen-wash/30">
                <Text className="text-sm font-semibold text-ink">
                  {testDiscovery.source === "matched"
                    ? `Matched: ${testDiscovery.testTitle}`
                    : `Created test: ${testDiscovery.testTitle}`}
                </Text>
              </Card>
            ) : null}
            <StepStudentReview
            pages={preview.pages}
            pageToStudentId={pageToStudentId}
            roster={roster}
            onOcrAnswersChange={actions.setOcrAnswers}
            onConfirm={actions.confirmAll}
            onBack={actions.back}
            isBusy={isBusy}
            errorMessage={errorMessage}
            />
          </View>
        ) : null}

        {state === "results" && results && (selectedTest || testDiscovery) ? (
          <View className="gap-4">
            {showSoftUpsell ? (
              <Card className="border-marigold/30 bg-marigold-wash/40">
                <Text className="text-sm font-semibold text-ink">
                  Nice session. Pro keeps this going all month.
                </Text>
                <TouchableOpacity
                  onPress={() => showPaywall("soft_upsell")}
                  className="mt-3 self-start rounded-full bg-pen px-4 py-2"
                >
                  <Text className="text-xs font-semibold text-white">See Pro</Text>
                </TouchableOpacity>
              </Card>
            ) : null}
            <StepResults
              results={results}
              roster={roster}
              testTitle={selectedTest?.title ?? testDiscovery?.testTitle ?? "Graded session"}
              fetchAttempt={fetchAttemptDetail}
              onRestart={() => {
                setShowSoftUpsell(false);
                actions.restart();
              }}
            />
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
