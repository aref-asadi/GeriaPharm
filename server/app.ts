import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { DatabaseSync } from "node:sqlite";
import {
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { z } from "zod";
import { registrySchema, drugSchema } from "../src/types/types";
import { seedData } from "../src/data/seedData";
const scrypt = promisify(scryptCb);
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const cookie = "gp_session";
export async function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return salt + ":" + key.toString("hex");
}
async function verify(password: string, encoded: string) {
  const [salt, key] = encoded.split(":");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(derived, Buffer.from(key, "hex"));
}
interface Config {
  databasePath: string;
  origin: string;
  secureCookies: boolean;
  adminEmail?: string;
  adminPassword?: string;
  serveStatic?: boolean;
  trustProxy?: boolean;
  proxyHops?: number;
  now?: () => number;
}
export async function createApp(config: Config) {
  if (config.databasePath !== ":memory:")
    mkdirSync(dirname(config.databasePath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(config.databasePath);
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
  );
  // Versioned, transactional schema migration; never resets existing records.
  db.exec(`BEGIN; CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
 CREATE TABLE IF NOT EXISTS registry(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS login_attempts(key TEXT PRIMARY KEY,count INTEGER NOT NULL,reset_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS audit_log(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,action TEXT NOT NULL,target TEXT NOT NULL,created_at TEXT NOT NULL);
 INSERT OR IGNORE INTO schema_migrations(version) VALUES(1); COMMIT;`);
  if (!db.prepare("SELECT id FROM admins LIMIT 1").get()) {
    if (
      !config.adminEmail ||
      !config.adminPassword ||
      config.adminPassword.length < 12 ||
      config.adminPassword.startsWith("replace-")
    )
      throw new Error(
        "برای راه‌اندازی اولیه، ADMIN_EMAIL و ADMIN_PASSWORD با حداقل ۱۲ نویسه لازم است. npm run setup را اجرا کنید.",
      );
    const email = z.string().email().parse(config.adminEmail).toLowerCase();
    db.prepare("INSERT INTO admins(email,password_hash) VALUES(?,?)").run(
      email,
      await passwordHash(config.adminPassword),
    );
  }
  db.prepare(
    "INSERT OR IGNORE INTO registry(id,data,revision,updated_at) VALUES(1,?,1,?)",
  ).run(JSON.stringify(seedData), new Date().toISOString());
  const dummy = await passwordHash(token());
  const now = config.now ?? Date.now;
  const app = express();
  app.disable("x-powered-by");
  if (config.proxyHops === 1) app.set("trust proxy", 1);
  else if (config.trustProxy) app.set("trust proxy", "loopback");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'"],
          imgSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: config.secureCookies ? [] : null,
        },
      },
      strictTransportSecurity: config.secureCookies ? undefined : false,
    }),
  );
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== config.origin
    )
      return void res.status(403).json({ message: "مبدأ درخواست مجاز نیست." });
    next();
  });
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());
  const options = {
    httpOnly: true,
    secure: config.secureCookies,
    sameSite: "strict" as const,
    path: "/api",
  };
  function session(req: Request) {
    const value = req.cookies[cookie];
    if (typeof value !== "string" || value.length > 100) return undefined;
    return db
      .prepare(
        "SELECT sessions.*,admins.email FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE token_hash=? AND expires_at>?",
      )
      .get(hash(value), now()) as
      | {
          token_hash: string;
          admin_id: number;
          csrf: string;
          email: string;
          expires_at: number;
        }
      | undefined;
  }
  function authorize(req: Request, res: Response, next: NextFunction) {
    const current = session(req);
    if (!current)
      return void res
        .status(401)
        .json({ message: "برای ادامه وارد حساب مدیر شوید." });
    if (!["GET", "HEAD"].includes(req.method)) {
      const csrf = req.get("x-csrf-token") ?? "";
      if (
        Buffer.byteLength(csrf) !== Buffer.byteLength(current.csrf) ||
        !timingSafeEqual(Buffer.from(csrf), Buffer.from(current.csrf))
      )
        return void res
          .status(403)
          .json({ message: "درخواست معتبر نیست؛ صفحه را تازه‌سازی کنید." });
    }
    res.locals.session = current;
    next();
  }
  function audit(actor: string, action: string, target = "") {
    db.prepare(
      "INSERT INTO audit_log(actor,action,target,created_at) VALUES(?,?,?,?)",
    ).run(actor, action, target, new Date(now()).toISOString());
  }
  function readRegistry() {
    const row = db.prepare("SELECT * FROM registry WHERE id=1").get() as {
      data: string;
      revision: number;
      updated_at: string;
    };
    return {
      medications: JSON.parse(row.data),
      revision: row.revision,
      updatedAt: row.updated_at,
    };
  }
  function updateRegistry(
    req: Request,
    res: Response,
    action: string,
    transform: (
      rows: z.infer<typeof registrySchema>,
    ) => z.infer<typeof registrySchema>,
    target = "",
  ) {
    if (!req.get("if-match"))
      return res
        .status(428)
        .json({ message: "نسخه فهرست مشخص نیست؛ ابتدا همگام‌سازی کنید." });
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = readRegistry();
      if (req.get("if-match") !== String(current.revision)) {
        db.exec("ROLLBACK");
        return res
          .status(409)
          .json({
            message:
              "فهرست توسط مدیر دیگری تغییر کرده است. همگام‌سازی کنید و دوباره تلاش کنید.",
          });
      }
      const meds = registrySchema.parse(transform(current.medications));
      db.prepare(
        "UPDATE registry SET data=?,revision=revision+1,updated_at=? WHERE id=1",
      ).run(JSON.stringify(meds), new Date(now()).toISOString());
      audit(res.locals.session.email, action, target);
      db.exec("COMMIT");
      return res.json(readRegistry());
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  app.get("/api/health", (_req, res) => {
    db.prepare("SELECT 1").get();
    res.json({ status: "ok" });
  });
  app.get("/api/registry", (_req, res) => res.json(readRegistry()));
  app.get("/api/auth/session", (req, res) => {
    const current = session(req);
    res.json(
      current
        ? {
            user: { email: current.email },
            csrfToken: current.csrf,
            expiresAt: current.expires_at,
          }
        : { user: null },
    );
  });
  app.post("/api/auth/login", async (req, res) => {
    const input = z
      .object({
        email: z.string().email().max(254),
        password: z.string().min(1).max(1024),
      })
      .parse(req.body);
    const email = input.email.toLowerCase();
    const keys = [
      { key: hash("ip:" + req.ip), limit: 8 },
      { key: hash("account:" + email), limit: 30 },
    ];
    db.prepare("DELETE FROM login_attempts WHERE reset_at<=?").run(now());
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now());
    for (const { key, limit } of keys) {
      const row = db
        .prepare("SELECT count,reset_at FROM login_attempts WHERE key=?")
        .get(key) as { count: number; reset_at: number } | undefined;
      if (row && row.count >= limit) {
        res.setHeader(
          "Retry-After",
          String(Math.ceil((row.reset_at - now()) / 1000)),
        );
        return void res
          .status(429)
          .json({
            message:
              "تلاش‌های ورود بیش از حد مجاز است. ۱۵ دقیقه دیگر دوباره تلاش کنید.",
          });
      }
    }
    for (const { key } of keys)
      db.prepare(
        "INSERT INTO login_attempts(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1",
      ).run(key, now() + 15 * 60 * 1000);
    const admin = db
      .prepare("SELECT * FROM admins WHERE email=?")
      .get(email) as { id: number; password_hash: string } | undefined;
    const valid = await verify(input.password, admin?.password_hash ?? dummy);
    if (!admin || !valid) {
      audit("ناشناس", "login_failed");
      return void res
        .status(401)
        .json({ message: "ایمیل یا رمز عبور نادرست است." });
    }
    // Rotate any previous session; never accept a client-provided session identifier.
    if (typeof req.cookies[cookie] === "string")
      db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
        hash(req.cookies[cookie]),
      );
    for (const { key } of keys)
      db.prepare("DELETE FROM login_attempts WHERE key=?").run(key);
    const value = token(),
      csrf = token(),
      expiresAt = now() + 8 * 60 * 60 * 1000;
    db.prepare(
      "INSERT INTO sessions(token_hash,admin_id,csrf,expires_at) VALUES(?,?,?,?)",
    ).run(hash(value), admin.id, csrf, expiresAt);
    audit(email, "login");
    res
      .cookie(cookie, value, { ...options, maxAge: 8 * 60 * 60 * 1000 })
      .json({ user: { email }, csrfToken: csrf, expiresAt });
  });
  app.post("/api/auth/logout", authorize, (_req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(
      res.locals.session.token_hash,
    );
    audit(res.locals.session.email, "logout");
    res.clearCookie(cookie, options).json({ ok: true });
  });
  app.post("/api/auth/password", authorize, async (req, res) => {
    const input = z
      .object({
        currentPassword: z.string().max(1024),
        newPassword: z.string().min(12).max(1024),
      })
      .parse(req.body);
    const admin = db
      .prepare("SELECT * FROM admins WHERE id=?")
      .get(res.locals.session.admin_id) as { password_hash: string };
    if (!(await verify(input.currentPassword, admin.password_hash)))
      return void res
        .status(400)
        .json({ message: "رمز عبور فعلی نادرست است." });
    const encoded = await passwordHash(input.newPassword);
    db.exec("BEGIN");
    try {
      db.prepare("UPDATE admins SET password_hash=? WHERE id=?").run(
        encoded,
        res.locals.session.admin_id,
      );
      db.prepare("DELETE FROM sessions WHERE admin_id=?").run(
        res.locals.session.admin_id,
      );
      audit(res.locals.session.email, "password_changed");
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    res.clearCookie(cookie, options).json({ ok: true });
  });
  app.use("/api/admin", authorize);
  app.get("/api/admin/audit", (_req, res) =>
    res.json(
      db.prepare("SELECT * FROM audit_log ORDER BY id DESC LIMIT 100").all(),
    ),
  );
  app.get("/api/admin/export", (_req, res) =>
    res
      .attachment("geriapharm-registry.json")
      .json({
        schemaVersion: 1,
        exportedAt: new Date(now()).toISOString(),
        medications: readRegistry().medications,
      }),
  );
  app.put("/api/admin/medications/:id", (req, res) => {
    const drug = drugSchema.parse(req.body);
    if (drug.id !== req.params.id)
      return void res
        .status(400)
        .json({ message: "شناسه دارو با مسیر درخواست یکسان نیست." });
    updateRegistry(
      req,
      res,
      "save_medication",
      (rows) => {
        const saved = {
          ...drug,
          lastUpdated: new Date(now()).toISOString().slice(0, 10),
        };
        return rows.some((r) => r.id === drug.id)
          ? rows.map((r) => (r.id === drug.id ? saved : r))
          : [...rows, saved];
      },
      drug.id,
    );
  });
  app.delete("/api/admin/medications/:id", (req, res) => {
    updateRegistry(
      req,
      res,
      "delete_medication",
      (rows) => rows.filter((r) => r.id !== req.params.id),
      String(req.params.id),
    );
  });
  app.put("/api/admin/registry", (req, res) => {
    const rows = registrySchema.parse(req.body.medications);
    updateRegistry(req, res, "import_registry", () => rows);
  });
  app.post("/api/admin/reset", (req, res) => {
    updateRegistry(req, res, "reset_registry", () => seedData);
  });
  app.use("/api", (_req, res) =>
    res.status(404).json({ message: "مسیر مورد نظر پیدا نشد." }),
  );
  if (config.serveStatic) {
    app.use(
      express.static(resolve("dist"), {
        index: false,
        setHeaders: (res, path) => {
          res.setHeader(
            "Cache-Control",
            path.includes("/assets/")
              ? "public,max-age=31536000,immutable"
              : "no-cache",
          );
        },
      }),
    );
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve("dist/index.html")),
    );
  }
  app.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (error instanceof z.ZodError)
        return void res
          .status(400)
          .json({
            message:
              "اطلاعات ارسالی معتبر نیست. فیلدهای الزامی و قالب داده را بررسی کنید.",
            issues: error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          });
      if (error instanceof SyntaxError)
        return void res.status(400).json({ message: "قالب JSON معتبر نیست." });
      if ((error as { status?: number })?.status === 413)
        return void res
          .status(413)
          .json({ message: "حجم فایل بیش از حد مجاز است." });
      console.error(
        "خطای داخلی سرور:",
        error instanceof Error ? error.message : "unknown",
      );
      res
        .status(500)
        .json({ message: "خطایی در سرور رخ داد. دوباره تلاش کنید." });
    },
  );
  return { app, db };
}
