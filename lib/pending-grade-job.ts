/** Survives screen remounts and the signed-in index redirect racing a push tap. */
let pendingGradeJobId: string | null = null;

export function setPendingGradeJobId(jobId: string): void {
  if (jobId.trim()) pendingGradeJobId = jobId.trim();
}

export function peekPendingGradeJobId(): string | null {
  return pendingGradeJobId;
}

export function takePendingGradeJobId(): string | null {
  const id = pendingGradeJobId;
  pendingGradeJobId = null;
  return id;
}

/** Expo Router search params are sometimes `string[]`. */
export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "undefined" || trimmed === "null") return undefined;
  return trimmed;
}
