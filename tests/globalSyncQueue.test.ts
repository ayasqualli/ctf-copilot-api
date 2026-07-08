import { describe, expect, it, vi } from "vitest";

vi.mock("../src/sync/gitSync.js", () => ({
  syncVaultNow: vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return { ok: true, source: "mock" };
  })
}));

describe("sync queue", () => {
  it("accepts jobs and collapses a concurrent pending job", async () => {
    const { enqueueSyncJob, getSyncQueueStatus } = await import("../src/sync/syncQueue.js");

    const first = await enqueueSyncJob({ source: "github-webhook", deliveryId: "1" });
    const second = await enqueueSyncJob({ source: "github-webhook", deliveryId: "2" });

    expect(first.queued).toBe(true);
    expect(second.queued).toBe(true);

    const status = getSyncQueueStatus();
    expect(status).toHaveProperty("isSyncing");
    expect(status).toHaveProperty("pendingJob");
    expect(status).toHaveProperty("lastError");
  });
});
