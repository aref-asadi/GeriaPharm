import { describe, it, expect } from "vitest";
import {
  groupAlerts,
  buildPimRows,
  buildCautionRows,
  BEERS_GROUPS,
} from "./alertGrouping";
import { prioritizeAlerts, type PrioritizedAlert } from "./alertRanking";
import { seedData } from "../../data/seedData";
import type { Alert } from "../checker";
import type { DrugRecord } from "../../types/types";

const alert = (id: string, type: Alert["type"], severity: Alert["severity"]): Alert => ({
  id,
  type,
  severity,
  title: id,
  detail: id,
});

const drugWith = (id: string, categories: DrugRecord["beersCategories"]): DrugRecord => {
  const base = structuredClone(seedData[0]);
  return {
    ...base,
    id,
    genericName: id,
    genericNameFa: id,
    beersCategories: categories,
    drugDiseaseInteractions: [],
    drugDrugInteractions: [],
    renalConsiderations: undefined,
  };
};

describe("Beers alert grouping", () => {
  it("exposes exactly five Beers table groups with stable test ids", () => {
    expect(BEERS_GROUPS).toHaveLength(5);
    // Rendering order follows the specification: T2, T3, T5, T6, then T4.
    expect(BEERS_GROUPS.map((g) => g.testId)).toEqual([
      "beers-table2",
      "beers-table3",
      "beers-table5",
      "beers-table6",
      "beers-table4",
    ]);
    expect(BEERS_GROUPS.filter((g) => g.defaultOpen)).toHaveLength(1);
  });

  it("routes each alert type to its originating Beers table", () => {
    const meds = [
      drugWith("pim-drug", ["PIM_GENERAL"]),
      drugWith("caution-drug", ["USE_WITH_CAUTION"]),
    ];
    const prioritized = prioritizeAlerts([
      alert("pim-drugpim", "Medication", "avoid"),
      alert("caution-drugpim", "Medication", "caution"),
      alert("x-disease0", "Disease", "avoid"),
      alert("x-interaction", "Interaction", "avoid"),
      alert("x-cumulative", "Cumulative load", "caution"),
      alert("baclofenrenal", "Renal", "avoid"),
      alert("baclofenrenal-review", "Review needed", "info"),
      alert("warfarinage-domain", "Review needed", "info"),
    ]);

    const grouped = groupAlerts(prioritized, meds);

    expect(grouped.table2.map((a) => a.id)).toEqual([
      "pim-drugpim",
      "warfarinage-domain",
    ]);
    expect(grouped.table4.map((a) => a.id)).toEqual(["caution-drugpim"]);
    expect(grouped.table3.map((a) => a.id)).toEqual(["x-disease0"]);
    expect(grouped.table5.map((a) => a.id)).toEqual(["x-interaction", "x-cumulative"]);
    expect(grouped.table6.map((a) => a.id)).toEqual([
      "baclofenrenal",
      "baclofenrenal-review",
    ]);
  });

  it("classifies table 2 alerts as critical or high priority", () => {
    const prioritized: PrioritizedAlert[] = prioritizeAlerts([
      alert("pim-drugpim", "Medication", "avoid"),
    ]);
    expect(prioritized[0].priorityWeight).toBeGreaterThanOrEqual(3);
  });

  it("builds Table 2 and Table 4 drug rows from real records", () => {
    const warfarin = seedData.find((d) => d.id === "warfarin")!;
    const caution = seedData.filter(
      (d) =>
        d.beersCategories.includes("USE_WITH_CAUTION") &&
        !d.beersCategories.includes("PIM_GENERAL"),
    );

    const pimRows = buildPimRows([warfarin]);
    expect(pimRows).toHaveLength(1);
    expect(pimRows[0].badgeFa).toBe("پرهیز");
    expect(pimRows[0].quality).toContain("شواهد:");
    expect(pimRows[0].rationale.length).toBeGreaterThan(10);

    const cautionRows = buildCautionRows([warfarin, ...caution]);
    expect(cautionRows).toHaveLength(caution.length);
    expect(cautionRows.every((r) => r.tone === "caution")).toBe(true);
  });
});
