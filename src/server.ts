import Fastify from "fastify";
import { getConfig } from "./config.js";
import { githubWebhookRoute } from "./webhooks/githubWebhook.js";
import { askRoute } from "./routes/ask.js";
import { syncRoutes } from "./routes/sync.js";

export async function buildServer() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => ({ ok: true }));

  await app.register(githubWebhookRoute);
  await app.register(syncRoutes);
  await app.register(askRoute);

  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    reply.code(500).send({
      ok: false,
      error: "INTERNAL_SERVER_ERROR",
      message: error.message
    });
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const config = getConfig();
  const app = await buildServer();

  await app.listen({ port: config.port, host: "0.0.0.0" });
  app.log.info(`AI Vault Agent running on port ${config.port}`);
}
