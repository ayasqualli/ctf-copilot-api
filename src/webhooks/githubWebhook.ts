import type { FastifyInstnace } from "fastify";
import { getConfig } from "../config.js";
import { enqueueSyncJob } from "../sync/syncQueue.js";