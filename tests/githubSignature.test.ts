import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyGithubSignature } from "../src/webhooks/verifyGithubSignature.js";

describe("verifyGithubSignature", () => {
  it("accepts a valid sha256 signature", () => {
    const body = JSON.stringify({ hello: "world" });
    const secret = "test-secret";
    const signature =
      "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

    expect(
      verifyGithubSignature({ rawBody: body, signatureHeader: signature, secret })
    ).toBe(true);
  });

  it("rejects an invalid signature", () => {
    expect(
      verifyGithubSignature({
        rawBody: "{}",
        signatureHeader: "sha256=deadbeef",
        secret: "test-secret"
      })
    ).toBe(false);
  });

  it("rejects missing signature", () => {
    expect(
      verifyGithubSignature({
        rawBody: "{}",
        signatureHeader: undefined,
        secret: "test-secret"
      })
    ).toBe(false);
  });
});
