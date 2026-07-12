import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { GradedAttemptDetail } from "@/lib/dashboard-types";

export type GradePdfOptions = {
  includeGrade: boolean;
  includeFeedback: boolean;
  studentName?: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildGradeHtml(attempt: GradedAttemptDetail, options: GradePdfOptions): string {
  const studentLabel = escapeHtml(
    options.studentName?.trim() ||
      attempt.student_name?.trim() ||
      "Unnamed student",
  );
  const testTitle = escapeHtml(attempt.test_title);
  const gradeBlock =
    options.includeGrade && attempt.total_marks != null && attempt.max_marks != null
      ? `<p class="grade">${attempt.total_marks} / ${attempt.max_marks}</p>`
      : "";

  const questions = attempt.questions
    .map((question, index) => {
      const prompt = escapeHtml(question.prompt);
      const answer = escapeHtml(question.student_answer || "—");
      const marks =
        options.includeGrade && question.marks_earned != null
          ? `<span class="marks">${question.marks_earned} / ${question.marks}</span>`
          : "";
      const feedback =
        options.includeFeedback && question.feedback
          ? `<p class="feedback">${escapeHtml(question.feedback)}</p>`
          : "";

      return `
        <section class="question">
          <div class="question-head">
            <h3>Question ${index + 1}</h3>
            ${marks}
          </div>
          <p class="prompt">${prompt}</p>
          <p class="answer"><strong>Answer:</strong> ${answer}</p>
          ${feedback}
        </section>
      `;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
        color: #2c231b;
        background: #fdfaf1;
        padding: 28px;
        line-height: 1.45;
      }
      .brand {
        color: #be3a2e;
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-weight: 700;
      }
      h1 {
        font-size: 24px;
        margin: 8px 0 4px;
      }
      .meta {
        color: #6f6151;
        font-size: 13px;
        margin-bottom: 18px;
      }
      .grade {
        font-size: 28px;
        color: #be3a2e;
        font-weight: 700;
        margin: 0 0 18px;
      }
      .question {
        border: 1px solid #e5d9c0;
        border-radius: 12px;
        background: #fff;
        padding: 14px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }
      .question-head {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }
      h3 {
        margin: 0;
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #a3927b;
      }
      .marks {
        color: #be3a2e;
        font-weight: 700;
        font-size: 14px;
      }
      .prompt {
        margin: 8px 0;
        font-size: 15px;
      }
      .answer {
        margin: 0;
        font-size: 14px;
        color: #2c231b;
      }
      .feedback {
        margin: 10px 0 0;
        padding: 10px;
        border-radius: 8px;
        background: #f6efe1;
        font-size: 13px;
        color: #4a7c59;
      }
      footer {
        margin-top: 24px;
        font-size: 11px;
        color: #a3927b;
      }
    </style>
  </head>
  <body>
    <div class="brand">Graider</div>
    <h1>${testTitle}</h1>
    <p class="meta">${studentLabel}</p>
    ${gradeBlock}
    ${questions}
    <footer>Graded with Graider · for teachers who grade by hand</footer>
  </body>
</html>`;
}

function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
}

export async function generateAttemptPdf(
  attempt: GradedAttemptDetail,
  options: GradePdfOptions,
): Promise<{ uri: string; filename: string }> {
  const html = buildGradeHtml(attempt, options);
  const { uri } = await Print.printToFileAsync({ html });
  const studentPart = sanitizeFilename(options.studentName ?? attempt.student_name ?? "student");
  const testPart = sanitizeFilename(attempt.test_title);
  const filename = `${testPart}-${studentPart}.pdf`;
  return { uri, filename };
}

/**
 * Opens the native share sheet. Intentionally not awaited — on iOS, shareAsync
 * may never resolve after the user opens Print and returns to the app.
 */
export function sharePdfFile(uri: string, filename: string): void {
  void Sharing.isAvailableAsync().then((available) => {
    if (!available) return;
    void Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      UTI: "com.adobe.pdf",
      dialogTitle: filename,
    });
  });
}

export async function fetchAndExportAttemptPdf(
  fetchAttempt: (attemptId: string) => Promise<GradedAttemptDetail>,
  attemptId: string,
  options: GradePdfOptions,
): Promise<{ uri: string; filename: string }> {
  const attempt = await fetchAttempt(attemptId);
  return generateAttemptPdf(attempt, options);
}
