import { View, Text, Pressable } from "react-native";
import { useState } from "react";
import { ChevronRight } from "lucide-react-native";
import {
  Badge,
  Card,
  FormField,
  GraiderTextInput,
  SectionHeader,
  btnPrimary,
  btnPrimaryBlock,
} from "@/components/shared/ui";
import FormSheet from "@/components/shared/FormSheet";
import { IconHome } from "@/components/shared/icons";
import { handleJson, GraiderApiError } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { useSubscription } from "@/components/subscriptions/SubscriptionProvider";
import type { DashboardClass, DashboardTest } from "@/lib/dashboard-types";
import ClassSelector from "@/components/teacher/ClassSelector";

type TeacherClassesViewProps = {
  classes: DashboardClass[];
  tests: DashboardTest[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  attemptsGradedCountByClass: Map<string, number>;
  onCreated: () => void | Promise<void>;
  onOpenClass: (classId: string) => void;
  onStatus: (message: string, type?: "info" | "error") => void;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

export default function TeacherClassesView({
  classes,
  tests,
  selectedClassId,
  onSelectClass,
  attemptsGradedCountByClass,
  onCreated,
  onOpenClass,
  onStatus,
  isBusy,
  setBusy,
}: TeacherClassesViewProps) {
  const graiderFetch = useGraiderFetch();
  const { showPaywall } = useSubscription();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [className, setClassName] = useState("");

  function openCreateModal() {
    setClassName("");
    setCreateModalOpen(true);
  }

  function closeCreateModal() {
    setCreateModalOpen(false);
    setClassName("");
  }

  async function createClass() {
    if (!className.trim()) return;
    setBusy(true);
    try {
      const payload = await handleJson<{ class: DashboardClass }>(
        await graiderFetch("/api/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: className }),
        }),
      );
      closeCreateModal();
      onStatus(`Class "${payload.class.name}" created.`);
      onSelectClass(payload.class.id);
      await onCreated();
    } catch (error) {
      if (error instanceof GraiderApiError && error.code === "CLASS_LIMIT") {
        showPaywall("class_limit");
        return;
      }
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-5">
      <SectionHeader
        title="Classes"
        subtitle="Switch your active class, then add students from the Students tab."
        action={
          <Pressable className={btnPrimary} onPress={openCreateModal}>
            <Text className="font-bold text-white">+ New</Text>
          </Pressable>
        }
      />

      {classes.length > 1 ? (
        <Card>
          <Text className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">Active class</Text>
          <ClassSelector classes={classes} selectedClassId={selectedClassId} onSelect={onSelectClass} />
        </Card>
      ) : null}

      {classes.length === 0 ? (
        <Card>
          <View className="items-center py-10">
            <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-pen-wash">
              <IconHome className="h-6 w-6 text-ink-faint" />
            </View>
            <Text className="text-sm font-bold text-ink">No classes yet</Text>
            <Text className="mt-1 text-center text-xs text-ink-faint">Create your first class to get started.</Text>
            <Pressable className={`${btnPrimaryBlock} mt-4`} onPress={openCreateModal}>
              <Text className="font-bold text-white">Create a class</Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <View className="gap-3">
          {classes.map((entry) => {
            const classTests = tests.filter((t) => t.class_id === entry.id);
            const gradedCount = attemptsGradedCountByClass.get(entry.id) ?? 0;
            const isActive = entry.id === selectedClassId;
            return (
              <Pressable
                key={entry.id}
                onPress={() => onOpenClass(entry.id)}
                className={`rounded-2xl border bg-paper p-4 shadow-paper ${
                  isActive ? "border-pen bg-pen-wash/30" : "border-line"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  <View className="flex-1" style={{ minWidth: 0 }}>
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text className="font-display text-base font-semibold text-ink" numberOfLines={2}>
                        {entry.name}
                      </Text>
                      {isActive ? <Badge variant="blue">Active</Badge> : null}
                    </View>
                    <Text className="mt-1.5 text-xs text-ink-faint">
                      {classTests.length} test{classTests.length !== 1 ? "s" : ""}
                      {gradedCount > 0 ? ` · ${gradedCount} graded` : ""}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={isActive ? "#99291f" : "#a3927b"} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      <FormSheet
        visible={createModalOpen}
        title="Create class"
        subtitle="Name your class — you can add students from the Students tab."
        onClose={closeCreateModal}
        primaryLabel="Create class"
        onPrimary={() => void createClass()}
        primaryDisabled={!className.trim() || isBusy}
        primaryLoading={isBusy}
      >
        <FormField label="Class name">
          <GraiderTextInput
            value={className}
            onChangeText={setClassName}
            placeholder="e.g. Year 10 Biology"
            autoFocus
          />
        </FormField>
      </FormSheet>
    </View>
  );
}
