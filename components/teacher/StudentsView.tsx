import { View, Text, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react-native";
import {
  Card,
  FormField,
  GraiderTextInput,
  SectionHeader,
  btnPrimary,
  btnSecondaryBlock,
} from "@/components/shared/ui";
import FormSheet from "@/components/shared/FormSheet";
import IconButton from "@/components/shared/IconButton";
import { IconUsers } from "@/components/shared/icons";
import { GraiderApiError, handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { ClassMember, DashboardAttempt } from "@/lib/dashboard-types";

type StudentsViewProps = {
  classId: string | null;
  className: string | null;
  members: ClassMember[];
  attemptsInScope: DashboardAttempt[];
  onChanged: () => void | Promise<void>;
  onStatus: (message: string, type?: "info" | "error") => void;
  onGoToClasses: () => void;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

export default function StudentsView({
  classId,
  className,
  members,
  attemptsInScope,
  onChanged,
  onStatus,
  onGoToClasses,
  isBusy,
  setBusy,
}: StudentsViewProps) {
  const router = useRouter();
  const graiderFetch = useGraiderFetch();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<ClassMember | null>(null);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  const teachers = members.filter((m) => m.role === "teacher");
  const students = members.filter((m) => m.role === "student");

  const attemptsByStudent = useMemo(() => {
    const map = new Map<string, { submitted: number; graded: number; totalScore: number; maxScore: number }>();
    for (const attempt of attemptsInScope) {
      const existing = map.get(attempt.student_id) ?? { submitted: 0, graded: 0, totalScore: 0, maxScore: 0 };
      existing.submitted += 1;
      if (attempt.status === "graded") {
        existing.graded += 1;
        existing.totalScore += attempt.total_marks ?? 0;
        existing.maxScore += attempt.max_marks ?? 0;
      }
      map.set(attempt.student_id, existing);
    }
    return map;
  }, [attemptsInScope]);

  function openAddModal() {
    setNewName("");
    setNewEmail("");
    setAddModalOpen(true);
  }

  function openStudentDetail(member: ClassMember) {
    if (!classId) return;
    router.push({
      pathname: "/(teacher)/students/[studentId]",
      params: {
        studentId: member.user_id,
        classId,
        className: className ?? "",
        studentName: member.full_name ?? "",
        studentEmail: member.email ?? "",
      },
    });
  }

  function openEditModal(member: ClassMember) {
    setEditingMember(member);
    setEditName(member.full_name ?? "");
    setEditEmail(member.email ?? "");
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingMember(null);
  }

  async function addStudent() {
    if (!classId || !newName.trim()) {
      onStatus("Enter a student name.", "error");
      return;
    }
    setBusy(true);
    try {
      const body: { full_name: string; email?: string } = { full_name: newName.trim() };
      const trimmedEmail = newEmail.trim();
      if (trimmedEmail) body.email = trimmedEmail;

      await handleJson(
        await graiderFetch(`/api/classes/${classId}/students`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      setAddModalOpen(false);
      onStatus("Student added.");
      await onChanged();
    } catch (error) {
      if (error instanceof GraiderApiError && error.status === 404) {
        onStatus(
          "Student roster API is not on the server yet. Deploy the latest Graider backend, then try again.",
          "error",
        );
        return;
      }
      onStatus(error instanceof Error ? error.message : "Failed to add student.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!classId || !editingMember || !editName.trim()) {
      onStatus("Student name is required.", "error");
      return;
    }
    setBusy(true);
    try {
      const body: { full_name: string; email?: string | null } = { full_name: editName.trim() };
      const trimmedEmail = editEmail.trim();
      body.email = trimmedEmail ? trimmedEmail : null;

      await handleJson(
        await graiderFetch(`/api/classes/${classId}/students/${editingMember.user_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      closeEditModal();
      onStatus("Student updated.");
      await onChanged();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Failed to update student.", "error");
    } finally {
      setBusy(false);
    }
  }

  function confirmRemove(member: ClassMember) {
    Alert.alert(
      "Remove student?",
      `Remove ${member.full_name ?? "this student"} from ${className ?? "this class"}? Their graded papers stay in your test history.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => void removeStudent(member.user_id),
        },
      ],
    );
  }

  async function removeStudent(studentId: string) {
    if (!classId) return;
    setBusy(true);
    try {
      await handleJson(
        await graiderFetch(`/api/classes/${classId}/students/${studentId}`, {
          method: "DELETE",
        }),
      );
      if (editingMember?.user_id === studentId) closeEditModal();
      onStatus("Student removed.");
      await onChanged();
    } catch (error) {
      onStatus(error instanceof Error ? error.message : "Failed to remove student.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="gap-6">
      <SectionHeader
        title="Students"
        subtitle={
          className
            ? `${className} · ${students.length} student${students.length !== 1 ? "s" : ""}`
            : "Open a class to manage your roster."
        }
        action={
          classId ? (
            <Pressable className={btnPrimary} onPress={openAddModal}>
              <Text className="text-sm font-bold text-white">+ Add</Text>
            </Pressable>
          ) : undefined
        }
      />

      {!classId ? (
        <Card className="items-center py-10">
          <View className="mb-3 h-10 w-10 items-center justify-center rounded-full bg-pen-wash">
            <IconUsers className="h-5 w-5 text-ink-faint" />
          </View>
          <Text className="text-sm font-semibold text-ink">No class selected</Text>
          <Text className="mt-1 text-xs text-ink-faint">Open a class first to manage students.</Text>
          <Pressable className={`${btnSecondaryBlock} mt-4 px-5`} onPress={onGoToClasses}>
            <Text className="text-sm font-medium text-pen-deep">Go to Classes</Text>
          </Pressable>
        </Card>
      ) : (
        <>
          {teachers.length > 0 ? (
            <View>
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-pen-soft">Teachers</Text>
              <View className="gap-2">
                {teachers.map((member) => (
                  <Card key={member.user_id}>
                    <View className="flex-row items-center gap-3">
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-pen">
                        <Text className="text-sm font-bold text-white">
                          {(member.full_name ?? member.email ?? "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-ink">{member.full_name ?? "Unnamed"}</Text>
                        <Text className="text-xs text-ink-faint">{member.email ?? "No email"}</Text>
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            </View>
          ) : null}

          <View>
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-pen-soft">
              Students · {students.length}
            </Text>
            {students.length === 0 ? (
              <Card className="items-center py-8">
                <Text className="text-sm text-ink-soft">No students yet.</Text>
                <Text className="mt-1 text-center text-xs text-ink-faint">
                  Add names and emails — Graider uses them when matching stack photos.
                </Text>
                <Pressable className={`${btnSecondaryBlock} mt-4 px-5`} onPress={openAddModal}>
                  <Text className="text-sm font-medium text-pen-deep">Add your first student</Text>
                </Pressable>
              </Card>
            ) : (
              <View className="gap-2">
                {students.map((member) => {
                  const stats = attemptsByStudent.get(member.user_id);
                  return (
                    <Card key={member.user_id}>
                      <View className="flex-row items-center gap-3">
                        <Pressable
                          className="min-w-0 flex-1 flex-row items-center gap-3"
                          onPress={() => openStudentDetail(member)}
                        >
                          <View className="h-10 w-10 items-center justify-center rounded-full bg-cream-deep">
                            <Text className="text-sm font-bold text-pen-deep">
                              {(member.full_name ?? member.email ?? "?")[0].toUpperCase()}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                              {member.full_name ?? "Unnamed"}
                            </Text>
                            <Text className="text-xs text-ink-faint" numberOfLines={1}>
                              {member.email ?? "No email on file"}
                            </Text>
                            {stats ? (
                              <Text className="mt-1 text-xs text-ink-soft">
                                {stats.graded > 0
                                  ? `${stats.totalScore}/${stats.maxScore} across ${stats.graded} graded`
                                  : `${stats.submitted} submission${stats.submitted !== 1 ? "s" : ""}`}
                              </Text>
                            ) : (
                              <Text className="mt-1 text-xs text-ink-faint">Tap to view history</Text>
                            )}
                          </View>
                        </Pressable>
                        <View className="flex-row items-center gap-2">
                          <IconButton
                            icon={Pencil}
                            accessibilityLabel="Edit student"
                            onPress={() => openEditModal(member)}
                            disabled={isBusy}
                          />
                          <IconButton
                            icon={Trash2}
                            accessibilityLabel="Remove student"
                            variant="danger"
                            onPress={() => confirmRemove(member)}
                            disabled={isBusy}
                          />
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}

      <FormSheet
        visible={addModalOpen}
        title="Add student"
        subtitle="Name is required. Email helps match handwritten papers to the right student."
        onClose={() => setAddModalOpen(false)}
        primaryLabel="Save student"
        onPrimary={() => void addStudent()}
        primaryDisabled={!newName.trim() || isBusy}
        primaryLoading={isBusy}
      >
        <View className="gap-4">
          <FormField label="Name">
            <GraiderTextInput value={newName} onChangeText={setNewName} placeholder="e.g. Jamie Chen" autoFocus />
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

      <FormSheet
        visible={editModalOpen}
        title="Edit student"
        onClose={closeEditModal}
        primaryLabel="Save changes"
        onPrimary={() => void saveEdit()}
        primaryDisabled={!editName.trim() || isBusy}
        primaryLoading={isBusy}
      >
        <View className="gap-4">
          <FormField label="Name">
            <GraiderTextInput value={editName} onChangeText={setEditName} autoFocus />
          </FormField>
          <FormField label="Email (optional)">
            <GraiderTextInput
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Optional"
            />
          </FormField>
        </View>
      </FormSheet>
    </View>
  );
}
