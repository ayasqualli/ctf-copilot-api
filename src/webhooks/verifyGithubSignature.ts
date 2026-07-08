import crypto from "crypto";

export function verifyGithubSignature(params: {
  rawBody: string | Buffer;
  signatureHeader: string | undefined;
  secret: string;
}): boolean {
  const { rawBody, signatureHeader, secret } = params;

  if (!signatureHeader) return false;
  if (!signatureHeader.startsWith("sha256=")) return false;

  const expectedSignature =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature, "utf8");
  const actualBuffer = Buffer.from(signatureHeader, "utf8");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
