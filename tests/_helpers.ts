import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type Database from "better-sqlite3";
import { resetConfigForTests } from "../src/config.js";
import { closeDbForTests, getDb } from "../src/db/db.js";
import type { ToolContext } from "../src/tools/ToolContext.js";

export function signGithubBody(body: string, secret: string): string {
  return (
    "sha256=" +
    crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex")
  );
}

export async function makeTempDir(prefix = "ai-vault-agent-test-") {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function writeVaultFile(root: string, relPath: string, content: string) {
  const abs = path.join(root, relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf8");
}

export function resetTestEnvironment(extraEnv: Record<string, string | undefined> = {}) {
  closeDbForTests();
  resetConfigForTests();

  delete process.env.PORT;
  delete process.env.NODE_ENV;
  delete process.env.GITHUB_WEBHOOK_SECRET;
  delete process.env.VAULT_REPO_URL;
  delete process.env.VAULT_BRANCH;
  delete process.env.VAULT_LOCAL_PATH;
  delete process.env.DATABASE_PATH;
  delete process.env.AI_PROVIDER;
  delete process.env.AI_MODEL;
  delete process.env.AI_MAX_TOKENS;
  delete process.env.AI_TEMPERATURE;
  delete process.env.PORTKEY_API_KEY;
  delete process.env.PORTKEY_PROVIDER;
  delete process.env.PORTKEY_BASE_URL;
  delete process.env.PORTKEY_REQUEST_TIMEOUT_MS;

  process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
  process.env.AI_PROVIDER = "mock";

  for (const [key, value] of Object.entries(extraEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  resetConfigForTests();
}

export function createToolContext(db?: Database.Database): ToolContext {
  return {
    userId: "test-user",
    requestId: "test-request",
    db: db ?? getDb(),
    usedTools: [],
    retrievedSources: [],
    blocked: false,
    errors: []
  };
}
