// scripts/backup.ts
import { DatabaseSync, backup } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
var source = resolve(process.env.DATABASE_PATH ?? "data/geriapharm.sqlite");
var dir = resolve(process.env.BACKUP_DIR ?? "data/backups");
mkdirSync(dir, { recursive: true, mode: 448 });
var target = join(
  dir,
  "geriapharm-" + (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-") + ".sqlite"
);
var db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, target);
  console.log("\u067E\u0634\u062A\u06CC\u0628\u0627\u0646 \u06A9\u0627\u0645\u0644 \u067E\u0627\u06CC\u06AF\u0627\u0647 \u062F\u0627\u062F\u0647 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F: " + target);
} finally {
  db.close();
}
//# sourceMappingURL=backup.mjs.map
