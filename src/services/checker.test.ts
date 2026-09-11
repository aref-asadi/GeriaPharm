import { describe, it, expect } from "vitest";
import {
  auditRegimen,
  matchesTarget,
  parseThreshold,
  cockcroftGault,
  acbScoreFor,
  evaluateRegimen,
} from "./checker";
import { seedData } from "../data/seedData";
import { parseImport } from "./db";
import type { DrugRecord } from "../types/types";
const drug = (name: string) =>
  structuredClone(
    seedData.find((d) =>
      d.genericName.toLowerCase().startsWith(name.toLowerCase()),
    )!,
  );
const custom = (name: string, classes: string[] = []): DrugRecord => ({
  ...drug("baclofen"),
  id: name,
  genericName: name,
  genericNameFa: name,
  drugClasses: classes,
  beersCategories: [],
  renalConsiderations: undefined,
  drugDrugInteractions: [],
  drugDiseaseInteractions: [],
});
describe("clinical screening", () => {
  it("seeds all 73 complete records with unique IDs", () => {
    expect(seedData).toHaveLength(73);
    expect(new Set(seedData.map((d) => d.id)).size).toBe(73);
    expect(seedData.every((d) => d.recommendation && d.rationale)).toBe(true);
  });
  it("computes Cockcroft-Gault only from complete, valid inputs", () => {
    expect(
      cockcroftGault({ age: 72, sex: "male", weight: 70, serumCreatinine: 1.2 }),
    ).toBeCloseTo(((140 - 72) * 70) / (72 * 1.2), 5);
    expect(
      cockcroftGault({
        age: 72,
        sex: "female",
        weight: 70,
        serumCreatinine: 1.2,
      }),
    ).toBeCloseTo((0.85 * (140 - 72) * 70) / (72 * 1.2), 5);
    for (const partial of [
      { age: 72 },
      { sex: "male" as const },
      { age: 0, sex: "male" as const, weight: 70, serumCreatinine: 1.2 },
      { age: -5, sex: "male" as const, weight: 70, serumCreatinine: 1.2 },
    ])
      expect(cockcroftGault(partial)).toBeUndefined();
  });
  it("scores the anticholinergic burden per published ACB weights", () => {
    expect(acbScoreFor(drug("amitriptyline"))).toBe(3);
    expect(acbScoreFor(drug("diphenhydramine"))).toBe(3);
    expect(acbScoreFor(drug("alprazolam"))).toBe(1);
    expect(acbScoreFor(drug("tramadol"))).toBe(0);
  });
  it("summarizes regimen stats including PIM and CNS counts", () => {
    const { stats } = evaluateRegimen(
      [drug("warfarin"), drug("alprazolam"), drug("amitriptyline")],
      [],
      {},
    );
    expect(stats.totalDrugs).toBe(3);
    expect(stats.pimCount).toBe(3);
    expect(stats.acbScore).toBe(5);
    expect(stats.cnsCount).toBe(2);
  });
  it("adds an age-domain notice below 65 and a Table-4 caution at 75+", () => {
    const alprazolam = drug("alprazolam"),
      dabigatran = drug("dabigatran");
    expect(
      auditRegimen([alprazolam], [], { age: 64 }).some((a) =>
        a.title.includes("سن کمتر از ۶۵"),
      ),
    ).toBe(true);
    expect(
      auditRegimen([dabigatran], [], { age: 80 }).some(
        (a) => a.id === "age75" && a.severity === "caution",
      ),
    ).toBe(true);
    expect(
      auditRegimen([dabigatran], [], { age: 70 }).some((a) => a.id === "age75"),
    ).toBe(false);
  });
  it("skips male-only BPH rules for female patients", () => {
    const d = drug("amitriptyline");
    expect(
      auditRegimen([d], ["BPH / LUTS in men"], { sex: "female" }).some(
        (a) => a.type === "Disease",
      ),
    ).toBe(false);
    expect(
      auditRegimen([d], ["BPH / LUTS in men"], { sex: "male" }).some(
        (a) => a.type === "Disease",
      ),
    ).toBe(true);
  });
  it("uses Cockcroft-Gault when age, weight, sex and creatinine are complete", () => {
    const a = auditRegimen([drug("nitrofurantoin")], [], {
      age: 80,
      sex: "male",
      weight: 60,
      serumCreatinine: 2.2,
    });
    expect(a.some((x) => x.type === "Renal")).toBe(true);
    expect(a.some((x) => x.id === "cg-note")).toBe(true);
  });
  it("matches opioid / benzodiazepine interaction in either order once", () => {
    for (const meds of [
      [drug("tramadol"), drug("alprazolam")],
      [drug("alprazolam"), drug("tramadol")],
    ])
      expect(
        auditRegimen(meds, [], {}).filter((a) => a.type === "Interaction"),
      ).toHaveLength(1);
  });
  it("matches warfarin with SSRI class", () => {
    expect(
      auditRegimen([drug("warfarin"), custom("Sertraline")], [], {}).some(
        (a) => a.type === "Interaction",
      ),
    ).toBe(true);
  });
  it("supports explicitly assigned classes on new medications", () =>
    expect(
      matchesTarget("SSRIs / SNRIs", custom("Custom agent", ["SSRIs"])),
    ).toBe(true));
  it("does not mistake a CNS cumulative target for a pair interaction", () =>
    expect(matchesTarget("≥3 CNS-active drugs", drug("alprazolam"))).toBe(
      false,
    ));
  it("detects opioid with gabapentinoid without a supplied pair rule", () =>
    expect(
      auditRegimen([drug("tramadol"), custom("Gabapentin")], [], {}).some(
        (a) => a.type === "Interaction",
      ),
    ).toBe(true));
  it("requires three CNS agents and deduplicates repeated IDs", () => {
    expect(
      auditRegimen([drug("alprazolam"), drug("amitriptyline")], [], {}).some(
        (a) => a.id === "cns",
      ),
    ).toBe(false);
    expect(
      auditRegimen(
        [drug("alprazolam"), drug("amitriptyline"), drug("tramadol")],
        [],
        {},
      ).some((a) => a.id === "cns"),
    ).toBe(true);
    expect(
      auditRegimen(
        [drug("alprazolam"), drug("alprazolam"), drug("alprazolam")],
        [],
        {},
      ).some((a) => a.id === "cns"),
    ).toBe(false);
  });
  it("warns at two anticholinergics", () =>
    expect(
      auditRegimen(
        [drug("amitriptyline"), drug("diphenhydramine")],
        [],
        {},
      ).some((a) => a.id === "anti"),
    ).toBe(true));
  it("does not interchange renal measures", () => {
    const a = auditRegimen([drug("baclofen")], [], { CrCl: 20 });
    expect(a.some((r) => r.type === "Renal")).toBe(false);
    expect(a.some((r) => r.type === "Review needed")).toBe(true);
  });
  it("uses strict less-than at the renal boundary", () => {
    expect(
      auditRegimen([drug("nitrofurantoin")], [], { CrCl: 30 }).some(
        (a) => a.type === "Renal",
      ),
    ).toBe(false);
    expect(
      auditRegimen([drug("nitrofurantoin")], [], { CrCl: 29 }).some(
        (a) => a.type === "Renal",
      ),
    ).toBe(true);
  });
  it("accepts zero and rejects invalid renal inputs as incomplete", () => {
    expect(
      auditRegimen([drug("baclofen")], [], { eGFR: 0 }).some(
        (a) => a.type === "Renal",
      ),
    ).toBe(true);
    for (const n of [-1, NaN, Infinity])
      expect(
        auditRegimen([drug("baclofen")], [], { eGFR: n }).some(
          (a) => a.type === "Review needed",
        ),
      ).toBe(true);
  });
  it("handles renal ranges, inclusive operators and unsupported syntax", () => {
    expect(parseThreshold("CrCl 15-50 mL/min")?.test(50)).toBe(true);
    expect(parseThreshold("CrCl ≤ 30 mL/min")?.test(30)).toBe(true);
    expect(parseThreshold("approximately 30")).toBeNull();
    const d = drug("baclofen");
    d.renalConsiderations!.threshold = "unknown";
    expect(
      auditRegimen([d], [], { eGFR: 50 }).some(
        (a) => a.type === "Review needed",
      ),
    ).toBe(true);
  });
  it("normalizes BPH aliases", () =>
    expect(
      auditRegimen([drug("amitriptyline")], ["BPH / LUTS in men"], {}).some(
        (a) => a.type === "Disease",
      ),
    ).toBe(true));
  it("does not confuse a class name with a substring of an unrelated drug", () =>
    expect(matchesTarget("Opioids", custom("Loperamide"))).toBe(false));
  it("flags dual RAS blockade for contextual review", () =>
    expect(
      auditRegimen([custom("Losartan"), custom("Lisinopril")], [], {}).some(
        (a) => a.title.includes("Losartan + Lisinopril"),
      ),
    ).toBe(true));
});
describe("backup validation", () => {
  it("round trips a versioned backup", () =>
    expect(
      parseImport(JSON.stringify({ schemaVersion: 1, medications: seedData })),
    ).toEqual(seedData));
  it("accepts legacy arrays and an intentionally empty registry", () => {
    expect(parseImport(JSON.stringify(seedData))).toEqual(seedData);
    expect(parseImport("[]")).toEqual([]);
  });
  it("rejects malformed files, incompatible versions and duplicate IDs", () => {
    for (const value of [
      "invalid",
      "{}",
      JSON.stringify({ schemaVersion: 2, medications: seedData }),
      JSON.stringify([seedData[0], seedData[0]]),
      JSON.stringify([{ ...seedData[0], isCnsActive: "yes" }]),
    ])
      expect(() => parseImport(value)).toThrow();
  });
});
