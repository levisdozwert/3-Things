import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { DistillRequest, DistillResponse, DistilledThing } from "../src/lib/distill/contract";
import { groundResponse } from "../src/lib/distill/grounding";
import { EDITOR_PROMPT, editorMessage } from "./prompt";

const ThingSchema = z.object({
  headline: z.string(),
  context: z.string(),
  evidence: z.string(),
  memorable_quote: z.string().nullable(),
  needs_clarification: z.string().nullable(),
});

const DistillSchema = z.object({
  things: z.array(ThingSchema),
  one_more: ThingSchema.nullable(),
  topic: z.string(),
  place: z.string().nullable(),
  answered: z.boolean(),
});

type Effort = "low" | "medium" | "high";

/** The editor, for finding someone's three things and for reading answers side by side. */
export const EDITOR_MODEL = "claude-opus-5";

export interface DistillOptions {
  apiKey?: string;
  /** High by default: getting someone's meaning right matters more than a few seconds. */
  effort?: Effort;
}

export class RefusedError extends Error {}

function toThing(t: z.infer<typeof ThingSchema>): DistilledThing {
  return {
    headline: t.headline,
    detail: t.context,
    quote: t.evidence,
    ...(t.memorable_quote ? { said: t.memorable_quote } : {}),
    ...(t.needs_clarification ? { unclear: t.needs_clarification } : {}),
  };
}

/**
 * Turns a conversation into up to three things, using only what the speaker said.
 * For a follow-up, returns only the new things, or the one clarified thing.
 *
 * The model's output is grounded before it is returned: anything whose words
 * can't be found in the conversation, or that names something nobody said, is
 * dropped or trimmed, never replaced.
 */
export async function distill(req: DistillRequest, options: DistillOptions = {}): Promise<DistillResponse> {
  const client = new Anthropic(options.apiKey ? { apiKey: options.apiKey } : {});

  const response = await client.beta.messages.parse({
    model: EDITOR_MODEL,
    max_tokens: 16000,
    // If a request is ever declined, let the API retry it on its recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: options.effort ?? "high",
      format: betaZodOutputFormat(DistillSchema),
    },
    system: EDITOR_PROMPT,
    messages: [{ role: "user", content: editorMessage(req.question, req.transcript, req.person, req.followUp) }],
  });

  if (response.stop_reason === "refusal") throw new RefusedError("The request was declined.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);

  const followUp = req.followUp;
  return groundResponse(
    {
      things: parsed.things.map(toThing),
      ...(parsed.one_more && !followUp ? { extra: toThing(parsed.one_more) } : {}),
      topic: parsed.topic,
      ...(parsed.place ? { place: parsed.place } : {}),
      answered: parsed.answered,
    },
    {
      transcript: followUp ? `${req.transcript} ${followUp.transcript}` : req.transcript,
      question: followUp ? `${req.question} ${followUp.asked}` : req.question,
      person: req.person,
    },
  );
}
