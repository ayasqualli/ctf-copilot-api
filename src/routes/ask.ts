import type { FastifyInstance } from "fastify";
import { AskRequestSchema } from "../schemas/askRequest.js";
import { forcedErrorPath } from "../schemas/finalAnswer.js";
import { runAskFlow } from "../ai/claudeRunner.js";

export async function askRoute(app: FastifyInstance) {
  app.post("/api/ask", async (request, reply) => {
    const parsed = AskRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send(
        forcedErrorPath({
          code: "INVALID_REQUEST",
          message: parsed.error.message
        })
      );
    }

    const result = await runAskFlow(parsed.data);

    if (result.error?.code === "INVALID_REQUEST") {
      return reply.code(400).send(result);
    }

    if (result.blocked) {
      return reply.code(400).send(result);
    }

    return reply.code(200).send(result);
  });
}
