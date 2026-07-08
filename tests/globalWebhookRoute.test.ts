import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signGithubBody, resetTestEnvironment } from "./_helpers.js";
import { closeDbForTests } from "../src/db/db.js";
import { resetConfigForTests } from "../src/config.js";

vi.mock("../src/sync/syncQueue.js", () => ({
  enqueueSyncJob: vi.fn(async () => ({ queued: true })),
  getSyncQueueStatus: vi.fn(() => ({
    isSyncing: false,
    pendingJob: null,
    lastResult: null,
    lastError: null
  }))
}));

describe("GitHub webhook route", () => {
  beforeEach(() => resetTestEnvironment());

  afterEach(() => {
    closeDbForTests();
    resetConfigForTests();
    vi.clearAllMocks();
  });

  it("accepts GitHub ping deliveries", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const body = JSON.stringify({
      zen: "Keep it logically awesome.",
      repository: { full_name: "user/vault" }
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/github",
      headers: {
        "content-type": "application/json",
        "x-github-event": "ping",
        "x-github-delivery": "delivery-ping",
        "x-hub-signature-256": signGithubBody(body, "test-secret")
      },
      payload: body
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true });

    await app.close();
  });

  it("accepts valid push deliveries and queues sync", async () => {
    const { buildServer } = await import("../src/server.js");
    const { enqueueSyncJob } = await import("../src/sync/syncQueue.js");
    const app = await buildServer();

    const body = JSON.stringify({
      ref: "refs/heads/main",
      after: "abc123",
      repository: { full_name: "user/vault" }
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/github",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": "delivery-push",
        "x-hub-signature-256": signGithubBody(body, "test-secret")
      },
      payload: body
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toMatchObject({
      ok: true,
      accepted: true,
      deliveryId: "delivery-push",
      repository: "user/vault",
      afterCommit: "abc123"
    });
    expect(enqueueSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "github-webhook",
        deliveryId: "delivery-push",
        repository: "user/vault",
        afterCommit: "abc123",
        branchRef: "refs/heads/main"
      })
    );

    await app.close();
  });

  it("rejects invalid signatures", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const body = JSON.stringify({ ref: "refs/heads/main" });

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
    expect(res.json()).toMatchObject({ ok: false, error: "INVALID_SIGNATURE" });

    await app.close();
  });

  it("ignores non-push events after signature verification", async () => {
    const { buildServer } = await import("../src/server.js");
    const app = await buildServer();

    const body = JSON.stringify({ action: "opened" });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/github",
      headers: {
        "content-type": "application/json",
        "x-github-event": "issues",
        "x-hub-signature-256": signGithubBody(body, "test-secret")
      },
      payload: body
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ ok: true, ignored: true });

    await app.close();
  });
});
