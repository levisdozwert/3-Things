import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { DistillRequest, DistillResponse } from "../src/lib/distill/contract";
import { groundResponse } from "../src/lib/distill/grounding";
import { EDITOR_PROMPT, editorMessage } from "./prompt";

const DistillSchema = z.object({
  things: z.array(
    z.object({
      headline: z.string(),
      detail: z.string(),
      quote: z.string(),
    }),
  ),
  topic: z.string(),
  answered: z.boolean(),
});

type Effort = "low" | "medium" | "high";

export interface DistillOptions {
  apiKey?: string;
  /** Kept at medium by default so the processing screen takes seconds, not minutes. */
  effort?: Effort;
}

export class RefusedError extends Error {}

/**
 * Turns a spoken answer into up to three things, using only what the speaker said.
 * The model's output is grounded against the transcript before it is returned:
 * anything whose supporting words can't be found is dropped, never replaced.
 */
export async function distill(req: DistillRequest, options: DistillOptions = {}): Promise<DistillResponse> {
  const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});

  const response = await client.beta.messages.parse({
    model: "claude-opus-5",
    max_tokens: 16000,
    // If a request is ever declined, let the API retry it on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: options.effort ?? "medium",
      format: betaZodOutputFormat(DistillSchema),
    },
    system: EDITOR_PROMPT,
    messages: [{ role: "user", content: editorMessage(req.question, req.transcript, req.person) }],
  });

  if (response.stop_reason === "refusal") throw new RefusedError("The request was declined.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);

  return groundResponse(parsed, req.transcript);
}
