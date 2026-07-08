import { describe, expect, it } from "vitest";
import { verifyGithubSignature } from "../src/webhooks/verifyGithubSignature.js";
import { signGithubBody } from "./_helpers.js";

describe("GitHub webhook signature verification", () => {
  it("accepts a valid sha256 signature", () => {
    const secret = "test-secret";
    const body = JSON.stringify({ zen: "Keep it logically awesome." });

    expect(
      verifyGithubSignature({
        rawBody: body,
        signatureHeader: signGithubBody(body, secret),
        secret
      })
    ).toBe(true);
  });

  it("rejects missing signatures", () => {
    expect(
      verifyGithubSignature({
        rawBody: "{}",
        signatureHeader: undefined,
        secret: "test-secret"
      })
    ).toBe(false);
  });

  it("rejects legacy sha1 signatures", () => {
    expect(
      verifyGithubSignature({
        rawBody: "{}",
        signatureHeader: "sha1=abc123",
        secret: "test-secret"
      })
    ).toBe(false);
  });

  it("rejects tampered payloads", () => {
    const secret = "test-secret";
    const originalBody = JSON.stringify({ ref: "refs/heads/main" });
    const tamperedBody = JSON.stringify({ ref: "refs/heads/evil" });

    expect(
      verifyGithubSignature({
        rawBody: tamperedBody,
        signatureHeader: signGithubBody(originalBody, secret),
        secret
      })
    ).toBe(false);
  });
});
