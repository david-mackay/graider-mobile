import { View, Text, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react-native";
import { Card, FormField, btnPrimary, btnSecondary, inputClass, Badge } from "@/components/shared/ui";
import { IconClipboard } from "@/components/shared/icons";
import CreateTestSheet from "@/components/teacher/CreateTestSheet";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import { getStoredClassId } from "@/lib/class-preference";
import type { DashboardClass } from "@/lib/dashboard-types";
import type { TestSummary } from "@/lib/types";

type StepPickTestProps = {
  onSelect: (test: TestSummary) => void;
  onSelectAutoGrade: (classId: string, className: string) => void;
  showSmartGrade?: boolean;
};

type GroupedTests = {
  classId: string;
  className: string;
  tests: TestSummary[];
};

export default function StepPickTest({ onSelect, onSelectAutoGrade, showSmartGrade = true }: StepPickTestProps) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const [tests, setTests] = useState<TestSummary[]>([]);
  const [classes, setClasses] = useState<DashboardClass[]>([]);
  const [preferredClassId, setPreferredClassId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [createForClass, setCreateForClass] = useState<{ id: string; name: string } | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const teacherClasses = useMemo(
    () => classes.filter((c) => c.role_in_class === "teacher"),
    [classes],
  );

  const smartGradeClass = useMemo(() => {
    if (preferredClassId && teacherClasses.some((c) => c.id === preferredClassId)) {
      return teacherClasses.find((c) => c.id === preferredClassId) ?? teacherClasses[0] ?? null;
    }
    return teacherClasses[0] ?? null;
  }, [preferredClassId, teacherClasses]);

  async function reloadTests() {
    const testsPayload = await handleJson<{ tests: TestSummary[] }>(
      await graiderFetch("/api/tests", { cache: "no-store" }),
    );
    setTests(testsPayload.tests ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setLoadError("");
      try {
        const [testsPayload, classesPayload, storedClassId] = await Promise.all([
          handleJson<{ tests: TestSummary[] }>(await graiderFetch("/api/tests", { cache: "no-store" })),
          handleJson<{ classes: DashboardClass[] }>(await graiderFetch("/api/classes", { cache: "no-store" })),
          getStoredClassId(),
        ]);
        if (cancelled) return;
        setTests(testsPayload.tests ?? []);
        setClasses(classesPayload.classes ?? []);
        setPreferredClassId(storedClassId);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load tests.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [graiderFetch]);

  const grouped: GroupedTests[] = useMemo(() => {
    const classNameById = new Map(classes.map((c) => [c.id, c.name] as const));
    const filter = search.trim().toLowerCase();
    const map = new Map<string, GroupedTests>();

    for (const test of tests) {
      if (filter) {
        const className = classNameById.get(test.class_id) ?? "";
        const haystack = `${test.title} ${className}`.toLowerCase();
        if (!haystack.includes(filter)) continue;
      }
      const className = classNameById.get(test.class_id) ?? "Unknown class";
      const existing = map.get(test.class_id);
      if (existing) {
        map.set(test.class_id, { ...existing, tests: [...existing.tests, test] });
      } else {
        map.set(test.class_id, { classId: test.class_id, className, tests: [test] });
      }
    }

    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      if (preferredClassId) {
        if (a.classId === preferredClassId) return -1;
        if (b.classId === preferredClassId) return 1;
      }
      return a.className.localeCompare(b.className);
    });
    return groups;
  }, [tests, classes, search, preferredClassId]);

  if (isLoading) {
    return (
      <Card>
        <View className="items-center justify-center py-10">
          <ActivityIndicator size="large" color="#be3a2e" />
        </View>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-pen-soft/60 bg-pen-wash">
        <Text className="text-sm font-bold text-pen-deep">{loadError}</Text>
      </Card>
    );
  }

  return (
    <View className="gap-4">
      {statusMessage ? (
        <Card className="border-moss/30 bg-moss-wash">
          <Text className="text-sm text-moss-deep">{statusMessage}</Text>
        </Card>
      ) : null}

      {showSmartGrade && smartGradeClass ? (
        <Card className="border-pen/20 bg-pen-wash/30">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2">
                <Sparkles size={16} color="#be3a2e" />
                <Text className="text-sm font-bold text-ink">Smart grade</Text>
                <Badge variant="gray">Pro</Badge>
              </View>
              <Text className="mt-1 text-xs text-ink-soft">
                Pick students and snap their pages — Graider detects or creates the matching test.
              </Text>
              <Text className="mt-2 text-xs font-semibold text-ink-faint">{smartGradeClass.name}</Text>
            </View>
            <Pressable
              className={btnPrimary}
              onPress={() => onSelectAutoGrade(smartGradeClass.id, smartGradeClass.name)}
            >
              <Text className="text-sm font-bold text-white">Start</Text>
            </Pressable>
          </View>
          {teacherClasses.length > 1 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {teacherClasses
                .filter((c) => c.id !== smartGradeClass.id)
                .map((c) => (
                  <Pressable key={c.id} className={btnSecondary} onPress={() => onSelectAutoGrade(c.id, c.name)}>
                    <Text className="text-xs font-semibold text-pen-deep">{c.name}</Text>
                  </Pressable>
                ))}
            </View>
          ) : null}
        </Card>
      ) : null}

      {tests.length === 0 ? (
        <Card>
          <View className="items-center gap-3 py-8">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-pen-wash">
              <IconClipboard className="h-6 w-6 text-pen" />
            </View>
            <Text className="text-base font-bold text-ink">No tests yet</Text>
            <Text className="text-center text-sm text-ink-soft">
              Create a test for your class, or use Smart grade above to detect one from your papers.
            </Text>
            {teacherClasses[0] ? (
              <Pressable
                className={btnPrimary}
                onPress={() => setCreateForClass({ id: teacherClasses[0].id, name: teacherClasses[0].name })}
              >
                <Text className="text-sm font-bold text-white">Create test</Text>
              </Pressable>
            ) : (
              <Pressable className={btnPrimary} onPress={() => router.replace("/(teacher)")}>
                <Text className="text-sm font-bold text-white">Go to dashboard</Text>
              </Pressable>
            )}
          </View>
        </Card>
      ) : (
        <>
          <Card>
            <FormField label="Find a test" hint="Search by test or class name.">
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="e.g. Photosynthesis quiz"
                className={inputClass}
              />
            </FormField>
          </Card>

          {grouped.length === 0 ? (
            <Card>
              <Text className="text-sm text-ink-soft">No tests match "{search}".</Text>
            </Card>
          ) : (
            grouped.map((group) => (
              <Card key={group.classId}>
                <View className="mb-3 flex-row items-center justify-between gap-2">
                  <Text className="text-xs font-bold uppercase tracking-wide text-ink-faint">{group.className}</Text>
                  <Pressable
                    className={btnSecondary}
                    onPress={() => setCreateForClass({ id: group.classId, name: group.className })}
                  >
                    <Text className="text-xs font-semibold text-pen-deep">+ New test</Text>
                  </Pressable>
                </View>
                <View>
                  {group.tests.map((test, index) => (
                    <View
                      key={test.id}
                      className={`flex-row items-center gap-3 py-3 ${index > 0 ? "border-t border-line" : ""}`}
                    >
                      <View className="flex-1" style={{ minWidth: 0 }}>
                        <Text className="text-sm font-bold text-ink" numberOfLines={2}>
                          {test.title}
                        </Text>
                      </View>
                      <Pressable onPress={() => onSelect(test)} className={btnPrimary}>
                        <Text className="text-sm font-bold text-white">Grade</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <View className="items-end">
        <Pressable className={btnSecondary} onPress={() => router.replace("/(teacher)")}>
          <Text className="text-sm font-bold text-ink">Back to dashboard</Text>
        </Pressable>
      </View>

      {createForClass ? (
        <CreateTestSheet
          visible={Boolean(createForClass)}
          classId={createForClass.id}
          className={createForClass.name}
          onClose={() => setCreateForClass(null)}
          onCreated={async (test) => {
            setCreateForClass(null);
            await reloadTests();
            onSelect(test);
          }}
          onStatus={(message, type) => {
            if (type === "error") setStatusMessage(message);
            else {
              setStatusMessage(message);
              void reloadTests();
            }
          }}
        />
      ) : null}
    </View>
  );
}
