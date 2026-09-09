import data from "./seed.fa.json";
import { registrySchema } from "../types/types";
export const seedData = registrySchema.parse(data);
