# Multi-Page Question Matching Strategy

## Goal

Map OCR-extracted answers from multi-page handwritten uploads to canonical test question IDs with predictable behavior and explicit ambiguity handling.

## Matching Pipeline

For each OCR answer:

1. **Index hint match (`index_hint`)**
   - If OCR includes `question_index` and it maps to an in-range test question order slot, use that `question_id`.
   - Confidence: `1.0`

2. **Normalized prompt match (`prompt_normalized`)**
   - Normalize OCR prompt text and compare against normalized canonical test prompts.
   - Also supports canonical question IDs as normalized lookup keys.
   - Confidence: `1.0`

3. **Fuzzy token-overlap match (`fuzzy`)**
   - Compute token-overlap score between OCR prompt and each canonical prompt.
   - Accept only when score meets threshold (`>= 0.82`).
   - Confidence: score value.

4. **Unmatched (`unmatched`)**
   - If no confident mapping is found, return `questionId = null` and mark `needsReview = true`.
   - This avoids silent mis-grading.

## Output Metadata

Each match emits:

- `questionId`
- `matchingReason`
- `confidence`
- `needsReview`
- original OCR answer payload

This metadata supports:

- teacher review UX for ambiguous items
- auditability and debugging
- future model quality analysis

## Safety Rule

Only matched answers with `questionId != null` and `needsReview = false` are auto-committed into attempt answers. Ambiguous items are intentionally deferred for review to prevent incorrect grade assignment.
