import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import TestPrintSettingsView from "@/components/teacher/TestPrintSettingsView";

export default function PrintSettingsScreen() {
  const params = useLocalSearchParams<{ testId?: string; classId?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <TestPrintSettingsView testId={params.testId} classId={params.classId} />
    </SafeAreaView>
  );
}
