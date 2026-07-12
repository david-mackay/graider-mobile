import { View, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

type OnboardingShellProps = {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
};

const TOTAL_STEPS = 6;

export default function OnboardingShell({
  step,
  backHref,
  backLabel = "Back",
  children,
}: OnboardingShellProps) {
  return (
    <SafeAreaView className="flex-1 bg-cream">
      <View className="flex-1 px-4 pt-8 pb-20">
        <ProgressDots current={step} />

        {backHref ? (
          <View className="mt-6 flex-row">
            <TouchableOpacity
              onPress={() => router.replace(backHref as any)}
              className="flex-row items-center gap-1.5"
            >
              <ChevronLeft size={16} color="#6f6151" />
              <Text className="text-sm font-bold text-ink-soft">{backLabel}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View className="mt-6 flex-1 animate-rise">{children}</View>
      </View>
    </SafeAreaView>
  );
}

function ProgressDots({ current }: { current: number }) {
  return (
    <View
      className="flex-row items-center justify-center gap-2"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: TOTAL_STEPS, now: current }}
      accessibilityLabel={`Step ${current} of ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => {
        const stepNumber = i + 1;
        const isCompleted = stepNumber < current;
        const isCurrent = stepNumber === current;
        return (
          <View
            key={stepNumber}
            className={
              isCurrent
                ? "h-2 w-8 rounded-full bg-pen"
                : isCompleted
                  ? "h-2 w-2 rounded-full bg-pen/70"
                  : "h-2 w-2 rounded-full bg-line"
            }
          />
        );
      })}
    </View>
  );
}
