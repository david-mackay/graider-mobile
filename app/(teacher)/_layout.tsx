import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import AppLoadingScreen from "@/components/shared/AppLoadingScreen";

export default function TeacherLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <AppLoadingScreen />;
  }

  if (!isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="grade" />
      <Stack.Screen name="tests/[testId]" />
      <Stack.Screen name="students/[studentId]" />
      <Stack.Screen name="tests/bulk-release" />
      <Stack.Screen name="tests/print-settings" />
      <Stack.Screen name="account" />
    </Stack>
  );
}
