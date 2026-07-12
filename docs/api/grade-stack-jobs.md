# Grade Stack Jobs API Contract

## Purpose

Define async queue-based contracts for stack grading so large uploads are accepted quickly and processed out-of-band.

## Status Model

- `queued`: accepted and waiting for worker
- `processing`: worker is actively running
- `needs_review`: preview succeeded but ambiguous matches require teacher review
- `completed`: phase finished successfully
- `failed`: terminal failure; inspect `error` / `failures`
- `cancelled`: cancelled before completion

## Endpoints

### `POST /api/grade-stack/jobs/preview`

Creates an async preview job (OCR + candidate matching).

Request body:

```json
{
  "testId": "test_123",
  "classId": "class_123",
  "fileUrls": ["https://storage/.../page-1.heic"],
  "idempotencyKey": "teacher_abc:test_123:upload_hash"
}
```

Response (`202`):

```json
{
  "jobId": "job_preview_123",
  "phase": "preview",
  "status": "queued"
}
```

### `GET /api/grade-stack/jobs/:jobId`

Returns current job state and any available phase payload.

Response (`200`):

```json
{
  "id": "job_preview_123",
  "phase": "preview",
  "status": "needs_review",
  "testId": "test_123",
  "classId": "class_123",
  "attemptCount": 1,
  "preview": {
    "pages": [],
    "questionMatches": []
  },
  "commit": null,
  "failures": [],
  "error": null,
  "createdAt": "2026-05-28T12:00:00.000Z",
  "updatedAt": "2026-05-28T12:00:03.000Z"
}
```

### `POST /api/grade-stack/jobs/commit`

Creates commit job from reviewed assignments for grading + persistence.

Request body:

```json
{
  "previewJobId": "job_preview_123",
  "testId": "test_123",
  "assignments": [],
  "idempotencyKey": "teacher_abc:test_123:commit_hash"
}
```

Response (`202`):

```json
{
  "jobId": "job_commit_456",
  "phase": "commit",
  "status": "queued"
}
```

## Error Rules

- Validation failure -> `400` with error message.
- Unknown job ID -> `404`.
- Commit requested before preview terminal state -> `409`.
- Idempotent replay with same key -> return existing `jobId`.

## Client Polling Guidance

- Poll every 1.5-2.5s while status is `queued` or `processing`.
- Stop polling at terminal states: `needs_review`, `completed`, `failed`, `cancelled`.
- On `failed`, show retry action and preserve previous assignment context.
