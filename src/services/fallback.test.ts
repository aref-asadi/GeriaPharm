import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("dexie", () => ({
  default: class {
    version() {
      return { stores: () => {} };
    }
    table() {
      return {
        get: async () => {
          throw new Error("IndexedDB unavailable");
        },
      };
    }
  },
}));
const memory = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => memory.set(key, value),
  removeItem: (key: string) => memory.delete(key),
});
const db = await import("./db");
beforeEach(() => memory.clear());
describe("LocalStorage fallback", () => {
  it("seeds when IndexedDB is unavailable", async () => {
    expect(await db.getAllMedications()).toHaveLength(73);
    expect(db.storageMode).toBe("LocalStorage");
  });
  it("persists an empty registry without reseeding", async () => {
    await db.getAllMedications();
    await db.replaceRegistry([]);
    expect(await db.getAllMedications()).toEqual([]);
  });
  it("preserves malformed stored data rather than overwriting it", async () => {
    memory.set("geriapharm-registry-v1", "corrupt");
    await expect(db.getAllMedications()).rejects.toThrow();
    expect(memory.get("geriapharm-registry-v1")).toBe("corrupt");
  });
  it("surfaces storage quota failure", async () => {
    await db.getAllMedications();
    const spy = vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("Quota exceeded");
    });
    await expect(db.replaceRegistry([])).rejects.toThrow("Quota exceeded");
    spy.mockRestore();
  });
});
