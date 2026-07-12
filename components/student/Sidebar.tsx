import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Pressable } from 'react-native';
"use client";

import { IconClipboard, IconHome } from "@/components/shared/icons";
import { ALL_CLASSES_VALUE } from "@/lib/dashboard-client";
import type { ActiveView, DashboardClass } from "@/lib/dashboard-types";

type StudentNavItem = { id: ActiveView; label: string; Icon: (props: { className?: string }) => React.ReactNode };

const NAV_ITEMS: StudentNavItem[] = [
  { id: "classes", label: "My Classes", Icon: IconHome },
  { id: "tests", label: "My Tests", Icon: IconClipboard },
];

type StudentSidebarProps = {
  classes: DashboardClass[];
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  profileName: string | null;
};

export default function StudentSidebar({
  classes,
  selectedClassId,
  onSelectClass,
  activeView,
  onNavigate,
  profileName,
}: StudentSidebarProps) {
  return (
    <View className="flex flex-col h-full">
      {/* Class selector — students see their enrolled classes */}
      {classes.length > 1 ? (
        <View className="p-4 border-b border-line/60">
          <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-pen-soft">Active class</Text>
          <select
            className="w-full cursor-pointer rounded-lg border border-line bg-cream/40 px-3 py-2 text-sm text-ink outline-none focus:border-pen-soft focus:ring-2 focus:ring-line-soft transition-colors duration-150"
            value={selectedClassId}
            onChangeText={(e) => onSelectClass(e.target.value)}
          >
            <option value={ALL_CLASSES_VALUE}>All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </View>
      ) : null}

      <nav className="flex-1 p-3 space-y-0.5" aria-label="Student navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              type="button"
              onPress={() => onNavigate(item.id)}
              className={`cursor-pointer w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                isActive ? "bg-pen-wash text-pen-deep" : "text-ink-soft hover:bg-cream/50 hover:text-pen-deep"
              }`}
            >
              <item.Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-pen" : "text-ink-faint"}`} />
              {item.label}
            </TouchableOpacity>
          );
        })}
      </nav>

      {profileName ? (
        <View className="p-4 border-t border-line/60">
          <View className="flex items-center gap-2.5">
            <View className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-cream-deep text-xs font-bold text-pen">
              {profileName.charAt(0).toUpperCase()}
            </View>
            <View className="min-w-0">
              <Text className="truncate text-sm font-semibold text-ink">{profileName}</Text>
              <Text className="text-xs text-ink-faint">Student</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
