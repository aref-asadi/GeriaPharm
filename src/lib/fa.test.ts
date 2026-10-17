import { describe, it, expect } from "vitest";
import { fa, number as faNumber, toLatinDigits } from "./fa";

describe("Persian number helpers", () => {
  it("converts Persian and Arabic digits typed into the age field", () => {
    expect(toLatinDigits("۳۲")).toBe("32");
    expect(toLatinDigits("٠٥")).toBe("05");
    expect(toLatinDigits("۲۵")).toBe("25");
    expect(toLatinDigits("۱۲۰")).toBe("120");
    expect(toLatinDigits(" ۴۵ ")).toBe(" 45 ");
    expect(toLatinDigits("abc")).toBe("abc");
    expect(toLatinDigits("")).toBe("");
  });

  it("formats counts and progress with Persian digits", () => {
    expect(faNumber(0)).toBe("۰");
    expect(faNumber(28)).toBe("۲۸");
    expect(faNumber(100)).toBe("۱۰۰");
  });

  it("labels the survey reset audit entry", () => {
    expect(fa("reset_survey")).toBe("بازنشانی نظرسنجی");
    expect(fa("unknown_action")).toBe("unknown_action");
  });
});
