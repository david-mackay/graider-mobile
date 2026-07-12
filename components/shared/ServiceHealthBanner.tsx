import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { formatServiceHealthBanner } from "@/lib/service-health";
import type { HealthReport } from "@/lib/service-health";

type ServiceHealthBannerProps = {
  report: HealthReport | null;
  fetchError: string | null;
};

export default function ServiceHealthBanner({ report, fetchError }: ServiceHealthBannerProps) {
  const insets = useSafeAreaInsets();
  const message = formatServiceHealthBanner(report, fetchError);
  if (!message) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityRole="alert"
      className="absolute left-0 right-0 z-50 border-b border-amber-700/20 bg-amber-50/95 px-4 py-2"
      style={{ top: 0, paddingTop: Math.max(insets.top, 8) }}
    >
      <Text className="text-center text-xs font-semibold leading-4 text-amber-950">{message}</Text>
    </View>
  );
}
