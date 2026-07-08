import { syncVaultNow } from "./gitSync.js";

export type SyncJob = {
  source: "github-webhook" | "manual";
  deliveryId?: string;
  repository?: string;
  afterCommit?: string;
  branchRef?: string;
};

let isSyncing = false;
let pendingJob: SyncJob | null = null;
let lastResult: unknown = null;
let lastError: string | null = null;

export async function enqueueSyncJob(job: SyncJob) {
  pendingJob = job;

  if (isSyncing) {
    return { queued: true, collapsedIntoLatest: true };
  }

  void runQueue();
  return { queued: true };
}

export function getSyncQueueStatus() {
  return {
    isSyncing,
    pendingJob,
    lastResult,
    lastError
  };
}

async function runQueue() {
  isSyncing = true;
  lastError = null;

  try {
    while (pendingJob) {
      const job = pendingJob;
      pendingJob = null;
      lastResult = await syncVaultNow(job.source, job);
    }
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
  } finally {
    isSyncing = false;
  }
}
