# 3 Things

**Ask someone anything. Keep the three things that matter.**

There is always something to learn from another person. In 3 Things you ask someone a question, like *"What are three things I should do in Jersey City?"*, and they answer out loud, however they like. They can ramble, change their mind or tell a story. The app listens back and writes down the three strongest things **they** said, clearly and briefly, attributed to them.

> Their knowledge. Clearly captured.

## The core loop

```
Ask → Listen → Understand → 3 Things → Save
```

| Step | Screen | What it does |
| --- | --- | --- |
| Ask | **Home** | One big *Ask for 3*. Type a question is the quiet alternative. Example questions sit underneath. |
| | **Ask** | Say the question (live words appear as you speak) or type it, with "Three things… / places… / mistakes…" starters. |
| | **Ready** | The question, held up large. An optional *Who's answering?* field. *Ready when Alex is*, a gentle consent line, then **Start listening**. |
| Listen | **Listening** | The question, a breathing ember presence driven by the live microphone level, a timer and one Stop button. No transcript on screen, on purpose. |
| Understand | **Processing** | *Finding the three things*, with the status cycling *Listening back → Finding the main ideas → Keeping the context → Making it clear*. Three empty positions wait for the answers. |
| 3 Things | **Review** | *Did we get their 3 right?* The things appear 1, 2, 3 in sequence. **Looks right** saves in one tap. **Edit** and **Listen back** are there when needed. |
| | **Edit** | Change a headline or explanation, reorder, remove, or add something they said. |
| Save | **Saved** | A keepsake card: question, *3 Things from Alex*, the three headlines and *Recorded Sep 27*. |

Plus **Library** (*Your 3 Things*: search across people, questions and things, grouped by This week / Earlier) and **You** (profile, listening settings, export, and a short explanation of how 3 Things listens). Navigation is three tabs: Home, Library, You.

## The most important rule: the speaker is the source

The AI is an editor sitting quietly in the background. It may organize, condense, clarify and fix grammar. It may never add advice, look things up, invent details, pad to three or change someone's opinion. Several layers enforce this:

1. **The editor's brief:** [`server/prompt.ts`](server/prompt.ts) spells out what the model may and may not do, how to pick three when someone offers five, where to land when they change their mind, and to return *fewer* than three rather than invent one. Everything in the transcript is treated as material, never as instructions.
2. **Structured output with evidence:** [`server/distill.ts`](server/distill.ts) asks Claude for each thing plus a **verbatim quote** from the transcript that supports it.
3. **Grounding check:** [`src/lib/distill/grounding.ts`](src/lib/distill/grounding.ts) drops any thing whose quote can't be found in what was actually said, removes duplicates and caps the list at three. It only removes; it never adds or replaces.
4. **Honest gaps:** if someone shares two things, the review shows two plus an empty third position: *"Marcus shared two things. We didn't fill the third."* If nothing usable was heard, the app says so and offers *Ask again* or *Write their things down yourself*. It never shows a plausible-sounding guess.
5. **In their words:** every saved thing keeps its supporting quote, and the saved page can show them, so anyone can check the summary against the speaker's own words.

These rules are covered by tests in [`tests/`](tests), including a check that every sample thing comes from its transcript.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 (also exposed on your LAN for phone testing)
npm test             # grounding, samples and formatting tests
npm run build        # typecheck + production build
```

### Preview mode vs. live mode

- **Preview mode** (the default, with no key): everything works end to end. After you record, the three things come from the closest *sample conversation*, and the review screen clearly labels it a **Preview answer**. With no microphone available, *Preview without the microphone* runs the listening screen with a simulated voice.
- **Live mode**: create `.env.local` with `ANTHROPIC_API_KEY=...` and restart `npm run dev`. The browser transcribes the answer quietly in the background (Web Speech API), then `POST /api/distill` sends the question and transcript to Claude (`claude-opus-5`, adaptive thinking, `effort: medium` by default so the wait is a few seconds; set `DISTILL_EFFORT` to change it). Requests opt into server-side refusal fallbacks (`fallbacks: "default"`).

A real recording is never answered with sample content. In live mode, if the transcript is empty, you get the *We couldn't make out their answer* screen.

**Browser support for live transcription:** Chrome, Edge and Safari support the Web Speech API. Firefox records audio but can't transcribe it in the browser, so the app falls back to typing the question and to *write it down yourself* for the answer. A server-side transcription service can replace the browser recognizer later without changing the rest of the flow.

Microphone access needs a secure context: `localhost`, or HTTPS when testing on a phone.

**Static hosting:** build with `VITE_ROUTER=hash` for hosts that can't rewrite deep links to `index.html`, or `VITE_ROUTER=memory` for embedded previews that can't use the URL at all. Without the API, a static build runs in preview mode.

## Project structure

```
server/
  prompt.ts            The editor's brief: what the model may and may not do
  distill.ts           Claude call: structured output, then grounding
  api.ts               GET /api/health, POST /api/distill (Node middleware, mounted in Vite)
src/
  App.tsx              Routes: / · /library · /library/:id · /you · /ask
  styles/              tokens.css (color, type, space, motion), base.css, transitions.css
  components/          Mark (the three-stroke motif), ListeningVisual, ThingList, ThingsEditor,
                       SavedCard, AudioPlayer, Sheet, BottomNav, Avatar, Button, Toggle, Icon
  screens/
    HomeScreen, LibraryScreen, DetailScreen, YouScreen
    capture/           CaptureFlow (the state machine) and one component per step
  lib/
    store.tsx          Saved conversations and settings (localStorage)
    samples.ts         Sample conversations: realistic, messy transcripts with grounded things
    audio/             useRecorder (MediaRecorder + analyser), useSpeechRecognition, audioStore (IndexedDB)
    distill/           contract.ts, grounding.ts, client.ts (live vs. preview)
tests/                 Vitest
```

Everything stays on the device for now: saved conversations in `localStorage`, recordings in IndexedDB (and only when *Keep recordings* is on).

## Design language

- **Paper, ink and one ember.** Warm ivory `#f8f4ec`, near-black ink `#1c1916`, warm grays, and a single terracotta-vermilion accent `#c24a26`. The accent goes on the thing to press, the numbers 1 2 3, and the listening presence. Nowhere else.
- **Editorial type.** Questions are set in *Fraunces* (soft, warm serif, optical sizes). People's things are set in *Instrument Sans*, readable and precise. Human names, questions and ideas dominate; metadata stays quiet.
- **Composition over containers.** Hairlines, whitespace and hierarchy do the work. The saved keepsake is the only real card.
- **The number three, quietly.** The three-stroke mark (a voice level that is also three things), the three halos around the listening core, the three-lobed drift in their edges, the three processing positions that become the answers, and the three tabs.
- **Motion that means something.** View transitions carry the question from the Ready screen to the top of Listening, Processing and Review, and hold the 1, 2, 3 positions in place while they fill. Answers reveal in sequence. Everything respects `prefers-reduced-motion`.

## Deliberately not built yet

Social features, sharing, public profiles, discovery, feeds, followers, likes, comments, messaging, maps, restaurant APIs, recommendations and gamification. The data model (`Capture`: question, person, topic, things with quotes) is shaped so that people, topics, places, collections and sync can be added on top of it later.
