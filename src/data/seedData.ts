import data from "./seed.fa.json";
import extra from "./seed-extra.json";
import extra2 from "./seed-extra-2.json";
import { registrySchema } from "../types/types";
/** Merged Beers-2023 clinical registry (Persian seed + supplementary batches). */
export const seedData = registrySchema.parse([...data, ...extra, ...extra2]);