import { SafeAreaView } from "react-native-safe-area-context";
import GradeWizard from "@/components/teacher/grade-wizard/GradeWizard";

export default function GradeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <GradeWizard />
    </SafeAreaView>
  );
}
