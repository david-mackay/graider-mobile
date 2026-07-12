import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="grade" />
      <Stack.Screen name="tests/[testId]" />
      <Stack.Screen name="students/[studentId]" />
      <Stack.Screen name="tests/bulk-release" />
      <Stack.Screen name="tests/print-settings" />
    </Stack>
  );
}
