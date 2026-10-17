import { afterEach, describe, it, expect } from "vitest";
import supertest from "supertest";
import { createApp } from "./app";
import { seedData } from "../src/data/seedData";
const origin = "http://localhost:5173";
const email = "test-admin@example.test",
  password = "Test-only-password-837!";
const instances: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(() => {
  for (const i of instances.splice(0)) i.db.close();
});
async function setup(extra: Partial<Parameters<typeof createApp>[0]> = {}) {
  const instance = await createApp({
    databasePath: ":memory:",
    origin,
    secureCookies: false,
    adminEmail: email,
    adminPassword: password,
    ...extra,
  });
  instances.push(instance);
  const agent = supertest.agent(instance.app);
  return { ...instance, agent };
}
async function signIn(agent: ReturnType<typeof supertest.agent>) {
  return agent
    .post("/api/auth/login")
    .set("Origin", origin)
    .send({ email, password });
}
describe("backend authentication and registry", () => {
  it("exposes Persian registry without exposing admin operations", async () => {
    const { agent } = await setup();
    const r = await agent.get("/api/registry");
    expect(r.status).toBe(200);
    expect(r.body.medications).toHaveLength(182);
    expect(r.body.medications[0].genericNameFa).toBe("وارفارین");
    expect((await agent.get("/api/admin/audit")).status).toBe(401);
    expect(
      (
        await agent
          .put("/api/admin/registry")
          .set("Origin", origin)
          .send({ medications: [] })
      ).status,
    ).toBe(401);
  });
  it("rejects incorrect login without revealing account existence", async () => {
    const { agent } = await setup();
    for (const e of [email, "unknown@example.test"]) {
      const r = await agent
        .post("/api/auth/login")
        .set("Origin", origin)
        .send({ email: e, password: "wrong" });
      expect(r.status).toBe(401);
      expect(r.body.message).toBe("ایمیل یا رمز عبور نادرست است.");
    }
  });
  it("stores password hashes and issues HttpOnly SameSite cookies", async () => {
    const { agent, db } = await setup();
    const stored = db.prepare("SELECT password_hash FROM admins").get() as {
      password_hash: string;
    };
    expect(stored.password_hash).not.toContain(password);
    const r = await signIn(agent);
    expect(r.status).toBe(200);
    expect(r.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(r.headers["set-cookie"][0]).toContain("SameSite=Strict");
    expect(r.body.csrfToken.length).toBeGreaterThan(30);
    expect((await agent.get("/api/auth/session")).body.user.email).toBe(email);
    const session = db.prepare("SELECT token_hash FROM sessions").get() as {
      token_hash: string;
    };
    expect(r.headers["set-cookie"][0]).not.toContain(session.token_hash);
  });
  it("adds Secure cookie in production configuration", async () => {
    const { agent } = await setup({ secureCookies: true });
    expect((await signIn(agent)).headers["set-cookie"][0]).toContain("Secure");
  });
  it("rejects cross-origin login and cross-origin writes", async () => {
    const { agent } = await setup();
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set("Origin", "https://evil.example")
          .send({ email, password })
      ).status,
    ).toBe(403);
    expect(
      (await agent.post("/api/auth/login").send({ email, password })).status,
    ).toBe(403);
  });
  it("requires a session-bound CSRF token for edits", async () => {
    const { agent } = await setup();
    await signIn(agent);
    for (const csrf of ["", "bad-token"])
      expect(
        (
          await agent
            .put("/api/admin/registry")
            .set("Origin", origin)
            .set("If-Match", "1")
            .set("X-CSRF-Token", csrf)
            .send({ medications: [] })
        ).status,
      ).toBe(403);
  });
  it("saves a medication, increments revision and audits the change", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    const r = await agent
      .put("/api/admin/medications/warfarin")
      .set("Origin", origin)
      .set("X-CSRF-Token", body.csrfToken)
      .set("If-Match", "1")
      .send({ ...seedData[0], notes: "بازبینی شد" });
    expect(r.status).toBe(200);
    expect(r.body.revision).toBe(2);
    expect(
      r.body.medications.find((d: { id: string }) => d.id === "warfarin").notes,
    ).toBe("بازبینی شد");
    expect((await agent.get("/api/admin/audit")).body[0].action).toBe(
      "save_medication",
    );
  });
  it("rejects stale or missing revision instead of losing concurrent updates", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    const mutation = () =>
      agent
        .put("/api/admin/registry")
        .set("Origin", origin)
        .set("X-CSRF-Token", body.csrfToken);
    expect((await mutation().send({ medications: [] })).status).toBe(428);
    expect(
      (await mutation().set("If-Match", "1").send({ medications: [] })).status,
    ).toBe(200);
    expect(
      (await mutation().set("If-Match", "1").send({ medications: seedData }))
        .status,
    ).toBe(409);
    expect((await agent.get("/api/registry")).body.medications).toEqual([]);
  });
  it("rejects invalid and duplicated records without changing the registry", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    for (const medications of [[{ id: "bad" }], [seedData[0], seedData[0]]])
      expect(
        (
          await agent
            .put("/api/admin/registry")
            .set("Origin", origin)
            .set("X-CSRF-Token", body.csrfToken)
            .set("If-Match", "1")
            .send({ medications })
        ).status,
      ).toBe(400);
    expect((await agent.get("/api/registry")).body.revision).toBe(1);
  });
  it("rejects mismatched path IDs", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    expect(
      (
        await agent
          .put("/api/admin/medications/other")
          .set("Origin", origin)
          .set("X-CSRF-Token", body.csrfToken)
          .set("If-Match", "1")
          .send(seedData[0])
      ).status,
    ).toBe(400);
  });
  it("supports deletion, full export and factory reset", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    const headers = { Origin: origin, "X-CSRF-Token": body.csrfToken };
    expect(
      (
        await agent
          .delete("/api/admin/medications/warfarin")
          .set(headers)
          .set("If-Match", "1")
      ).body.medications,
    ).toHaveLength(181);
    const backup = await agent.get("/api/admin/export");
    expect(backup.status).toBe(200);
    expect(backup.body.schemaVersion).toBe(1);
    expect(
      (await agent.post("/api/admin/reset").set(headers).set("If-Match", "2"))
        .body.medications,
    ).toHaveLength(182);
  });
  it("logs out and invalidates the server session", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    expect(
      (
        await agent
          .post("/api/auth/logout")
          .set("Origin", origin)
          .set("X-CSRF-Token", body.csrfToken)
      ).status,
    ).toBe(200);
    expect((await agent.get("/api/auth/session")).body.user).toBeNull();
    expect((await agent.get("/api/admin/export")).status).toBe(401);
  });
  it("expires sessions after eight hours", async () => {
    let time = Date.now();
    const { agent } = await setup({ now: () => time });
    await signIn(agent);
    time += 9 * 60 * 60 * 1000;
    expect((await agent.get("/api/auth/session")).body.user).toBeNull();
  });
  it("changes passwords and revokes all existing sessions", async () => {
    const { agent } = await setup();
    const { body } = await signIn(agent);
    expect(
      (
        await agent
          .post("/api/auth/password")
          .set("Origin", origin)
          .set("X-CSRF-Token", body.csrfToken)
          .send({
            currentPassword: password,
            newPassword: "New-test-password-887!",
          })
      ).status,
    ).toBe(200);
    expect((await agent.get("/api/auth/session")).body.user).toBeNull();
    expect((await signIn(agent)).status).toBe(401);
    expect(
      (
        await agent
          .post("/api/auth/login")
          .set("Origin", origin)
          .send({ email, password: "New-test-password-887!" })
      ).status,
    ).toBe(200);
  });
  it("rate limits repeated login failures", async () => {
    const { agent } = await setup();
    for (let i = 0; i < 8; i++)
      await agent
        .post("/api/auth/login")
        .set("Origin", origin)
        .send({ email, password: "wrong" });
    const r = await signIn(agent);
    expect(r.status).toBe(429);
    expect(r.headers["retry-after"]).toBeDefined();
  });
  it("disables caching for auth and admin APIs and sets security headers", async () => {
    const { agent } = await setup();
    const r = await agent.get("/api/auth/session");
    expect(r.headers["cache-control"]).toBe("no-store");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
});

function surveyScores(value: number, count = 25) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`q${index + 1}`, value]),
  );
}
function submission(overrides: Record<string, unknown> = {}) {
  return {
    id: "8f1b7c4e-9d38-4a2b-9f5e-1c6d2a7b0e33",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
    demographics: { age: 34, gender: "male", occupation: "pharmacist" },
    answers: surveyScores(4),
    ...overrides,
  };
}
type Db = Awaited<ReturnType<typeof createApp>>["db"];
const countRows = (db: Db) =>
  (
    db.prepare("SELECT COUNT(*) AS n FROM survey_responses").get() as {
      n: number;
    }
  ).n;

describe("UMARS survey responses", () => {
  it("stores an anonymous submission without any client identity", async () => {
    const { agent, db } = await setup();
    const posted = await agent
      .post("/api/survey")
      .set("Origin", origin)
      .send(submission());
    expect(posted.status).toBe(201);
    expect(posted.body).toMatchObject({
      id: "8f1b7c4e-9d38-4a2b-9f5e-1c6d2a7b0e33",
      duplicate: false,
    });
    const row = db.prepare("SELECT * FROM survey_responses").get() as Record<
      string,
      unknown
    >;
    expect(Object.keys(row).sort()).toEqual([
      "age",
      "answered",
      "answers",
      "created_at",
      "gender",
      "id",
      "mean",
      "occupation",
      "received_at",
      "total",
    ]);
    await signIn(agent);
    const listed = await agent.get("/api/admin/survey");
    expect(listed.status).toBe(200);
    expect(listed.body.count).toBe(1);
    expect(listed.body.responses[0]).toMatchObject({
      demographics: { age: 34, gender: "male", occupation: "pharmacist" },
      score: { answered: 25, total: 100, mean: 4 },
    });
    expect(listed.body.responses[0].answers.q25).toBe(4);
    expect(listed.body.responses[0].receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("is idempotent so retrying a queued submission cannot duplicate it", async () => {
    const { agent, db } = await setup();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const r = await agent
        .post("/api/survey")
        .set("Origin", origin)
        .send(submission());
      expect(r.status).toBe(201);
      expect(r.body.duplicate).toBe(attempt > 0);
    }
    expect(countRows(db)).toBe(1);
  });

  it("rejects malformed submissions without storing anything", async () => {
    const { agent, db } = await setup();
    const invalid = [
      submission({ demographics: { age: 12, gender: "male", occupation: "physician" } }),
      submission({ demographics: { age: 40, gender: "unknown", occupation: "physician" } }),
      submission({ answers: { q1: 9 } }),
      submission({ answers: { q99: 3 } }),
      submission({ createdAt: "not-a-date" }),
      submission({ id: "not-a-uuid" }),
    ];
    for (const body of invalid)
      expect(
        (await agent.post("/api/survey").set("Origin", origin).send(body)).status,
      ).toBe(400);
    expect(countRows(db)).toBe(0);
  });

  it("accepts the sixth Likert point of the four information items", async () => {
    const { agent } = await setup();
    const r = await agent
      .post("/api/survey")
      .set("Origin", origin)
      .send(submission({ answers: { ...surveyScores(4), q12: 6, q13: 6 } }));
    expect(r.status).toBe(201);
    await signIn(agent);
    const listed = await agent.get("/api/admin/survey");
    expect(listed.body.responses[0].answers.q12).toBe(6);
    expect(listed.body.responses[0].score.total).toBe(104);
  });

  it("refuses a future client timestamp but keeps delayed submissions", async () => {
    const { agent, db } = await setup();
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(
      (
        await agent
          .post("/api/survey")
          .set("Origin", origin)
          .send(submission({ createdAt: future }))
      ).status,
    ).toBe(400);
    const delayed = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    expect(
      (
        await agent
          .post("/api/survey")
          .set("Origin", origin)
          .send(submission({ createdAt: delayed }))
      ).status,
    ).toBe(201);
    expect(countRows(db)).toBe(1);
  });

  it("rejects cross-origin submissions like every other write", async () => {
    const { agent, db } = await setup();
    expect((await agent.post("/api/survey").send(submission())).status).toBe(403);
    expect(
      (
        await agent
          .post("/api/survey")
          .set("Origin", "https://evil.example")
          .send(submission())
      ).status,
    ).toBe(403);
    expect(countRows(db)).toBe(0);
  });

  it("caps bulk submissions at twenty per hour and client", async () => {
    const { agent, db } = await setup();
    for (let index = 0; index < 20; index += 1) {
      const r = await agent
        .post("/api/survey")
        .set("Origin", origin)
        .send(
          submission({
            id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
          }),
        );
      expect(r.status).toBe(201);
    }
    const blocked = await agent
      .post("/api/survey")
      .set("Origin", origin)
      .send(submission());
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(countRows(db)).toBe(20);
  });

  it("exports a BOM-prefixed CSV with Persian question headers", async () => {
    const { agent } = await setup();
    await agent.post("/api/survey").set("Origin", origin).send(submission());
    await signIn(agent);
    const csv = await agent.get("/api/admin/survey.csv");
    expect(csv.status).toBe(200);
    expect(csv.headers["content-type"]).toContain("text/csv");
    expect(csv.headers["content-disposition"]).toContain("attachment");
    const text = String(csv.text ?? "");
    expect(text.startsWith("\uFEFF")).toBe(true);
    const rows = text.slice(1).trim().split("\r\n");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("سن");
    expect(rows[0]).toContain("جنسیت");
    expect(rows[0]).toContain("سوال 1: علاقه");
    expect(rows[0]).toContain("سوال 25: تغییر رفتار");
    expect(rows[1]).toContain("مرد");
    expect(rows[1]).toContain("داروساز");
    expect(rows[1].endsWith(",25,100,4.00")).toBe(true);
  });

  it("protects the reset endpoint with CSRF and audits the deletion", async () => {
    const { agent, db } = await setup();
    await agent.post("/api/survey").set("Origin", origin).send(submission());
    expect(
      (await agent.post("/api/admin/survey/reset").set("Origin", origin)).status,
    ).toBe(401);
    const { body } = await signIn(agent);
    expect(
      (await agent.post("/api/admin/survey/reset").set("Origin", origin)).status,
    ).toBe(403);
    const reset = await agent
      .post("/api/admin/survey/reset")
      .set("Origin", origin)
      .set("X-CSRF-Token", body.csrfToken);
    expect(reset.body).toEqual({ ok: true, removed: 1 });
    expect(countRows(db)).toBe(0);
    const audit = await agent.get("/api/admin/audit");
    expect(audit.body[0]).toMatchObject({
      action: "reset_survey",
      target: "1",
    });
    expect((await agent.get("/api/admin/survey")).body).toEqual({
      count: 0,
      responses: [],
    });
  });
});

