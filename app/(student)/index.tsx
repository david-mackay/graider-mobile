import { View } from "react-native";
import StudentDashboard from "@/components/student/StudentDashboard";

export default function StudentHomePage() {
  return (
    <View className="flex-1 bg-cream">
      <StudentDashboard />
    </View>
  );
}
