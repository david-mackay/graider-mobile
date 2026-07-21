import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Picker } from '@react-native-picker/picker';
import { useState } from "react";
import { Badge, btnPrimary, btnSecondary } from "@/components/shared/ui";
import { IconCheck, IconCopy, IconX } from "@/components/shared/icons";
import { handleJson } from "@/lib/dashboard-client";
import { useGraiderFetch } from "@/lib/graider-fetch";
import type { Invitation } from "@/lib/dashboard-types";

type InvitesPanelProps = {
  classId: string;
  invitations: Invitation[];
  onChange: () => void | Promise<void>;
  onStatus: (message: string, type?: "info" | "error") => void;
  isBusy: boolean;
  setBusy: (value: boolean) => void;
};

function getInviteStatus(invite: Invitation): "active" | "expired" | "accepted" {
  if (invite.status === "accepted") return "accepted";
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return "expired";
  return "active";
}

function formatExpiry(invite: Invitation): string {
  if (!invite.expires_at) return "No expiry";
  const exp = new Date(invite.expires_at);
  const now = new Date();
  if (exp < now) return "Expired";
  const diffMs = exp.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "Expires tomorrow";
  return `Expires in ${diffDays} days`;
}

export default function InvitesPanel({
  classId,
  invitations,
  onChange,
  onStatus,
  isBusy,
  setBusy,
}: InvitesPanelProps) {
  const graiderFetch = useGraiderFetch();
  const [inviteExpiry, setInviteExpiry] = useState("0");
  const [singleUse, setSingleUse] = useState(true);
  const [studentName, setStudentName] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function generateInvite(role: "student" | "teacher") {
    if (role === "student" && !studentName.trim()) {
      onStatus("Enter the student’s name for a student invite.", "error");
      return;
    }
    setBusy(true);
    try {
      const expiresInDays = Number(inviteExpiry) || undefined;
      await handleJson(
        await graiderFetch(`/api/classes/${classId}/invite`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invited_email: null,
            invited_name: role === "student" ? studentName.trim() : null,
            role,
            expires_in_days: expiresInDays,
            single_use: role === "student" ? true : singleUse,
          }),
        }),
      );
      onStatus(`New ${role} invite code generated.`);
      if (role === "student") setStudentName("");
      await onChange();
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function deleteInvite(invitationId: string) {
    setBusy(true);
    try {
      await handleJson(
        await graiderFetch(`/api/classes/${classId}/invite`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ invitationId }),
        }),
      );
      onStatus("Invite code deleted.");
      await onChange();
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode(id: string, code: string) {
    try {
      await Clipboard.setStringAsync(code);
      setCopiedId(id);
      onStatus("Invite code copied. Students enter it when signing up.");
      setTimeout(() => setCopiedId((c) => (c === id ? "" : c)), 2000);
    } catch (error) {
      if (error instanceof Error) onStatus(error.message, "error");
    }
  }

  return (
    <View className="mt-3 space-y-4 border-t border-line pt-3">
      <View className="gap-2">
        <Text className="text-xs font-medium text-ink-soft">Student name (required for student invites)</Text>
        <TextInput
          value={studentName}
          onChangeText={setStudentName}
          placeholder="e.g. Maya Patel"
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
          placeholderTextColor="#9CA3AF"
        />
      </View>
      <View className="flex-row flex-wrap items-end gap-2">
        <View className="border border-line rounded-lg bg-paper overflow-hidden">
          <Text className="text-xs font-medium text-ink-soft px-2 pt-1">Expiry</Text>
          <Picker
            selectedValue={inviteExpiry}
            onValueChange={(val) => setInviteExpiry(val)}
            style={{ height: 100, width: 130 }}
            itemStyle={{ fontSize: 12, height: 100 }}
          >
            <Picker.Item label="No expiry" value="0" />
            <Picker.Item label="1 day" value="1" />
            <Picker.Item label="7 days" value="7" />
            <Picker.Item label="30 days" value="30" />
          </Picker>
        </View>
        <TouchableOpacity
          disabled={isBusy}
          onPress={() => void generateInvite("student")}
          className={`${btnPrimary} py-1.5 px-3`}
        >
          <Text className="text-white font-medium text-xs">+ Student code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isBusy}
          onPress={() => void generateInvite("teacher")}
          className={`${btnSecondary} py-1.5 px-3`}
        >
          <Text className="text-pen-deep font-medium text-xs">+ Teacher code</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={isBusy}
          onPress={() => setSingleUse((v) => !v)}
          className={`rounded-full border px-3 py-1.5 ${singleUse ? "border-pen bg-pen-wash" : "border-line bg-paper"}`}
        >
          <Text className={`text-xs font-medium ${singleUse ? "text-pen-deep" : "text-ink-soft"}`}>
            {singleUse ? "Single-use on" : "Reusable"}
          </Text>
        </TouchableOpacity>
      </View>

      {invitations.length === 0 ? (
        <Text className="text-xs text-ink-faint">No invite codes yet. Generate one above.</Text>
      ) : (
        <View className="space-y-1.5">
          {invitations.map((inv) => {
            const derivedStatus = getInviteStatus(inv);
            return (
              <View
                key={inv.id}
                className={`flex-row flex-wrap items-center gap-2 rounded-lg border px-3 py-2 ${
                  derivedStatus === "accepted"
                    ? "border-line-soft bg-cream/50"
                    : derivedStatus === "expired"
                      ? "border-red-100 bg-pen-wash/30"
                      : "border-line bg-cream"
                }`}
              >
                <Text className="font-mono font-semibold text-xs text-pen-deep">{inv.code}</Text>
                <Badge variant={inv.role === "teacher" ? "blue" : "gray"}>{inv.role}</Badge>
                <Badge variant={derivedStatus === "active" ? "green" : derivedStatus === "expired" ? "yellow" : "gray"}>
                  {derivedStatus}
                </Badge>
                {inv.single_use !== false ? (
                  <Badge variant="gray">Single-use</Badge>
                ) : (
                  <Badge variant="blue">Reusable</Badge>
                )}
                <Text className="text-xs text-ink-faint">
                  {derivedStatus === "accepted" && inv.accepted_by_name
                    ? inv.accepted_by_name
                    : formatExpiry(inv)}
                </Text>
                <View className="ml-auto flex-row items-center gap-1.5">
                  {derivedStatus === "active" ? (
                    <TouchableOpacity
                      onPress={() => void copyCode(inv.id, inv.code)}
                      className="flex-row items-center gap-1 rounded-md px-1.5 py-0.5"
                    >
                      {copiedId === inv.id ? (
                        <IconCheck className="h-3 w-3 text-moss" />
                      ) : (
                        <IconCopy className="h-3 w-3 text-ink-soft" />
                      )}
                    </TouchableOpacity>
                  ) : null}
                  {derivedStatus !== "accepted" ? (
                    <TouchableOpacity
                      disabled={isBusy}
                      onPress={() => void deleteInvite(inv.id)}
                      className="rounded-md px-1.5 py-0.5"
                    >
                      <IconX className="h-3 w-3 text-ink-faint" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
