import { describe, it, expect } from "vitest";
import {
  ALL_QUESTIONS,
  DEMOGRAPHICS_SECTION,
  FIRST_STEP,
  STORAGE_KEY,
  SURVEY_SECTIONS,
  TOTAL_QUESTIONS,
  UMARS_QUESTIONS,
  answerLabel,
  buildSubmission,
  findStep,
  isNumberQuestion,
  isValidAnswer,
  missingDemographics,
  umarsScore,
  type SurveyStep,
} from "./umarsQuestions";
import { surveySubmissionSchema } from "../types/types";

const demographics = { age: 34, gender: "male", occupation: "pharmacist" };
const likert = (value: number) =>
  Object.fromEntries(UMARS_QUESTIONS.map((question) => [question.id, value]));
const complete = () => ({ ...demographics, ...likert(5) });

describe("UMARS survey definition", () => {
  it("asks the three demographics questions before the 25 UMARS items", () => {
    expect(SURVEY_SECTIONS[0]).toBe(DEMOGRAPHICS_SECTION);
    expect(DEMOGRAPHICS_SECTION.questions.map((q) => q.id)).toEqual([
      "age",
      "gender",
      "occupation",
    ]);
    expect(UMARS_QUESTIONS).toHaveLength(25);
    expect(TOTAL_QUESTIONS).toBe(28);
    expect(ALL_QUESTIONS).toHaveLength(TOTAL_QUESTIONS);
    expect(FIRST_STEP).toEqual({ sectionId: DEMOGRAPHICS_SECTION.id, index: 0 });
  });

  it("keeps every UMARS item numbered 1–25 with a contiguous Likert scale", () => {
    UMARS_QUESTIONS.forEach((question, index) => {
      expect(question.id).toBe(`q${index + 1}`);
      expect(question.number).toBe(index + 1);
      expect(isNumberQuestion(question)).toBe(false);
      if (isNumberQuestion(question)) return;
      const values = question.options.map((option) => option.value);
      expect(values).toEqual(values.map((_, position) => position + 1));
      expect([5, 6]).toContain(values.length);
    });
  });

  it("pins the four six-point information items (q12–q15)", () => {
    const sixPoint = UMARS_QUESTIONS.filter((question) =>
      isNumberQuestion(question) ? false : question.options.length === 6,
    );
    expect(sixPoint.map((question) => question.id)).toEqual([
      "q12",
      "q13",
      "q14",
      "q15",
    ]);
  });

  it("bounds the age field between 15 and 120 years", () => {
    const age = DEMOGRAPHICS_SECTION.questions[0];
    expect(isNumberQuestion(age)).toBe(true);
    if (!isNumberQuestion(age)) return;
    expect([age.min, age.max]).toEqual([15, 120]);
  });

  it("stores the queue under the v2 key", () => {
    expect(STORAGE_KEY).toBe("gp-umars-submissions-v2");
  });
});

describe("wizard navigation", () => {
  it("walks forward through every question and stops at the end", () => {
    const visited: SurveyStep[] = [FIRST_STEP];
    for (;;) {
      const next = findStep(visited[visited.length - 1], 1);
      if (!next) break;
      visited.push(next);
    }
    const last = SURVEY_SECTIONS[SURVEY_SECTIONS.length - 1];
    expect(visited).toHaveLength(TOTAL_QUESTIONS);
    expect(visited[TOTAL_QUESTIONS - 1]).toEqual({
      sectionId: last.id,
      index: last.questions.length - 1,
    });
    expect(visited).toContainEqual({ sectionId: "A", index: 0 });
  });

  it("walks backward and stops before the first question", () => {
    expect(findStep(FIRST_STEP, -1)).toBeNull();
    expect(findStep({ sectionId: "A", index: 0 }, -1)).toEqual({
      sectionId: DEMOGRAPHICS_SECTION.id,
      index: DEMOGRAPHICS_SECTION.questions.length - 1,
    });
    let step: SurveyStep | null = { sectionId: "A", index: 0 };
    let count = 0;
    while (step) {
      count += 1;
      step = findStep(step, -1);
    }
    expect(count).toBe(DEMOGRAPHICS_SECTION.questions.length + 1);
  });

  it("never leaves the known sections", () => {
    expect(findStep({ sectionId: "ZZ", index: 0 }, 1)).toBeNull();
  });
});

describe("validation and scoring", () => {
  it("accepts a complete response and ignores out-of-range scores", () => {
    const payload = buildSubmission(
      { ...complete(), q1: 9, q2: "3" as unknown as number },
      crypto.randomUUID(),
      new Date().toISOString(),
    );
    expect(payload).not.toBeNull();
    if (!payload) return;
    expect(surveySubmissionSchema.safeParse(payload).success).toBe(true);
    expect(payload.answers.q1).toBeUndefined();
    expect(Object.keys(payload.answers)).toHaveLength(23);
  });

  it("keeps the sixth Likert point of the information items", () => {
    const id = crypto.randomUUID();
    const payload = buildSubmission(
      { ...complete(), q12: 6, q13: 6, q14: 6, q15: 6 },
      id,
      new Date().toISOString(),
    );
    expect(payload?.answers.q12).toBe(6);
    expect(payload && surveySubmissionSchema.safeParse(payload).success).toBe(
      true,
    );
    expect(umarsScore({ q12: 6 })).toEqual({ answered: 1, total: 6, mean: 6 });
    expect(umarsScore({ ...demographics, ...likert(5), q12: 6 })).toEqual({
      answered: 25,
      total: 126,
      mean: 5.04,
    });
  });

  it("refuses to build a payload without valid demographics", () => {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const patches: Record<string, number | string | undefined>[] = [
      { age: 14 },
      { age: 121 },
      { age: Number.NaN },
      { gender: undefined },
      { gender: "other" },
      { occupation: "nurse" },
    ];
    for (const patch of patches)
      expect(
        buildSubmission(
          { ...complete(), ...patch } as Record<string, number | string>,
          id,
          createdAt,
        ),
      ).toBeNull();
    expect(buildSubmission(complete(), id, createdAt)).not.toBeNull();
  });

  it("treats only complete demographics as valid answers", () => {
    const [age, gender, occupation] = DEMOGRAPHICS_SECTION.questions;
    expect(isValidAnswer(age, 15)).toBe(true);
    expect(isValidAnswer(age, 120)).toBe(true);
    expect(isValidAnswer(age, 14)).toBe(false);
    expect(isValidAnswer(age, 121)).toBe(false);
    expect(isValidAnswer(age, undefined)).toBe(false);
    expect(isValidAnswer(gender, "female")).toBe(true);
    expect(isValidAnswer(gender, "other")).toBe(false);
    expect(isValidAnswer(occupation, "other_health")).toBe(true);
    expect(missingDemographics({}).map((q) => q.id)).toEqual([
      "age",
      "gender",
      "occupation",
    ]);
    expect(missingDemographics({ age: 12, gender: "female" })).toHaveLength(2);
    expect(missingDemographics(demographics)).toHaveLength(0);
  });

  it("computes the UMARS total and mean from the answered items only", () => {
    expect(umarsScore({})).toEqual({ answered: 0, total: 0, mean: 0 });
    expect(umarsScore({ ...demographics, q1: 5, q2: 3, q3: 9 })).toEqual({
      answered: 2,
      total: 8,
      mean: 4,
    });
    expect(umarsScore(likert(5))).toEqual({
      answered: 25,
      total: 125,
      mean: 5,
    });
  });

  it("renders stored answers back as Persian labels", () => {
    const [age, gender] = DEMOGRAPHICS_SECTION.questions;
    expect(answerLabel(age, 32)).toBe("32");
    expect(answerLabel(age, undefined)).toBe("—");
    expect(answerLabel(gender, "female")).toBe("زن");
    expect(answerLabel(UMARS_QUESTIONS[0], 5)).toContain("(۵)");
    expect(answerLabel(UMARS_QUESTIONS[0], 4)).toContain("(۴)");
  });
});
