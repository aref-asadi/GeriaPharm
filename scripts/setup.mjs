import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
if (existsSync(".env")) {
  console.log("فایل .env از قبل وجود دارد؛ برای حفظ تنظیمات بازنویسی نشد.");
  process.exit(0);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
const email = await rl.question("ایمیل مدیر: ");
const origin =
  (await rl.question("نشانی سایت (برای توسعه Enter بزنید): ")) ||
  "http://localhost:5173";
rl.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || /[\r\n]/.test(email))
  throw new Error("ایمیل معتبر نیست.");
const url = new URL(origin);
if (!["http:", "https:"].includes(url.protocol))
  throw new Error("نشانی سایت معتبر نیست.");
const password = randomBytes(24).toString("base64url");
writeFileSync(
  ".env",
  `ADMIN_EMAIL=${email}\nADMIN_PASSWORD=${password}\nSITE_HOST=${url.hostname}\nAPP_ORIGIN=${url.origin}\nDATABASE_PATH=data/geriapharm.sqlite\nCOOKIE_SECURE=${url.protocol === "https:"}\n`,
  { mode: 0o600, flag: "wx" },
);
console.log(
  "تنظیمات ایجاد شد. رمز اولیه مدیر (در محل امن نگهداری کنید):\n" +
    password +
    "\nپس از ورود، رمز را از پنل مدیر تغییر دهید.",
);
