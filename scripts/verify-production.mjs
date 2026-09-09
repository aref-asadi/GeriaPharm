import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:net";
import assert from "node:assert/strict";
const probe = createServer();
await new Promise((r) => probe.listen(0, "127.0.0.1", r));
const port = probe.address().port;
await new Promise((r) => probe.close(r));
const dir = mkdtempSync(join(tmpdir(), "geriapharm-production-"));
const origin = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  NODE_ENV: "production",
  HOST: "127.0.0.1",
  PORT: String(port),
  APP_ORIGIN: origin,
  COOKIE_SECURE: "false",
  DATABASE_PATH: join(dir, "registry.sqlite"),
  BACKUP_DIR: join(dir, "backups"),
  ADMIN_EMAIL: "production-test@example.test",
  ADMIN_PASSWORD: "Temporary-test-password-19852!",
};
const server = spawn(process.execPath, ["dist-server/index.mjs"], {
  env,
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
server.stderr.on("data", (d) => {
  logs += d;
});
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(origin + "/api/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  assert(ready, "Production server did not start: " + logs);
  const html = await (await fetch(origin)).text();
  assert(html.includes('dir="rtl"'));
  assert(html.includes("جریافارم"));
  const registry = await (await fetch(origin + "/api/registry")).json();
  assert.equal(registry.medications.length, 15);
  assert.equal((await fetch(origin + "/api/admin/export")).status, 401);
  const auth = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    }),
  });
  assert.equal(auth.status, 200);
  const backup = spawnSync(process.execPath, ["dist-server/backup.mjs"], {
    env,
    encoding: "utf8",
  });
  assert.equal(backup.status, 0, backup.stderr);
  assert.equal(
    readdirSync(env.BACKUP_DIR).filter((f) => f.endsWith(".sqlite")).length,
    1,
  );
  const reset = spawnSync(process.execPath, ["dist-server/reset-admin.mjs"], {
    env: { ...env, ADMIN_PASSWORD: "Temporary-reset-password-88521!" },
    encoding: "utf8",
  });
  assert.equal(reset.status, 0, reset.stderr);
  const login = await fetch(origin + "/api/auth/login", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.ADMIN_EMAIL,
      password: "Temporary-reset-password-88521!",
    }),
  });
  assert.equal(login.status, 200);
  console.log(
    "Production bundle, Persian static UI, protected API, SQLite backup and admin recovery: passed.",
  );
} finally {
  server.kill("SIGTERM");
  await new Promise((r) => server.once("exit", r));
  rmSync(dir, { recursive: true, force: true });
}
