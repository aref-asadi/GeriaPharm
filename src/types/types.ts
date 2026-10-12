import { z } from "zod";
export const categories = [
  "PIM_GENERAL",
  "DRUG_DISEASE",
  "USE_WITH_CAUTION",
  "DRUG_INTERACTION",
  "RENAL_ADJUSTMENT",
] as const;
export type BeersCategory = (typeof categories)[number];
const text = z.string().trim().min(1, "این فیلد الزامی است").max(10000);
export const drugSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(150)
    .regex(/^[a-zA-Z0-9_-]+$/, "شناسه نامعتبر است"),
  genericName: text,
  genericNameFa: z.string().trim().max(200).optional(),
  brandNamesIran: z.array(text),
  therapeuticCategory: text,
  beersCategories: z.array(z.enum(categories)),
  recommendation: text,
  rationale: text,
  qualityOfEvidence: z.enum(["High", "Moderate", "Low"]),
  strengthOfRecommendation: z.enum(["Strong", "Weak"]),
  isStrongAnticholinergic: z.boolean(),
  isCnsActive: z.boolean(),
  isAvailableInIran: z.boolean().optional(),
  /** Anticholinergic Cognitive Burden weight (0–3) per the Regenstrief/Boustani scale. */
  acbScore: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
  ]).optional(),
  /** STOPPFall fall-risk class numbers (1–14), comma separated when a drug belongs to several. */
  stoppFallCategory: z
    .string()
    .trim()
    .regex(
      /^(?:[1-9]|1[0-4])(?:,(?:[1-9]|1[0-4]))*$/,
      "کلاس STOPPFall نامعتبر است",
    )
    .optional(),
  /** Belongs to a subclass with higher fall/harm potential (long-acting BZD, TCA, loop diuretic, ACB 3, …). */
  isHighRiskSubclass: z.boolean().optional(),
  /** Anatomical Therapeutic Chemical code of the drug itself (falls back to its STOPPFall class ATC in the UI). */
  atcCode: z
    .string()
    .trim()
    .max(20)
    .regex(/^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}([A-Z0-9]{0,2})?$/, "کد ATC نامعتبر است")
    .optional(),
  saferAlternatives: z.array(text),
  drugClasses: z.array(text).optional(),
  drugDrugInteractions: z.array(
    z.object({
      id: text,
      targetDrugOrClass: text,
      severity: z.enum(["Avoid", "Use with caution"]),
      rationale: text,
      clinicalAction: text,
    }),
  ),
  drugDiseaseInteractions: z.array(
    z.object({ condition: text, rationale: text, recommendation: text }),
  ),
  renalConsiderations: z
    .object({
      threshold: text,
      action: z.enum(["Avoid", "Dose Reduction"]),
      guidance: text,
      rationale: text,
    })
    .optional(),
  notes: z.string().optional(),
  lastUpdated: text,
});
export type DrugRecord = z.infer<typeof drugSchema>;
export type DrugInteraction = DrugRecord["drugDrugInteractions"][number];
export type DrugDiseaseInteraction =
  DrugRecord["drugDiseaseInteractions"][number];
export type RenalAdjustment = NonNullable<DrugRecord["renalConsiderations"]>;
export const registrySchema = z
  .array(drugSchema)
  .max(10000)
  .superRefine((rows, ctx) => {
    if (new Set(rows.map((r) => r.id)).size !== rows.length)
      ctx.addIssue({
        code: "custom",
        message: "شناسه داروها نباید تکراری باشد",
      });
  });
