import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import StudentDetailView from "@/components/teacher/StudentDetailView";

export default function StudentDetailScreen() {
  const params = useLocalSearchParams<{
    studentId?: string;
    classId?: string;
    className?: string;
    studentName?: string;
    studentEmail?: string;
    attemptId?: string;
  }>();

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={["top", "bottom"]}>
      <StudentDetailView
        studentId={params.studentId}
        classId={params.classId}
        className={params.className}
        studentName={params.studentName}
        studentEmail={params.studentEmail}
        initialAttemptId={params.attemptId}
      />
    </SafeAreaView>
  );
}
