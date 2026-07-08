import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getConfig, resetConfigForTests } from "../src/config.js";
import { closeDbForTests } from "../src/db/db.js";
import { resetTestEnvironment } from "./_helpers.js";

describe("global config", () => {
  beforeEach(() => resetTestEnvironment());

  afterEach(() => {
    closeDbForTests();
    resetConfigForTests();
  });

  it("loads safe defaults for local mock mode", () => {
    const config = getConfig();

    expect(config.port).toBe(3000);
    expect(config.aiProvider).toBe("mock");
    expect(config.githubWebhookSecret).toBe("test-secret");
    expect(config.vaultBranch).toBe("main");
  });

  it("coerces numeric env vars", () => {
    resetTestEnvironment({
      PORT: "4242",
      AI_MAX_TOKENS: "999",
      AI_TEMPERATURE: "0.2"
    });

    const config = getConfig();

    expect(config.port).toBe(4242);
    expect(config.aiMaxTokens).toBe(999);
    expect(config.aiTemperature).toBe(0.2);
  });

  it("rejects invalid AI provider values", () => {
    resetTestEnvironment({ AI_PROVIDER: "invalid-provider" });

    expect(() => getConfig()).toThrow();
  });

  it("accepts Portkey mode with a configured API key", () => {
    resetTestEnvironment({
      AI_PROVIDER: "portkey",
      PORTKEY_API_KEY: "pk-test",
      AI_MODEL: "@anthropic-dev/claude-test"
    });

    const config = getConfig();

    expect(config.aiProvider).toBe("portkey");
    expect(config.portkeyApiKey).toBe("pk-test");
    expect(config.aiModel).toBe("@anthropic-dev/claude-test");
  });
});
