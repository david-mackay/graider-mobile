import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useMemo, useState } from "react";
import { Card, FormField, GraiderTextInput, btnPrimary } from "@/components/shared/ui";
import FormSheet from "@/components/shared/FormSheet";
import RosterStudentRow from "@/components/shared/RosterStudentRow";
import { searchAndSortRoster, duplicateNameCounts, rosterDisplayLabel } from "@/lib/roster-display";
import type { RosterEntry } from "@/lib/types";

type StepPickStudentProps = {
  roster: RosterEntry[];
  rosterLoading: boolean;
  rosterError: string;
  className: string | null;
  sessionStudentIds: Set<string>;
  onSelect: (studentId: string, studentName: string) => void;
  onResume: (studentId: string) => void;
  onAddStudent: (fullName: string, email: string) => Promise<void>;
  addingStudent: boolean;
  onBack: () => void;
};

export default function StepPickStudent({
  roster,
  rosterLoading,
  rosterError,
  className,
  sessionStudentIds,
  onSelect,
  onResume,
  onAddStudent,
  addingStudent,
  onBack,
}: StepPickStudentProps) {
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [addError, setAddError] = useState("");

  const results = useMemo(() => searchAndSortRoster(roster, query), [roster, query]);
  const nameCounts = useMemo(() => duplicateNameCounts(roster), [roster]);
  const typedName = query.trim();
  const noMatches = !rosterLoading && results.length === 0;

  function openAddSheet(prefill = "") {
    setAddError("");
    setNewName(prefill);
    setNewEmail("");
    setAddOpen(true);
  }

  async function saveNewStudent() {
    if (!newName.trim()) {
      setAddError("Enter a student name.");
      return;
    }
    setAddError("");
    try {
      await onAddStudent(newName.trim(), newEmail.trim());
      setAddOpen(false);
      setNewName("");
      setNewEmail("");
      setQuery("");
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to add student.");
    }
  }

  return (
    <View className="gap-4">
      <Card>
        <View className="flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-ink">Who are you grading?</Text>
            <Text className="mt-1 text-sm text-ink-soft">
              {className
                ? `Search ${className}, or add someone new to this class.`
                : "Search the roster, or add a new student."}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => openAddSheet(typedName)}
            className="rounded-full bg-pen px-3 py-2"
            accessibilityRole="button"
            accessibilityLabel="Add a new student"
          >
            <Text className="text-xs font-bold text-white">+ New</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type a name…"
          className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-base text-ink"
          autoCorrect={false}
          autoCapitalize="words"
        />
        {roster.length > 0 && typedName.length === 0 ? (
          <Text className="mt-2 text-xs text-ink-faint">
            {roster.length} student{roster.length === 1 ? "" : "s"} — start typing to filter
          </Text>
        ) : null}
      </Card>

      {rosterError ? (
        <Card className="border-pen-soft/60 bg-pen-wash">
          <Text className="text-sm text-pen-deep">{rosterError}</Text>
        </Card>
      ) : null}

      {rosterLoading ? (
        <Card>
          <View className="items-center py-8">
            <View className="h-8 w-8 animate-spin rounded-full border-4 border-pen border-t-transparent" />
            <Text className="mt-3 text-sm text-ink-soft">Loading roster…</Text>
          </View>
        </Card>
      ) : noMatches ? (
        <Card className="items-center py-6">
          <Text className="text-center text-sm text-ink-soft">
            {roster.length === 0
              ? className
                ? `No students in ${className} yet.`
                : "No students in this class yet."
              : `No matches for “${typedName}”.`}
          </Text>
          <TouchableOpacity
            onPress={() => openAddSheet(typedName)}
            className={`${btnPrimary} mt-4`}
          >
            <Text className="text-sm font-semibold text-white">
              {typedName ? `Add “${typedName}”` : "Add a student"}
            </Text>
          </TouchableOpacity>
        </Card>
      ) : (
        <ScrollView className="max-h-[420px]" keyboardShouldPersistTaps="handled">
          {results.map((entry) => {
            const inSession = sessionStudentIds.has(entry.user_id);
            return (
              <TouchableOpacity
                key={entry.user_id}
                onPress={() => {
                  const { primaryLabel } = rosterDisplayLabel(entry, nameCounts);
                  if (inSession) onResume(entry.user_id);
                  else onSelect(entry.user_id, primaryLabel);
                }}
                className={`mb-2 flex-row items-center rounded-2xl border px-4 py-4 ${
                  inSession ? "border-pen/30 bg-pen-wash/20" : "border-line bg-paper"
                }`}
              >
                <RosterStudentRow
                  entry={entry}
                  roster={roster}
                  trailing={
                    inSession ? (
                      <Text className="text-xs font-medium text-pen-deep">Add pages</Text>
                    ) : undefined
                  }
                />
              </TouchableOpacity>
            );
          })}
          {typedName.length > 0 ? (
            <TouchableOpacity
              onPress={() => openAddSheet(typedName)}
              className="mb-2 items-center rounded-2xl border border-dashed border-pen/40 bg-pen-wash/20 px-4 py-3"
            >
              <Text className="text-sm font-semibold text-pen-deep">
                Not listed? Add “{typedName}”
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <TouchableOpacity onPress={onBack} className="self-start rounded-full px-4 py-2">
        <Text className="text-sm font-medium text-pen-deep">Back</Text>
      </TouchableOpacity>

      <FormSheet
        visible={addOpen}
        title="Add student"
        subtitle={
          className
            ? `Creates them in ${className} and starts capture.`
            : "Creates them in this class and starts capture."
        }
        onClose={() => setAddOpen(false)}
        primaryLabel={addingStudent ? "Adding…" : "Add and capture"}
        onPrimary={() => void saveNewStudent()}
        primaryDisabled={!newName.trim() || addingStudent}
        primaryLoading={addingStudent}
      >
        <View className="gap-4">
          {addError ? <Text className="text-sm text-pen-deep">{addError}</Text> : null}
          <FormField label="Name">
            <GraiderTextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Jamie Chen"
              autoFocus
            />
          </FormField>
          <FormField label="Email (optional)">
            <GraiderTextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="jamie@school.edu"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </FormField>
        </View>
      </FormSheet>
    </View>
  );
}
