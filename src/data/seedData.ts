import data from "./seed.json";
import { registrySchema } from "../types/types";
// Preserve the original supplied dataset in seed.json; apply documented corrections here.
export const seedData = registrySchema.parse(data).map((record) => {
  if (record.id === "tramadol" && record.renalConsiderations) {
    record.renalConsiderations.guidance =
      "At CrCl < 30 mL/min, reduce the immediate-release dose and avoid extended-release formulations. Consult indication-specific prescribing information for the exact regimen.";
    record.notes +=
      " Clinical correction: the source document’s fixed immediate-release dosing instruction is not an AGS Beers dose. The shipped renal rule uses formulation-specific guidance from AGS Table 6.";
  }
  if (record.id === "diphenhydramine-oral") {
    record.isCnsActive = false;
    record.notes +=
      " Clinical correction: sedating antihistamines are not among the drug classes counted in the AGS Table 5 three-CNS-agent rule. Diphenhydramine remains a strong anticholinergic with sedation and falls risks.";
  }
  return record;
});
