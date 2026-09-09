import { createApp } from "../server/app";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "geriapharm-e2e-"));
const { app, db } = await createApp({
  databasePath: join(dir, "test.sqlite"),
  origin: "http://127.0.0.1:4174",
  secureCookies: false,
  adminEmail: "qa@example.test",
  adminPassword: "QA-only-password-59842!",
  serveStatic: true,
});
const server = app.listen(4174, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      rmSync(dir, { recursive: true, force: true });
      process.exit(0);
    }),
  );
