import { View, Text, Pressable } from "react-native";
import { Link } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark, Wordmark } from "@/components/shared/Brand";
import { IconBook, IconClipboard, IconHome, IconPen, IconUsers } from "@/components/shared/icons";
import { ALL_CLASSES_VALUE } from "@/lib/dashboard-client";
import type { ActiveView, DashboardClass } from "@/lib/dashboard-types";

type TeacherNavItem = {
  id: ActiveView;
  label: string;
  Icon: (props: { className?: string; color?: string }) => React.ReactNode;
};

const LEFT_NAV: TeacherNavItem[] = [
  { id: "classes", label: "Classes", Icon: IconHome },
  { id: "questions", label: "Questions", Icon: IconBook },
];

const RIGHT_NAV: TeacherNavItem[] = [
  { id: "tests", label: "Tests", Icon: IconClipboard },
  { id: "students", label: "Students", Icon: IconUsers },
];

function NavTab({
  item,
  isActive,
  onPress,
}: {
  item: TeacherNavItem;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="min-w-[72px] flex-1 items-center justify-center py-2">
      <item.Icon className={`mb-1 h-6 w-6 ${isActive ? "text-pen" : "text-ink-faint"}`} />
      <Text className={`text-[10px] font-bold ${isActive ? "text-pen-deep" : "text-ink-soft"}`}>{item.label}</Text>
    </Pressable>
  );
}

export function TeacherTopBar({
  activeClassName,
  profileName,
  subscriptionLabel,
  onManageSubscription,
}: {
  activeClassName: string | null;
  profileName: string | null;
  subscriptionLabel?: string | null;
  onManageSubscription?: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-b border-line bg-paper px-4 py-3"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2.5" style={{ minWidth: 0 }}>
          <BrandMark className="h-8 w-8" />
          <View className="flex-1" style={{ minWidth: 0 }}>
            <Wordmark className="text-lg" />
            {activeClassName ? (
              <Text className="text-xs font-bold text-ink-soft" numberOfLines={1}>
                {activeClassName}
              </Text>
            ) : (
              <Text className="text-xs text-ink-faint">Teacher workspace</Text>
            )}
          </View>
        </View>
        <View className="flex-row items-center gap-2">
          {subscriptionLabel && onManageSubscription ? (
            <Pressable
              onPress={onManageSubscription}
              className="rounded-full border border-line bg-cream px-2.5 py-1.5"
            >
              <Text className="text-[10px] font-bold uppercase tracking-wide text-pen-deep">
                {subscriptionLabel}
              </Text>
            </Pressable>
          ) : null}
          {profileName ? (
            <View className="h-9 w-9 items-center justify-center rounded-full bg-cream-deep">
              <Text className="font-display text-sm font-bold text-pen">
                {profileName.charAt(0).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function TeacherBottomNav({
  activeView,
  onNavigate,
}: {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 z-20 border-t border-line bg-paper shadow-paper"
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
    >
      <View className="flex-row items-end justify-between px-1 pt-2">
        <View className="flex-1 flex-row justify-around">
          {LEFT_NAV.map((item) => (
            <NavTab
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              onPress={() => onNavigate(item.id)}
            />
          ))}
        </View>

        <Link href="/(teacher)/grade" asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Grade stack"
            className="-mt-7 mx-2 h-[58px] w-[58px] items-center justify-center rounded-full border-4 border-paper bg-pen shadow-paper"
          >
            <IconPen className="h-7 w-7 text-white" />
          </Pressable>
        </Link>

        <View className="flex-1 flex-row justify-around">
          {RIGHT_NAV.map((item) => (
            <NavTab
              key={item.id}
              item={item}
              isActive={activeView === item.id}
              onPress={() => onNavigate(item.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export function activeClassLabel(classes: DashboardClass[], selectedClassId: string): string | null {
  if (selectedClassId === ALL_CLASSES_VALUE) return null;
  return classes.find((c) => c.id === selectedClassId)?.name ?? null;
}
