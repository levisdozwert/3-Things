import type { IncomingMessage, ServerResponse } from "node:http";
import Anthropic from "@anthropic-ai/sdk";
import type { Plugin } from "vite";
import type { DistillRequest } from "../src/lib/distill/contract";
import { RelayCore, memoryStorage, type RelayStorage } from "../src/lib/remote/core";
import { distill, RefusedError, type DistillOptions } from "./distill";
import { isPerspectivesRequest, readAcross } from "./perspectives";

const MAX_BODY_BYTES = 256 * 1024;
/** An answer may carry a recording, when the person answering allowed it. */
const MAX_ANSWER_BYTES = 9 * 1024 * 1024;

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage, limit = MAX_BODY_BYTES): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error("Body too large");
    chunks.push(chunk as Buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function isThing(value: unknown): boolean {
  const t = value as { headline?: unknown; detail?: unknown };
  return typeof t === "object" && t !== null && typeof t.headline === "string" && typeof t.detail === "string";
}

function isFollowUp(value: unknown): boolean {
  if (value === undefined) return true;
  const f = value as { kind?: unknown; asked?: unknown; transcript?: unknown; keep?: unknown; want?: unknown; thing?: unknown };
  if (typeof f !== "object" || f === null || typeof f.asked !== "string" || typeof f.transcript !== "string") return false;
  if (f.kind === "more") return Array.isArray(f.keep) && f.keep.every(isThing) && (f.want === 1 || f.want === 2);
  if (f.kind === "clarify") return isThing(f.thing);
  return false;
}

function isDistillRequest(value: unknown): value is DistillRequest {
  const v = value as DistillRequest;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.question === "string" &&
    typeof v.transcript === "string" &&
    (v.person === undefined || typeof v.person === "string") &&
    isFollowUp(v.followUp)
  );
}

function isOwnerRequest(value: unknown): value is { ownerKey: string; answerIds?: string[] } {
  const v = value as { ownerKey?: unknown; answerIds?: unknown };
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.ownerKey === "string" &&
    (v.answerIds === undefined || (Array.isArray(v.answerIds) && v.answerIds.every((a) => typeof a === "string")))
  );
}

function isStatusRequest(value: unknown): value is { items: { id: string; ownerKey: string }[] } {
  const v = value as { items?: unknown };
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray(v.items) &&
    v.items.length <= 200 &&
    v.items.every((i) => typeof i?.id === "string" && typeof i?.ownerKey === "string")
  );
}

export interface ApiOptions extends DistillOptions {
  /** Where the relay keeps questions. In memory when omitted. */
  relayStorage?: RelayStorage;
}

/**
 * GET  /api/health                → { ready, relay } — live distilling; the question relay.
 * POST /api/distill               → DistillResponse
 * POST /api/perspectives          → PerspectivesResponse     several answers to one question, read side by side
 *
 * Asking someone who isn't with you (see src/lib/remote):
 * POST /api/remote                → { id, ownerKey }         the asker creates a question
 * GET  /api/remote/:id[?peek=1]   → PublicQuestion           the link opens (peek: the asker previewing)
 * POST /api/remote/:id/answer     → { result }               the reviewed answer, and nothing else
 * POST /api/remote/status         → QuestionStatus[]         the asker's app, with its keys
 * POST /api/remote/:id/collect    → {}                       collected: the relay forgets the answers
 * POST /api/remote/:id/delete     → {}                       the link says it's no longer available
 *
 * Framework-agnostic Node middleware. Mounted into Vite's dev and preview
 * servers below; the same handler can sit behind any Node host.
 */
export function createApiHandler(options: ApiOptions) {
  const ready = Boolean(options.apiKey);
  const relay = new RelayCore(options.relayStorage ?? memoryStorage());

  return async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const [url, search = ""] = (req.url ?? "").split("?");

    if (url === "/api/health" && req.method === "GET") {
      return send(res, 200, { ready, relay: true });
    }

    if (url.startsWith("/api/remote")) {
      // Private by nature: never cached, never indexed.
      res.setHeader("cache-control", "no-store");
      res.setHeader("x-robots-tag", "noindex, nofollow");
      return handleRemote(relay, req, res, url, new URLSearchParams(search));
    }

    if ((url === "/api/distill" || url === "/api/perspectives") && req.method === "POST") {
      if (!ready) return send(res, 503, { error: "not_configured" });
      let body: unknown;
      try {
        body = await readJson(req);
      } catch {
        return send(res, 400, { error: "invalid_body" });
      }

      try {
        if (url === "/api/perspectives") {
          if (!isPerspectivesRequest(body)) return send(res, 400, { error: "invalid_request" });
          // What people told the asker stays private: never cached along the way.
          res.setHeader("cache-control", "no-store");
          return send(res, 200, await readAcross(body, options));
        }
        if (!isDistillRequest(body)) return send(res, 400, { error: "invalid_request" });
        return send(res, 200, await distill(body, options));
      } catch (error) {
        if (error instanceof RefusedError) return send(res, 422, { error: "declined" });
        if (error instanceof Anthropic.RateLimitError) return send(res, 429, { error: "busy" });
        if (error instanceof Anthropic.APIError) {
          console.error(`[3 Things] API error ${error.status}: ${error.message}`);
          return send(res, 502, { error: "upstream" });
        }
        console.error(`[3 Things] ${url} failed`, error);
        return send(res, 500, { error: "internal" });
      }
    }

    next();
  };
}

async function handleRemote(relay: RelayCore, req: IncomingMessage, res: ServerResponse, url: string, params: URLSearchParams) {
  const parts = url.split("/").filter(Boolean); // ["api", "remote", id?, action?]
  const id = parts[2];
  const action = parts[3];
  let body: unknown;
  if (req.method === "POST") {
    try {
      body = await readJson(req, action === "answer" ? MAX_ANSWER_BYTES : MAX_BODY_BYTES);
    } catch {
      return send(res, 400, { error: "invalid_body" });
    }
  }

  if (!id && req.method === "POST") {
    try {
      return send(res, 201, relay.create(body as never));
    } catch {
      return send(res, 400, { error: "invalid_question" });
    }
  }
  if (id === "status" && !action && req.method === "POST") {
    if (!isStatusRequest(body)) return send(res, 400, { error: "invalid_request" });
    return send(res, 200, relay.status(body.items));
  }
  if (id && !action && req.method === "GET") {
    const view = relay.view(id, { peek: params.get("peek") === "1" });
    return view ? send(res, 200, view) : send(res, 410, { error: "gone" });
  }
  if (id && action === "answer" && req.method === "POST") {
    const result = relay.answer(id, body as never);
    const status = { sent: 201, gone: 410, closed: 409, invalid: 400 }[result];
    return send(res, status, { result });
  }
  if (id && (action === "collect" || action === "delete") && req.method === "POST") {
    if (!isOwnerRequest(body)) return send(res, 400, { error: "invalid_request" });
    if (action === "collect") relay.collect(id, body.ownerKey, body.answerIds ?? []);
    else relay.remove(id, body.ownerKey);
    return send(res, 200, {});
  }
  return send(res, 404, { error: "not_found" });
}

export function threeThingsApi(options: ApiOptions): Plugin {
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
