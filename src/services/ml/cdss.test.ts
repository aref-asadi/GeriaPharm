import { describe, it, expect } from "vitest";
import { evaluateAdverseDrugReactionRisk } from "./riskModel";
import { generateDeprescribingProtocols } from "./deprescribingModel";
import { recommendDrugSubstitutions } from "./recommender";
import { prioritizeAlerts } from "./alertRanking";
import { seedData } from "../../data/seedData";
import type { DrugRecord } from "../../types/types";

const getDrug = (id: string): DrugRecord => {
  const d = seedData.find((x) => x.id === id);
  if (!d) throw new Error(`Drug ${id} not found in seedData`);
  return d;
};

describe("Module 1: Embedded Local Edge AI CDSS", () => {
  it("scores low risk for a single non-PIM regimen in young-old adult", () => {
    // Apixaban in a 68-year-old with normal renal function
    const apixaban = getDrug("apixaban");
    const risk = evaluateAdverseDrugReactionRisk([apixaban], [], {
      age: 68,
      CrCl: 80,
    });
    expect(risk.score).toBeLessThan(25);
    expect(risk.tier).toBe("کم‌خطر");
    expect(risk.color).toBe("emerald");
  });

  it("calculates high / critical risk with polypharmacy, multiple anticholinergics and CNS combo", () => {
    // Amitriptyline (strong anticholinergic, CNS, PIM) + Diazepam (CNS, PIM) + Alprazolam (CNS, PIM) + Tramadol (CNS) + 5 other drugs
    const amitriptyline = getDrug("amitriptyline");
    const diazepam = getDrug("diazepam");
    const alprazolam = getDrug("alprazolam");
    const tramadol = getDrug("tramadol");
    const hydroxyzine = getDrug("hydroxyzine"); // 2nd strong anticholinergic
    const warfarin = getDrug("warfarin");
    const digoxin = getDrug("digoxin");
    const glibenclamide = getDrug("glibenclamide-glyburide");
    const omeprazole = getDrug("omeprazole");
    const indomethacin = getDrug("indomethacin"); // 10 drugs total!

    const risk = evaluateAdverseDrugReactionRisk(
      [
        amitriptyline,
        diazepam,
        alprazolam,
        tramadol,
        hydroxyzine,
        warfarin,
        digoxin,
        glibenclamide,
        omeprazole,
        indomethacin,
      ],
      ["Heart Failure", "History of Falls or Fractures"],
      { age: 86, CrCl: 25 },
    );

    expect(risk.score).toBeGreaterThanOrEqual(75);
    expect(risk.tier).toBe("بحرانی");
    expect(risk.color).toBe("purple");
    expect(risk.drivers.length).toBeGreaterThanOrEqual(4);
  });

  it("generates structured deprescribing protocol for PPIs, Benzos and Sulfonylureas", () => {
    const omeprazole = getDrug("omeprazole");
    const diazepam = getDrug("diazepam");
    const glibenclamide = getDrug("glibenclamide-glyburide");

    const protocols = generateDeprescribingProtocols([
      omeprazole,
      diazepam,
      glibenclamide,
    ]);

    expect(protocols).toHaveLength(3);
    const ppi = protocols.find((p) => p.targetDrugGeneric.includes("Omeprazole"));
    expect(ppi).toBeDefined();
    expect(ppi?.taperSchedule.length).toBeGreaterThanOrEqual(3);
    expect(ppi?.monitoringParameters[0]).toContain("Rebound");

    const benzo = protocols.find((p) => p.targetDrugGeneric.includes("Diazepam"));
    expect(benzo).toBeDefined();
    expect(benzo?.safeAlternativeSuggestions[0]).toContain("ملاتونین");
  });

  it("recommends modern, safer evidence-based alternatives per Beers 2023", () => {
    const warfarin = getDrug("warfarin");
    const glibenclamide = getDrug("glibenclamide-glyburide");
    const amitriptyline = getDrug("amitriptyline");

    const recommendations = recommendDrugSubstitutions([
      warfarin,
      glibenclamide,
      amitriptyline,
    ]);

    expect(recommendations.length).toBeGreaterThanOrEqual(3);

    const warfRec = recommendations.find((r) => r.flaggedDrugName.includes("Warfarin"));
    expect(warfRec?.recommendedAlternatives[0].genericName).toBe("Apixaban");

    const sulfRec = recommendations.find((r) => r.flaggedDrugName.includes("Glibenclamide"));
    expect(
      sulfRec?.recommendedAlternatives.some((a) => a.genericName.includes("Linagliptin")),
    ).toBe(true);
  });

  it("prioritizes fatal and core PIM alerts to eliminate alert fatigue", () => {
    const alerts = [
      {
        id: "1",
        title: "مصرف SGLT2 در سالمند",
        detail: "پایش عفونت ادراری",
        severity: "caution" as const,
        type: "Medication" as const,
      },
      {
        id: "2",
        title: "تداخل Opioid + Benzodiazepine",
        detail: "ایست قلبی، تنگی نفس و مرگ",
        severity: "avoid" as const,
        type: "Interaction" as const,
      },
      {
        id: "3",
        title: "تجویز دمانس و آنتی‌پسیکوتیک",
        detail: "افزایش مرگ‌ومیر ناشی از سکته مغزی",
        severity: "avoid" as const,
        type: "Disease" as const,
      },
    ];

    const prioritized = prioritizeAlerts(alerts);
    expect(prioritized[0].priority).toBe("CRITICAL");
    expect(prioritized[1].priority).toBe("HIGH");
    expect(prioritized[2].priority).toBe("CAUTION");
  });
});
