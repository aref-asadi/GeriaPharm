import Dexie from "dexie";
import { seedData } from "../data/seedData";
import { registrySchema, type DrugRecord } from "../types/types";
const db = new Dexie("geriapharm");
db.version(1).stores({ state: "key" });
const key = "geriapharm-registry-v1";
export let storageMode = "IndexedDB";
let fallback = false;
export async function getAllMedications(): Promise<DrugRecord[]> {
  let rows: unknown;
  try {
    rows = (await db.table("state").get("registry"))?.value;
  } catch {
    fallback = true;
    storageMode = "LocalStorage";
  }
  if (fallback) {
    const saved = localStorage.getItem(key);
    rows = saved === null ? undefined : JSON.parse(saved);
  }
  if (rows === undefined) {
    await replaceRegistry(seedData);
    return structuredClone(seedData);
  }
  return registrySchema.parse(rows);
}
export async function replaceRegistry(rows: DrugRecord[]) {
  const valid = registrySchema.parse(rows);
  if (fallback) {
    localStorage.setItem(key, JSON.stringify(valid));
    return;
  }
  try {
    await db.table("state").put({ key: "registry", value: valid });
  } catch (error) {
    throw new Error(
      "ذخیره آفلاین انجام نشد. فضای ذخیره‌سازی مرورگر را بررسی کنید.",
      { cause: error },
    );
  }
}
export async function getMedicationById(id: string) {
  return (await getAllMedications()).find((r) => r.id === id);
}
export async function saveMedication(med: DrugRecord) {
  const rows = await getAllMedications();
  await replaceRegistry([...rows.filter((r) => r.id !== med.id), med]);
}
export async function deleteMedication(id: string) {
  await replaceRegistry((await getAllMedications()).filter((r) => r.id !== id));
}
export async function exportDatabaseToJson() {
  return JSON.stringify(
    {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      medications: await getAllMedications(),
    },
    null,
    2,
  );
}
export function parseImport(json: string) {
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("فایل JSON معتبر نیست.");
  }
  if (parsed === null || typeof parsed !== "object")
    throw new Error("ساختار فایل پشتیبان معتبر نیست.");
  if (!Array.isArray(parsed) && parsed.schemaVersion !== 1)
    throw new Error("نسخه فایل پشتیبان پشتیبانی نمی‌شود.");
  return registrySchema.parse(
    Array.isArray(parsed) ? parsed : parsed.medications,
  );
}
export async function importDatabaseFromJson(json: string) {
  await replaceRegistry(parseImport(json));
}
export async function resetToFactorySeed() {
  await replaceRegistry(seedData);
}
