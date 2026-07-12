export const ALL_CLASSES_VALUE = "__all__";

export function normalizeTopic(topic: string | null | undefined): string {
  const trimmed = topic?.trim();
  return trimmed ? trimmed : "General";
}

export async function handleJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const text = await response.text();

  let payload: { error?: string; code?: string; [key: string]: unknown } = {};
  if (text.trim().length > 0 && contentType.includes("application/json")) {
    try {
      payload = JSON.parse(text) as { error?: string; code?: string; [key: string]: unknown };
    } catch {
      if (!response.ok) throw new GraiderApiError("Unexpected response format", response.status);
      payload = {};
    }
  } else if (text.trim().length > 0) {
    if (!response.ok) throw new GraiderApiError(text, response.status);
  }

  if (!response.ok) {
    const fallback =
      response.status === 404
        ? "This action is not available on the server yet. Deploy the latest Graider backend."
        : response.status >= 500
          ? "Server error — try again in a moment."
          : "Unexpected error";
    throw new GraiderApiError(payload.error ?? fallback, response.status, payload.code);
  }
  return payload as T;
}

export class GraiderApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "GraiderApiError";
    this.status = status;
    this.code = code;
  }
}

export type StatusType = "info" | "error";

export type AttemptAnswerPayload = { question_id: string; answer: string };

export type LegacyReleaseShape = {
  grades_released?: boolean;
  release_status?: "ready" | "grading" | "released" | null;
};

export function resolveReleaseState(input: LegacyReleaseShape): "ready" | "grading" | "released" {
  if (input.release_status === "ready" || input.release_status === "grading" || input.release_status === "released") {
    return input.release_status;
  }
  return input.grades_released ? "released" : "ready";
}
