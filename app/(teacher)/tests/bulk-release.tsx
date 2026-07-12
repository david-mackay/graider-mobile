import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import BulkGradeReleaseView from "@/components/teacher/BulkGradeReleaseView";

export default function BulkReleaseScreen() {
  const params = useLocalSearchParams<{ testId?: string; classId?: string }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <BulkGradeReleaseView testId={params.testId} classId={params.classId} />
    </SafeAreaView>
  );
}
