export const UPLOAD_PROGRESS_SHARE = 25;

export type WorkProgress = {
  percent: number;
  label: string;
};

export function combineUploadAndServerProgress(
  uploadRatio: number,
  serverPercent: number | null,
): number {
  const clampedUpload = Math.min(1, Math.max(0, uploadRatio));
  const uploadPart = clampedUpload * UPLOAD_PROGRESS_SHARE;
  if (serverPercent == null) {
    return Math.round(uploadPart);
  }
  const clampedServer = Math.min(100, Math.max(0, serverPercent));
  return Math.round(UPLOAD_PROGRESS_SHARE + (clampedServer / 100) * (100 - UPLOAD_PROGRESS_SHARE));
}

export function parseNdjsonLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function consumeNdjsonBuffer(buffer: string): {
  remaining: string;
  events: Record<string, unknown>[];
} {
  const events: Record<string, unknown>[] = [];
  const parts = buffer.split("\n");
  const remaining = parts.pop() ?? "";
  for (const part of parts) {
    const event = parseNdjsonLine(part);
    if (event) events.push(event);
  }
  return { remaining, events };
}

type PostFormDataWithProgressOptions = {
  url: string;
  formData: FormData;
  headers?: Record<string, string>;
  onProgress: (progress: WorkProgress) => void;
};

export type ProgressHttpResult = {
  status: number;
  contentType: string;
  text: string;
  events: Record<string, unknown>[];
};

function headerMap(xhr: XMLHttpRequest): string {
  return xhr.getResponseHeader("content-type") ?? "";
}

/**
 * POST multipart with real upload bytes, then parse streamed NDJSON progress
 * lines from the response when the server sends `application/x-ndjson`.
 */
export function postFormDataWithProgress(
  options: PostFormDataWithProgressOptions,
): Promise<ProgressHttpResult> {
  const { url, formData, headers, onProgress } = options;
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/x-ndjson, application/json");
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }
    }

    let buffer = "";
    const events: Record<string, unknown>[] = [];
    let serverPercent: number | null = null;
    let seenLength = 0;

    function applyEvents(next: Record<string, unknown>[]) {
      for (const event of next) {
        events.push(event);
        if (event.type === "progress") {
          const percent = typeof event.percent === "number" ? event.percent : 0;
          const label = typeof event.label === "string" ? event.label : "Working…";
          serverPercent = percent;
          onProgress({
            percent: combineUploadAndServerProgress(1, percent),
            label,
          });
        }
      }
    }

    const ingest = () => {
      const text = xhr.responseText ?? "";
      if (text.length <= seenLength) return;
      const chunk = text.slice(seenLength);
      seenLength = text.length;
      const consumed = consumeNdjsonBuffer(buffer + chunk);
      buffer = consumed.remaining;
      applyEvents(consumed.events);
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress({
        percent: combineUploadAndServerProgress(event.loaded / event.total, null),
        label: "Uploading…",
      });
    };

    xhr.upload.onload = () => {
      onProgress({
        percent: combineUploadAndServerProgress(1, serverPercent),
        label: serverPercent == null ? "Working…" : "Uploading…",
      });
    };

    xhr.onprogress = ingest;
    xhr.onload = () => {
      ingest();
      if (buffer.trim()) {
        const last = parseNdjsonLine(buffer);
        if (last) applyEvents([last]);
        buffer = "";
      }
      resolve({
        status: xhr.status,
        contentType: headerMap(xhr),
        text: xhr.responseText ?? "",
        events,
      });
    };
    xhr.onerror = () => reject(new Error("Network request failed."));
    xhr.ontimeout = () => reject(new Error("Request timed out."));
    xhr.send(formData);
  });
}

export function resultFromProgressHttp(result: ProgressHttpResult): {
  status: number;
  payload: Record<string, unknown>;
} {
  const errorEvent = [...result.events].reverse().find((event) => event.type === "error");
  if (errorEvent) {
    const status = typeof errorEvent.status === "number" ? errorEvent.status : result.status || 500;
    return { status, payload: errorEvent };
  }
  const resultEvent = [...result.events].reverse().find((event) => event.type === "result");
  if (resultEvent) {
    const { type: _type, ...payload } = resultEvent;
    return { status: result.status || 200, payload };
  }
  try {
    const parsed = JSON.parse(result.text) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return { status: result.status, payload: parsed as Record<string, unknown> };
    }
  } catch {
    // fall through
  }
  return { status: result.status, payload: { error: result.text.slice(0, 200) } };
}
