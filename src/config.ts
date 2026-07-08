import dotenv from "dotenv";
import { z } from "zod";
import { GitRemoteSchema } from "./schemas/gitRemote.js";

dotenv.config();

const ConfigSchema = z.object({
    port: z.coerce.number().int().positive().default(3000),
    nodeEnv: z.string().default("development"),
    githubWebhookSecret: z.string().min(1).default("dev-secret"),
    vaultRepoUrl: z.string().default(""),
    vaultBranch: z.string().min(1).default("main"),
    vaultLocalPath: z.string().min(1).default("./vault-cache"),
    databasePath: z.string().min(1).default("./data/notes.db"),
    aiProvider: z.enum(["mock", "portkey"]).default("mock"),
    aiModel: z.string().min(1).default("@ctf-copilot/claude-sonnet-4-5-20250929"),
    aiMaxTokens: z.coerce.number().int().positive().default(1800),
    aiTemperature: z.coerce.number().min(0).max(1).default(0),
    portkeyApiKey: z.string().optional(),
    portkeyProvider: z.string().default(""),

    portkeyBaseUrl: z.string().url().default("https://api.portkey.ai/v1/messages"),
    portkeyRequestTimeoutMs: z.coerce.number().int().positive().default(45000)
}); 

export type AppConfig = z.infer<typeof ConfigSchema>;

let cached: AppConfig | null = null;

export function requireVaultRepoUrl(config: AppConfig): string {
    const parsed = GitRemoteSchema.safeParse(config.vaultRepoUrl);

    if (!parsed.success) {
        throw new Error(
            "VAULT_REPO_URL is required for vault sync and must be a valid Git remote."
        );
    }

    return parsed.data;
}

export function getConfig(): AppConfig {
    if (cached) return cached;

    cached = ConfigSchema.parse({
        port: process.env.PORT,
        nodeEnv: process.env.NODE_ENV,
        githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
        vaultRepoUrl: process.env.VAULT_REPO_URL,
        vaultLocalPath: process.env.VAULT_LOCAL_PATH,
        databasePath: process.env.DATABASE_PATH,
        aiProvider: process.env.AI_PROVIDER,
        aiModel: process.env.AI_MODEL,
        aiMaxTokens: process.env.AI_MAX_TOKENS,
        aiTemperature: process.env.AI_TEMPERATURE,
        portkeyApiKey: process.env.PORTKEY_API_KEY,
        portkeyProvider: process.env.PORTKEY_PROVIDER,
        portkeyBaseUrl: process.env.PORTKEY_BASE_URL,
        portkeyRequestTimeoutMs: process.env.PORTKEY_REQUEST_TIMEOUT_MS
        });

        return cached;
}

export function resetConfigForTests() {
    cached = null;
}