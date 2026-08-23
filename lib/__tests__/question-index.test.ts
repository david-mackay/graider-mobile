import {
  formatPrintedQuestionNumber,
  parsePrintedQuestionNumber,
} from "@/lib/question-index";

describe("printed question numbers", () => {
  it("shows 1-based OCR indexes as printed numbers", () => {
    expect(formatPrintedQuestionNumber(1)).toBe("1");
    expect(formatPrintedQuestionNumber(2)).toBe("2");
  });

  it("shows legacy 0-based values as question 1", () => {
    expect(formatPrintedQuestionNumber(0)).toBe("1");
  });

  it("stores the number the teacher types", () => {
    expect(parsePrintedQuestionNumber("1")).toBe(1);
    expect(parsePrintedQuestionNumber("12")).toBe(12);
    expect(parsePrintedQuestionNumber("")).toBeNull();
  });
});
