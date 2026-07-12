# Render BullMQ Grading Service Blueprint

## Goal

Run stack grading asynchronously on Render using BullMQ so large OCR/grading jobs are durable, retryable, and decoupled from request limits.

## Service Topology

- **API Web Service**
  - Receives enqueue requests.
  - Stores job records in Postgres.
  - Pushes jobs to BullMQ queues.
  - Exposes status polling endpoints.

- **Background Worker Service**
  - Consumes BullMQ jobs.
  - Executes OCR/matching/grading phases.
  - Writes status + payloads/failures to Postgres.

- **Render Redis**
  - BullMQ transport and delayed retry scheduling.

- **Object Storage**
  - Holds uploaded stack image files.
  - Queue jobs carry storage URLs/keys, not raw image bytes.

## Queue Layout

- Queue: `grade-stack`
- Job names:
  - `stack_preview` (OCR + roster/question matching)
  - `stack_commit` (grading + persistence)
- Dead-letter queue: `grade-stack:dlq`

## Job Configuration (baseline)

- attempts: `3`
- backoff: fixed `5000ms`
- removeOnComplete: keep 7 days
- removeOnFail: keep 7 days
- worker concurrency: `2` (start conservative; scale with OCR latency data)

## Data and Idempotency

- Persist job state in Postgres:
  - id, phase, status, testId, classId, attempts, failure payload, timestamps.
- Use idempotency key for enqueue endpoints:
  - repeated requests return the existing job rather than creating duplicates.
- Preview job artifacts should include matching confidence and `needs_review` markers.

## Failure and Recovery

- Retry transient failures automatically via BullMQ attempts/backoff.
- Move exhausted failures to DLQ and mark API job state `failed`.
- Provide requeue endpoint/runbook for operators to replay failed jobs after remediation.

## Monitoring and Alerts

- Track:
  - queue depth
  - oldest queued age
  - success/failure rate
  - preview and commit p95 runtime
- Alert when:
  - queue depth exceeds threshold for > 5 minutes
  - failure rate spikes above baseline
  - worker heartbeat disappears

## Render Deployment Notes

- Deploy API and worker as separate Render services from same repo.
- Attach shared environment group containing Redis URL, queue settings, storage settings, and API keys.
- Ensure worker service has sufficient memory for OCR payload fan-out.

## Operational Runbook (minimum)

1. Verify Redis reachable from both API and worker services.
2. Confirm worker process is running and consuming `grade-stack`.
3. Inspect failed jobs and DLQ entries.
4. Requeue recoverable failures after root-cause mitigation.
5. Validate queue depth returns to steady-state.

## SLO Suggestions

- Enqueue acceptance latency: p95 < 500ms.
- Preview completion latency: p95 < 45s (baseline, tune with production data).
- Commit completion latency: p95 < 30s.
- Failed-job rate: < 2% daily excluding explicit validation failures.
