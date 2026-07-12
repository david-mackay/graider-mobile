import AsyncStorage from "@react-native-async-storage/async-storage";
import { ALL_CLASSES_VALUE } from "@/lib/dashboard-client";
import type { DashboardAttempt, DashboardClass, DashboardTest } from "@/lib/dashboard-types";

const STORAGE_KEY = "graider:last-class-id";

export async function getStoredClassId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setStoredClassId(classId: string): Promise<void> {
  if (classId === ALL_CLASSES_VALUE) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, classId);
  } catch {
    // ignore persistence errors
  }
}

/** Pick the best default class — never returns ALL when classes exist. */
export function pickDefaultClassId(
  classes: DashboardClass[],
  tests: DashboardTest[],
  attempts: DashboardAttempt[],
  storedId: string | null,
): string {
  if (classes.length === 0) return ALL_CLASSES_VALUE;
  if (storedId && classes.some((c) => c.id === storedId)) return storedId;

  const activity = new Map<string, number>();
  for (const attempt of attempts) {
    if (!attempt.test_class_id) continue;
    activity.set(attempt.test_class_id, (activity.get(attempt.test_class_id) ?? 0) + 1);
  }
  for (const test of tests) {
    activity.set(test.class_id, (activity.get(test.class_id) ?? 0) + 1);
  }

  let bestId = classes[0].id;
  let bestScore = -1;
  for (const cls of classes) {
    const score = activity.get(cls.id) ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestId = cls.id;
    }
  }
  if (bestScore > 0) return bestId;

  const byRecency = [...classes].sort((a, b) => {
    const aTime = a.updated_at ?? a.created_at ?? "";
    const bTime = b.updated_at ?? b.created_at ?? "";
    return bTime.localeCompare(aTime);
  });
  return byRecency[0]?.id ?? classes[0].id;
}
