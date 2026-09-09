import { createApp } from "./app";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";
const production = process.env.NODE_ENV === "production";
const origin = process.env.APP_ORIGIN ?? "http://localhost:5173";
if (
  production &&
  !origin.startsWith("https://") &&
  process.env.COOKIE_SECURE !== "false"
)
  throw new Error("APP_ORIGIN باید نشانی HTTPS سایت باشد.");
const { app, db } = await createApp({
  databasePath: resolve(process.env.DATABASE_PATH ?? "data/geriapharm.sqlite"),
  origin,
  secureCookies: process.env.COOKIE_SECURE === "false" ? false : production,
  adminEmail: process.env.ADMIN_EMAIL,
  adminPassword: process.env.ADMIN_PASSWORD_FILE
    ? readFileSync(process.env.ADMIN_PASSWORD_FILE, "utf8").trim()
    : process.env.ADMIN_PASSWORD,
  serveStatic: production,
  trustProxy: process.env.TRUST_LOOPBACK_PROXY === "true",
  proxyHops: process.env.TRUST_PROXY_HOPS === "1" ? 1 : undefined,
});
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () =>
  console.log(`GeriaPharm API: http://localhost:${port}`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
