import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ONBOARDING_VAULT_VERSION,
  hasAnswerKey,
  type OnboardingStep,
  type OnboardingVault,
} from "./types";

export const VAULT_KEY = "graider:onboarding:vault:v1";

export async function isVaultAvailable(): Promise<boolean> {
  try {
    const probeKey = "__graider_vault_probe__";
    await AsyncStorage.setItem(probeKey, "1");
    await AsyncStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export async function getVault(): Promise<OnboardingVault | null> {
  if (!(await isVaultAvailable())) return null;
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(VAULT_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn("[onboarding/vault] Discarding malformed vault JSON", error);
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== ONBOARDING_VAULT_VERSION
  ) {
    return null;
  }
  return parsed as OnboardingVault;
}

export async function setVault(
  update: Partial<OnboardingVault>,
): Promise<OnboardingVault | null> {
  if (!(await isVaultAvailable())) return null;
  const existing = await getVault();
  const base: OnboardingVault =
    existing ?? {
      schemaVersion: ONBOARDING_VAULT_VERSION,
      startedAt: new Date().toISOString(),
    };
  const next: OnboardingVault = {
    ...base,
    ...update,
    schemaVersion: ONBOARDING_VAULT_VERSION,
  };
  try {
    await AsyncStorage.setItem(VAULT_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("[onboarding/vault] Failed to persist vault", error);
    return null;
  }
  return next;
}

export async function clearVault(): Promise<void> {
  if (!(await isVaultAvailable())) return;
  try {
    await AsyncStorage.removeItem(VAULT_KEY);
  } catch {
    // best-effort
  }
}

export function getResumeStep(vault: OnboardingVault | null): OnboardingStep {
  if (!vault || !hasAnswerKey(vault)) return "hook";
  if (!vault.studentPaper) return "upload";
  if (!vault.sampleGrade) return "result";
  if (!vault.completedAt) return "save";
  if (vault.syncedAt) return "completed";
  return "save";
}
