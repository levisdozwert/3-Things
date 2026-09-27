import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { PERSPECTIVE_LIMITS, type PerspectivesRequest, type PerspectivesResponse } from "../src/lib/perspectives/contract";
import { groundThemes } from "../src/lib/perspectives/grounding";
import { EDITOR_MODEL, RefusedError, type DistillOptions } from "./distill";
import { PERSPECTIVES_PROMPT, perspectivesMessage } from "./perspectivesPrompt";

const ThemeSchema = z.object({
  kind: z.enum(["same", "related", "different"]),
  label: z.string(),
  note: z.string().nullable(),
  members: z.array(z.object({ answer: z.number().int(), thing: z.number().int(), angle: z.string() })),
});

const PerspectivesSchema = z.object({ themes: z.array(ThemeSchema) });

export function isPerspectivesRequest(value: unknown): value is PerspectivesRequest {
  const v = value as PerspectivesRequest;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.question === "string" &&
    Array.isArray(v.answers) &&
    v.answers.length >= 2 &&
    v.answers.length <= PERSPECTIVE_LIMITS.answers &&
    v.answers.every(
      (a) =>
        typeof a?.person === "string" &&
        Array.isArray(a.things) &&
        a.things.length >= 1 &&
        a.things.length <= 3 &&
        a.things.every((t) => typeof t?.headline === "string" && typeof t.detail === "string" && (t.said === undefined || typeof t.said === "string")),
    )
  );
}

/**
 * Reads several people's answers to one question side by side and returns
 * where they connect and differ, grounded in the answers before it leaves
 * the server. Answers themselves are never returned changed.
 */
export async function readAcross(req: PerspectivesRequest, options: DistillOptions = {}): Promise<PerspectivesResponse> {
  const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});

  const response = await client.beta.messages.parse({
    model: EDITOR_MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: options.effort ?? "high",
      format: betaZodOutputFormat(PerspectivesSchema),
    },
    system: PERSPECTIVES_PROMPT,
    messages: [{ role: "user", content: perspectivesMessage(req) }],
  });

  if (response.stop_reason === "refusal") throw new RefusedError("The request was declined.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);

  // The prompt numbers from one; the contract counts from zero.
  const themes = parsed.themes.map((t) => ({
    kind: t.kind,
    label: t.label,
    ...(t.note ? { note: t.note } : {}),
    members: t.members.map((m) => ({ answer: m.answer - 1, thing: m.thing - 1, angle: m.angle })),
  }));
  return { themes: groundThemes(themes, req.answers, req.question) };
}
