import { View } from "react-native";
import TeacherDashboard from "@/components/teacher/TeacherDashboard";

export default function TeacherHomePage() {
  return (
    <View className="flex-1 bg-cream">
      <TeacherDashboard />
    </View>
  );
}
