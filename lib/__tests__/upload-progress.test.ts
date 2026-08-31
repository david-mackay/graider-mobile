import {
  combineUploadAndServerProgress,
  consumeNdjsonBuffer,
  resultFromProgressHttp,
} from "@/lib/upload-progress";

describe("combineUploadAndServerProgress", () => {
  it("uses the first 25% for upload bytes", () => {
    expect(combineUploadAndServerProgress(0, null)).toBe(0);
    expect(combineUploadAndServerProgress(1, null)).toBe(25);
    expect(combineUploadAndServerProgress(0.5, null)).toBe(13);
  });

  it("maps server work onto the remaining 75%", () => {
    expect(combineUploadAndServerProgress(1, 0)).toBe(25);
    expect(combineUploadAndServerProgress(1, 100)).toBe(100);
    expect(combineUploadAndServerProgress(1, 50)).toBe(63);
  });
});

describe("consumeNdjsonBuffer", () => {
  it("parses complete lines and keeps a partial remainder", () => {
    const first = consumeNdjsonBuffer('{"type":"progress","percent":10}\n{"type":"pro');
    expect(first.events).toEqual([{ type: "progress", percent: 10 }]);
    expect(first.remaining).toBe('{"type":"pro');
    const second = consumeNdjsonBuffer(`${first.remaining}gress","percent":40}\n`);
    expect(second.events).toEqual([{ type: "progress", percent: 40 }]);
    expect(second.remaining).toBe("");
  });
});

describe("resultFromProgressHttp", () => {
  it("prefers the result event over leftover JSON", () => {
    const parsed = resultFromProgressHttp({
      status: 200,
      contentType: "application/x-ndjson",
      text: "",
      events: [
        { type: "progress", percent: 10, label: "Working" },
        { type: "result", questions: [{ prompt: "Q" }] },
      ],
    });
    expect(parsed.status).toBe(200);
    expect(parsed.payload.questions).toEqual([{ prompt: "Q" }]);
  });

  it("uses the error event status", () => {
    const parsed = resultFromProgressHttp({
      status: 200,
      contentType: "application/x-ndjson",
      text: "",
      events: [{ type: "error", status: 422, error: "No questions" }],
    });
    expect(parsed.status).toBe(422);
    expect(parsed.payload.error).toBe("No questions");
  });
});
