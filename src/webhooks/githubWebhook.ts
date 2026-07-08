import type { FastifyInstance } from "fastify";
import { getConfig } from "../config.js";
import { enqueueSyncJob } from "../sync/syncQueue.js";
import { verifyGithubSignature } from "./verifyGithubSignature.js";

export async function githubWebhookRoute(app: FastifyInstance) {
  app.post(
    "/webhooks/github",
    { config: { rawBody: true } },
    async (request, reply) => {
      const rawBody = (request as unknown as { rawBody?: string }).rawBody;

      if (!rawBody) {
        return reply.code(400).send({ ok: false, error: "MISSING_RAW_BODY" });
      }

      const config = getConfig();
      const signature = request.headers["x-hub-signature-256"] as
        | string
        | undefined;

      const valid = verifyGithubSignature({
        rawBody,
        signatureHeader: signature,
        secret: config.githubWebhookSecret,
      });

      if (!valid) {
        return reply.code(401).send({ ok: false, error: "INVALID_SIGNATURE" });
      }

      const event = request.headers["x-github-event"];
      const deliveryId = request.headers["x-github-delivery"] as string | undefined;

      if (event === "ping") {
        return reply.code(200).send({
          ok: true,
          event: "ping",
          message: "GitHub webhook ping received successfully",
          deliveryId,
        });
      }

      if (event !== "push") {
        return reply.code(200).send({
          ok: true,
          ignored: true,
          reason: `Ignoring event ${event}`,
          deliveryId,
        });
      }

      const payload = JSON.parse(rawBody) as {
        repository?: { full_name?: string };
        after?: string;
        ref?: string;
      };

      await enqueueSyncJob({
        source: "github-webhook",
        deliveryId,
        repository: payload.repository?.full_name,
        afterCommit: payload.after,
        branchRef: payload.ref,
      });

      return reply.code(202).send({
        ok: true,
        accepted: true,
        deliveryId,
        repository: payload.repository?.full_name,
        afterCommit: payload.after,
      });
    },
  );
}
