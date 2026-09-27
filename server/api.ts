import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import type { Plugin } from "vite";
import type { DistillRequest } from "../src/lib/distill/contract";
import { distill, RefusedError, type DistillOptions } from "./distill";

const MAX_BODY_BYTES = 256 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isDistillRequest(value: unknown): value is DistillRequest {
  const v = value as DistillRequest;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.question === "string" &&
    typeof v.transcript === "string" &&
    (v.person === undefined || typeof v.person === "string")
  );
}

/**
 * GET  /api/health   → { ready } — whether live distilling is available.
 * POST /api/distill  → DistillResponse
 *
 * Framework-agnostic Node middleware. Mounted into Vite's dev and preview
 * servers below; the same handler can sit behind any Node host.
 */
export function createApiHandler(options: DistillOptions) {
  const ready = Boolean(options.apiKey);

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url?.split("?")[0];

    if (url === "/api/health" && req.method === "GET") {
      return send(res, 200, { ready });
    }

    if (url === "/api/distill" && req.method === "POST") {
      if (!ready) return send(res, 503, { error: "not_configured" });
      let body: unknown;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { error: "invalid_body" });
      }
      if (!isDistillRequest(body)) return send(res, 400, { error: "invalid_request" });

      try {
        return send(res, 200, await distill(body, options));
      } catch (error) {
        if (error instanceof RefusedError) return send(res, 422, { error: "declined" });
        if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: "busy" });
        if (error instanceof Anthropic.APIError) {
          console.error(`[3 Things] API error ${error.status}: ${error.message}`);
          return send(res, 502, { error: "upstream" });
        }
        console.error("[3 Things] distill failed", error);
        return send(res, 500, { error: "internal" });
      }
    }

    next();
  };
}

export function threeThingsApi(options: DistillOptions): Plugin {
  const handler = createApiHandler(options);
  return {
    name: "three-things-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}
