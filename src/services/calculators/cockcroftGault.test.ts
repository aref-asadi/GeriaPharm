import { describe, it, expect } from "vitest";
import { calculateRenalMetrics } from "./cockcroftGault";

describe("Cockcroft-Gault & Renal Pharmacokinetic Calculator", () => {
  it("accurately computes BMI and category", () => {
    const res = calculateRenalMetrics({
      sex: "male",
      age: 72,
      weight: 70,
      height: 175,
      serumCreatinine: 1.0,
    });
    // Height in m = 1.75 -> 70 / (1.75 * 1.75) = 22.86 -> 22.9
    expect(res.bmi).toBe(22.9);
    expect(res.bmiCategory).toBe("نرمال");
  });

  it("calculates Ideal Body Weight (IBW) for male and female correctly", () => {
    // Male: 50 + 0.905 * (175 - 152.4) = 50 + 0.905 * 22.6 = 50 + 20.453 = 70.5
    const maleRes = calculateRenalMetrics({
      sex: "male",
      height: 175,
      weight: 70,
      age: 70,
      serumCreatinine: 1.0,
    });
    expect(maleRes.ibw).toBeCloseTo(70.5, 1);

    // Female: 45.5 + 0.905 * (160 - 152.4) = 45.5 + 0.905 * 7.6 = 45.5 + 6.878 = 52.4
    const femaleRes = calculateRenalMetrics({
      sex: "female",
      height: 160,
      weight: 55,
      age: 70,
      serumCreatinine: 1.0,
    });
    expect(femaleRes.ibw).toBeCloseTo(52.4, 1);
  });

  it("uses Adjusted Body Weight (AdjBW) when actual weight > 120% of IBW", () => {
    // Female: height 152.4 -> IBW = 45.5 kg. 120% of IBW = 54.6 kg.
    // If actual weight = 80 kg (> 120% IBW):
    // AdjBW = 45.5 + 0.4 * (80 - 45.5) = 45.5 + 0.4 * 34.5 = 45.5 + 13.8 = 59.3 kg
    const obeseRes = calculateRenalMetrics({
      sex: "female",
      height: 152.4,
      weight: 80,
      age: 75,
      serumCreatinine: 1.2,
    });
    expect(obeseRes.isObese).toBe(true);
    expect(obeseRes.adjBw).toBe(59.3);
    expect(obeseRes.weightUsedLabel).toBe("وزن تعدیل‌شده (AdjBW)");
    expect(obeseRes.weightUsedForCrCl).toBe(59.3);
    // CrCl = ((140 - 75) * 59.3 * 0.85) / (72 * 1.2) = (65 * 59.3 * 0.85) / 86.4 = 37.9
    expect(obeseRes.crcl).toBeCloseTo(37.9, 0.5);
  });

  it("uses Actual Weight when weight < IBW to avoid overestimating CrCl", () => {
    // Male: height 180 -> IBW = 50 + 0.905 * 27.6 = 75 kg.
    // Actual weight = 60 kg (< 75 kg).
    const thinRes = calculateRenalMetrics({
      sex: "male",
      height: 180,
      weight: 60,
      age: 80,
      serumCreatinine: 1.5,
    });
    expect(thinRes.weightUsedLabel).toBe("وزن واقعی");
    expect(thinRes.weightUsedForCrCl).toBe(60);
    // CrCl = ((140 - 80) * 60) / (72 * 1.5) = 3600 / 108 = 33.3
    expect(thinRes.crcl).toBeCloseTo(33.3, 0.5);
  });
});
