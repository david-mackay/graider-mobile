import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import TestDetailView from "@/components/teacher/TestDetailView";

export default function TestDetailScreen() {
  const params = useLocalSearchParams<{
    testId?: string;
    classId?: string;
    className?: string;
    attemptId?: string;
  }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <TestDetailView
        testId={params.testId}
        classId={params.classId}
        className={params.className}
        initialAttemptId={params.attemptId}
      />
    </SafeAreaView>
  );
}
