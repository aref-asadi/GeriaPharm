import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { passwordHash } from "../server/app";
const email = process.env.ADMIN_EMAIL,
  password = process.env.ADMIN_PASSWORD_FILE
    ? readFileSync(process.env.ADMIN_PASSWORD_FILE, "utf8").trim()
    : process.env.ADMIN_PASSWORD;
if (!email || !password || password.length < 12)
  throw new Error("ADMIN_EMAIL و ADMIN_PASSWORD با حداقل ۱۲ نویسه لازم است.");
const db = new DatabaseSync(
  process.env.DATABASE_PATH ?? "data/geriapharm.sqlite",
);
const encoded = await passwordHash(password);
db.exec("BEGIN IMMEDIATE");
try {
  const result = db
    .prepare("UPDATE admins SET password_hash=? WHERE email=?")
    .run(encoded, email.toLowerCase());
  if (!result.changes) throw new Error("مدیر پیدا نشد.");
  db.prepare(
    "DELETE FROM sessions WHERE admin_id IN(SELECT id FROM admins WHERE email=?)",
  ).run(email.toLowerCase());
  db.exec("COMMIT");
  console.log("رمز عبور بازنشانی شد و نشست‌های قبلی بسته شدند.");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
} finally {
  db.close();
}
