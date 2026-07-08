import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetConfigForTests } from "../src/config.js";
import { closeDbForTests } from "../src/db/db.js";
import { resetTestEnvironment } from "./_helpers.js";

describe("health and ask routes", () => {
  beforeEach(() => resetTestEnvironment({ AI_PROVIDER: "mock" }));

  afterEach(() => {
    closeDbForTests();
    resetConfigForTests();
  });

  it("GET /health returns ok", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const res = await app.inject({ method: "GET", url: "/health" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });

    await app.close();
  });

  it("POST /api/ask rejects invalid requests", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/api/ask",
      payload: { userId: "test-user", question: "" }
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({
      shouldContinue: false,
      blocked: false,
      error: { code: "INVALID_REQUEST" }
    });

    await app.close();
  });

  it("POST /api/ask returns schema-shaped output in mock mode", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const res = await app.inject({
      method: "POST",
      url: "/api/ask",
      payload: {
        userId: "test-user",
        question: "What do my notes say about APK analysis?",
        mode: "research"
      }
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      shouldContinue: true,
      blocked: false,
      error: null
    });
    expect(res.json()).toHaveProperty("answer");
    expect(res.json()).toHaveProperty("sources");
    expect(res.json()).toHaveProperty("toolCalls");

    await app.close();
  });
});
