import "fake-indexeddb/auto";
import { beforeEach, describe, it, expect } from "vitest";
import {
  getAllMedications,
  getMedicationById,
  saveMedication,
  deleteMedication,
  replaceRegistry,
  exportDatabaseToJson,
  importDatabaseFromJson,
  resetToFactorySeed,
} from "./db";
import { seedData } from "../data/seedData";
beforeEach(async () => {
  await resetToFactorySeed();
});
describe("IndexedDB persistence", () => {
  it("retrieves the complete registry and individual drugs", async () => {
    expect(await getAllMedications()).toHaveLength(73);
    expect((await getMedicationById("warfarin"))?.genericName).toBe("Warfarin");
  });
  it("persists edits and new records", async () => {
    const d = { ...seedData[0], notes: "Reviewed locally" };
    await saveMedication(d);
    expect((await getMedicationById(d.id))?.notes).toBe("Reviewed locally");
    await saveMedication({
      ...d,
      id: "new-record",
      genericName: "Custom medication",
    });
    expect(await getAllMedications()).toHaveLength(74);
  });
  it("keeps an intentionally empty registry empty", async () => {
    await replaceRegistry([]);
    expect(await getAllMedications()).toEqual([]);
    expect(await getAllMedications()).toEqual([]);
  });
  it("deletes and restores records", async () => {
    await deleteMedication("warfarin");
    expect(await getMedicationById("warfarin")).toBeUndefined();
    await resetToFactorySeed();
    expect(await getAllMedications()).toHaveLength(73);
  });
  it("exports and restores local edits", async () => {
    await saveMedication({ ...seedData[0], notes: "Backup round trip" });
    const json = await exportDatabaseToJson();
    await replaceRegistry([]);
    await importDatabaseFromJson(json);
    expect((await getMedicationById("warfarin"))?.notes).toBe(
      "Backup round trip",
    );
  });
  it("does not alter saved data when import validation fails", async () => {
    await expect(importDatabaseFromJson('[{"id":"broken"}]')).rejects.toThrow();
    expect(await getAllMedications()).toEqual(seedData);
  });
});
