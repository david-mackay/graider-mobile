import { View, Text, TouchableOpacity, TextInput } from 'react-native';

import { Card, FormField, SectionHeader, btnPrimary, inputClass } from "@/components/shared/ui";
import { IconHome } from "@/components/shared/icons";
import type { DashboardAttempt, DashboardClass, DashboardTest } from "@/lib/dashboard-types";

type StudentClassesViewProps = {
  classes: DashboardClass[];
  tests: DashboardTest[];
  attempts: DashboardAttempt[];
  joinCode: string;
  setJoinCode: (value: string) => void;
  joinEmail: string;
  setJoinEmail: (value: string) => void;
  onJoin: () => void;
  onSelectClass: (classId: string) => void;
  isBusy: boolean;
};

export default function StudentClassesView({
  classes,
  tests,
  attempts,
  joinCode,
  setJoinCode,
  joinEmail,
  setJoinEmail,
  onJoin,
  onSelectClass,
  isBusy,
}: StudentClassesViewProps) {
  return (
    <>
      <SectionHeader title="My Classes" subtitle="Join a class using an invite code." />

      <Card>
        <Text className="mb-4 text-sm font-semibold text-ink">Join a class</Text>
        <View className="space-y-3">
          <FormField label="Invite code">
            <TextInput
              className={inputClass}
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="Enter code from your teacher"
            />
          </FormField>
          <FormField label="Email (if required)">
            <TextInput
              className={inputClass}
              value={joinEmail}
              onChangeText={setJoinEmail}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </FormField>
          <TouchableOpacity disabled={isBusy} className={`${btnPrimary} flex-shrink-0`} onPress={onJoin}>
            <Text className="text-white font-semibold">Join</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {classes.length === 0 ? (
        <Card className="text-center py-12">
          <View className="mx-auto mb-3 items-center justify-center rounded-2xl bg-pen-wash h-12 w-12">
            <IconHome className="h-6 w-6 text-ink-faint" />
          </View>
          <Text className="text-sm font-semibold text-ink">No classes yet</Text>
          <Text className="mt-1 text-xs text-ink-faint">Ask your teacher for an invite code to get started.</Text>
        </Card>
      ) : (
        <View className="space-y-3">
          <Text className="text-xs font-semibold text-pen-soft uppercase tracking-wider">Enrolled classes</Text>
          {classes.map((entry) => {
            const classTests = tests.filter((t) => t.class_id === entry.id);
            const classAttempts = attempts.filter((a) => a.test_class_id === entry.id);
            const gradedCount = classAttempts.filter((a) => a.status === "graded").length;
            return (
              <Card key={entry.id}>
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="font-semibold text-ink">{entry.name}</Text>
                    <Text className="mt-1 text-xs text-ink-faint">
                      {classTests.length} test{classTests.length !== 1 ? "s" : ""}
                      {gradedCount > 0 ? ` · ${gradedCount} graded` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => onSelectClass(entry.id)} className={btnPrimary}>
                    <Text className="text-white font-semibold text-sm">View tests</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          })}
        </View>
      )}
    </>
  );
}
