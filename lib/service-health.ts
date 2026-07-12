import { resolveGraiderApiUrl } from "@/lib/graider-fetch";

export type HealthServiceName = "api" | "database" | "worker";

export type HealthServiceStatus = "ok" | "error";

export type HealthServiceResult = {
  status: HealthServiceStatus;
  message?: string;
};

export type HealthReport = {
  ok: boolean;
  checkedAt: string;
  services: Record<HealthServiceName, HealthServiceResult>;
};

const SERVICE_LABELS: Record<HealthServiceName, string> = {
  api: "API",
  database: "Database",
  worker: "Grading worker",
};

const HEALTH_PATH = "/api/health";
const FETCH_TIMEOUT_MS = 8_000;

export const SERVICE_HEALTH_POLL_MS = 45_000;

export async function fetchServiceHealth(): Promise<HealthReport> {
  const url = resolveGraiderApiUrl(HEALTH_PATH);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Health check timed out — is the API running?");
    }
    throw new Error("Can't reach the Graider API — check your connection and EXPO_PUBLIC_APP_URL.");
  } finally {
    clearTimeout(timer);
  }

  let payload: HealthReport;
  try {
    payload = (await response.json()) as HealthReport;
  } catch {
    throw new Error("API returned an invalid health response.");
  }

  if (!response.ok && payload.ok) {
    return { ...payload, ok: false };
  }

  return payload;
}

export function formatServiceHealthBanner(report: HealthReport | null, fetchError: string | null): string | null {
  if (fetchError) return fetchError;
  if (!report || report.ok) return null;

  const down = (Object.keys(SERVICE_LABELS) as HealthServiceName[])
    .filter((name) => report.services[name]?.status !== "ok")
    .map((name) => {
      const detail = report.services[name]?.message;
      const label = SERVICE_LABELS[name];
      return detail ? `${label} (${detail})` : label;
    });

  if (down.length === 0) return null;

  const joined =
    down.length === 1 ? down[0] : down.length === 2 ? `${down[0]} and ${down[1]}` : `${down.slice(0, -1).join(", ")}, and ${down.at(-1)}`;

  return `${joined} unavailable — grading may not work until services recover.`;
}
