import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/sync/syncQueue.js", () => ({
  enqueueSyncJob: vi.fn(async () => ({
    queued: true
  }))
}));

import { buildServer } from "../src/server.js";
import { resetConfigForTests } from "../src/config.js";
import { enqueueSyncJob } from "../src/sync/syncQueue.js";

function sign(body: string, secret: string) {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")
  );
}

describe("GitHub webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
    process.env.AI_PROVIDER = "mock";
    process.env.VAULT_REPO_URL = "";
    resetConfigForTests();
  });

  it("accepts GitHub ping deliveries", async () => {
    const app = await buildServer();

    try {
      const body = JSON.stringify({
        zen: "Keep it logically awesome.",
        repository: {
          full_name: "user/vault"
        }
      });

      const res = await app.inject({
        method: "POST",
        url: "/webhooks/github",
        headers: {
          "content-type": "application/json",
          "x-github-event": "ping",
          "x-github-delivery": "delivery-1",
          "x-hub-signature-256": sign(body, "test-secret")
        },
        payload: body
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        ok: true,
        event: "ping"
      });

      expect(enqueueSyncJob).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("accepts valid push deliveries and queues sync", async () => {
    const app = await buildServer();

    try {
      const body = JSON.stringify({
        ref: "refs/heads/main",
        after: "abc123",
        repository: {
          full_name: "user/vault"
        }
      });

      const res = await app.inject({
        method: "POST",
        url: "/webhooks/github",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-github-delivery": "delivery-2",
          "x-hub-signature-256": sign(body, "test-secret")
        },
        payload: body
      });

      expect(res.statusCode).toBe(202);
      expect(res.json()).toMatchObject({
        ok: true,
        accepted: true,
      });

      expect(enqueueSyncJob).toHaveBeenCalledTimes(1);
    } finally {
      await app.close();
    }
  });

  it("rejects invalid signatures", async () => {
    const app = await buildServer();

    try {
      const body = JSON.stringify({
        ref: "refs/heads/main"
      });

      const res = await app.inject({
        method: "POST",
        url: "/webhooks/github",
        headers: {
          "content-type": "application/json",
          "x-github-event": "push",
          "x-hub-signature-256": "sha256=invalid"
        },
        payload: body
      });

      expect(res.statusCode).toBe(401);
      expect(res.json()).toMatchObject({
        ok: false,
        error: "INVALID_SIGNATURE"
      });
    } finally {
      await app.close();
    }
  });

  it("ignores non-push events after signature verification", async () => {
    const app = await buildServer();

    try {
      const body = JSON.stringify({
        action: "opened"
      });

      const res = await app.inject({
        method: "POST",
        url: "/webhooks/github",
        headers: {
          "content-type": "application/json",
          "x-github-event": "issues",
          "x-hub-signature-256": sign(body, "test-secret")
        },
        payload: body
      });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toMatchObject({
        ok: true,
        ignored: true
      });
    } finally {
      await app.close();
    }
  });
});