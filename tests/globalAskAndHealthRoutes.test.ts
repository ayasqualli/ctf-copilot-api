import { beforeEach, describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { resetConfigForTests } from "../src/config.js";

describe("health and ask routes", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "mock";
    process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
    process.env.VAULT_REPO_URL = "";
    resetConfigForTests();
  });

  it("GET /health returns ok", async () => {
    const app = await buildServer();

    try {
      const res = await app.inject({
        method: "GET",
        url: "/health"
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual({ ok: true });
    } finally {
      await app.close();
    }
  });

  it("POST /api/ask rejects invalid requests", async () => {
    const app = await buildServer();

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/ask",
        payload: {
          userId: "test-user",
          question: ""
        }
      });

      expect(res.statusCode).toBe(400);
    } finally {
      await app.close();
    }
  });

  it("POST /api/ask returns schema-shaped output in mock mode", async () => {
    const app = await buildServer();

    try {
      const res = await app.inject({
        method: "POST",
        url: "/api/ask",
        payload: {
          userId: "test-user",
          question: "What do my notes say about APK analysis?"
        }
      });

      expect(res.statusCode).toBe(200);

      const body = res.json();

      expect(body).toHaveProperty("shouldContinue");
      expect(body).toHaveProperty("sources");
      expect(body).toHaveProperty("toolCalls");
      expect(body).toHaveProperty("blocked");
      expect(body).toHaveProperty("error");
    } finally {
      await app.close();
    }
  });
});