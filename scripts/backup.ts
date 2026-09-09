import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
const source = resolve(process.env.DATABASE_PATH ?? "data/geriapharm.sqlite");
const dir = resolve(process.env.BACKUP_DIR ?? "data/backups");
mkdirSync(dir, { recursive: true, mode: 0o700 });
const target = join(
  dir,
  "geriapharm-" + new Date().toISOString().replace(/[:.]/g, "-") + ".sqlite",
);
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, target);
  console.log("پشتیبان کامل پایگاه داده ذخیره شد: " + target);
} finally {
  db.close();
}
