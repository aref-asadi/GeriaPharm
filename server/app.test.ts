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
    expect(r.body.medications).toHaveLength(15);
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
    ).toHaveLength(14);
    const backup = await agent.get("/api/admin/export");
    expect(backup.status).toBe(200);
    expect(backup.body.schemaVersion).toBe(1);
    expect(
      (await agent.post("/api/admin/reset").set(headers).set("If-Match", "2"))
        .body.medications,
    ).toHaveLength(15);
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
