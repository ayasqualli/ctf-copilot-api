import type { FastifyInstance } from "fastify";
import { getIndexStatus } from "../ingest/indexMarkdown.js";
import { syncVaultNow } from "../sync/gitSync.js";
import { getSyncQueueStatus } from "../sync/syncQueue.js";

export async function syncRoutes(app: FastifyInstance) {
  app.post("/api/sync", async () => {
    return syncVaultNow("manual");
  });

  app.get("/api/index/status", async () => {
    return getIndexStatus();
  });

  app.get("/api/sync/status", async () => {
    return getSyncQueueStatus();
  });
}
