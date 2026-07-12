import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { useMemo, useState } from "react";
import { Card } from "@/components/shared/ui";
import RosterStudentRow from "@/components/shared/RosterStudentRow";
import { searchAndSortRoster, duplicateNameCounts, rosterDisplayLabel } from "@/lib/roster-display";
import type { RosterEntry } from "@/lib/types";

type StepPickStudentProps = {
  roster: RosterEntry[];
  rosterLoading: boolean;
  rosterError: string;
  sessionStudentIds: Set<string>;
  onSelect: (studentId: string, studentName: string) => void;
  onResume: (studentId: string) => void;
  onBack: () => void;
};

export default function StepPickStudent({
  roster,
  rosterLoading,
  rosterError,
  sessionStudentIds,
  onSelect,
  onResume,
  onBack,
}: StepPickStudentProps) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => searchAndSortRoster(roster, query), [roster, query]);
  const showSuggestions = query.trim().length > 0;

  return (
    <View className="gap-4">
      <Card>
        <Text className="text-base font-semibold text-ink">Who are you grading?</Text>
        <Text className="mt-1 text-sm text-ink-soft">
          Search by first or last name — email shows for students with the same name.
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Type a name…"
          className="mt-4 rounded-xl border border-line bg-cream px-4 py-3 text-base text-ink"
          autoCorrect={false}
          autoCapitalize="words"
          autoFocus
        />
        {!showSuggestions && roster.length > 0 ? (
          <Text className="mt-2 text-xs text-ink-faint">
            {roster.length} students — start typing to filter
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
      ) : (
        <ScrollView className="max-h-[420px]" keyboardShouldPersistTaps="handled">
          {(showSuggestions ? suggestions : suggestions).length === 0 ? (
            <Card>
              <Text className="py-6 text-center text-sm text-ink-soft">
                {roster.length === 0 ? "No students in this class yet." : `No matches for "${query.trim()}".`}
              </Text>
            </Card>
          ) : (
            (showSuggestions ? suggestions : suggestions).map((entry) => {
              const inSession = sessionStudentIds.has(entry.user_id);
              return (
                <TouchableOpacity
                  key={entry.user_id}
                  onPress={() => {
                    const { primaryLabel } = rosterDisplayLabel(entry, duplicateNameCounts(roster));
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
            })
          )}
        </ScrollView>
      )}

      <TouchableOpacity onPress={onBack} className="self-start rounded-full px-4 py-2">
        <Text className="text-sm font-medium text-pen-deep">Back</Text>
      </TouchableOpacity>
    </View>
  );
}
