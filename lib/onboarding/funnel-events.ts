import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_EVENTS = {
  EMOTIONAL_HOOK: "onboarding_emotional_hook",
  CAPABILITIES: "onboarding_capabilities",
  ANSWER_KEY: "onboarding_answer_key",
  PAPER_UPLOAD: "onboarding_paper_upload",
  FIRST_GRADE_RENDERED: "onboarding_first_grade_rendered",
  SAVE_PROGRESS: "onboarding_save_progress",
  AUTH_STARTED: "onboarding_auth_started",
  AUTH_COMPLETE: "onboarding_auth_complete",
  CLASS_SYNCED: "onboarding_class_synced",
} as const;

export type OnboardingEventName = (typeof ONBOARDING_EVENTS)[keyof typeof ONBOARDING_EVENTS];

const SESSION_KEY = "graider:onboarding:fired-events:v1";

/** In-memory dedupe for the current JS session (AsyncStorage is async). */
const firedThisSession = new Set<string>();

function analyticsUrl(): string | null {
  const base = process.env.EXPO_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/api/onboarding/analytics-stub`;
}

export function fireEvent(name: OnboardingEventName, payload?: Record<string, unknown>): void {
  if (firedThisSession.has(name)) return;
  firedThisSession.add(name);

  void AsyncStorage.getItem(SESSION_KEY)
    .then(async (raw) => {
      const prev = raw ? (JSON.parse(raw) as unknown) : [];
      const list = Array.isArray(prev) ? prev.filter((v) => typeof v === "string") : [];
      if (!list.includes(name)) {
        list.push(name);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(list));
      }
    })
    .catch(() => {
      // Persistence is best-effort.
    });

  const url = analyticsUrl();
  if (!url) return;

  const body = JSON.stringify({ name, payload, firedAt: new Date().toISOString() });
  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    // Analytics is best-effort; never break the user flow.
  });
}
