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
| | **Ask** | *What do you want to ask?* Nothing records until you choose. **Speak your question** is the main action; the screen shows only that it's listening, never your words as you say them. Afterwards the question appears once, with **Use this question** or **Edit**. **Type instead** gives a minimal, large-serif input with **Continue**. |
| | **Who** | The question, settled. *Who are you asking?* **Add their name** (a first name is enough) or **Skip for now**. With a name, the result later reads *3 Things from Jason*. |
| | **Ready** | The question in quotes, *Ready when Jason is* (or *they are*), *Let them answer naturally…*, the one-line consent reminder, and the strongest button in the app: **Start listening**. Its three marks grow into the listening screen's three forms. |
| Listen | **Listening** | Focus mode. *Listening to Jason*, the question, three vertical forms that respond to the voice, one line of copy, and Pause, Stop and a quiet `01:42` timer. No transcript. After six seconds untouched, the controls fade back. In silence, *Take your time.*, later *Still listening.*, and it never stops on its own. |
| | **Got it.** | Stop gives a small haptic tap where the phone supports it. The forms settle back into the mark and the screen says *Got it.*, then moves on to *Finding the three things*. |
| Understand | **Processing** | *Finding the three things*, with the status cycling *Listening back → Finding the main ideas → Keeping the context → Making it clear*. Three empty positions wait for the answers. |
| 3 Things | **Review** | *Did we get their 3 right?* The things appear 1, 2, 3 in sequence. **Looks right** saves in one tap. **Edit** and **Listen back** are there when needed. |
| | **Edit** | Change a headline or explanation, reorder, remove, or add something they said. |
| Save | **Saved** | A keepsake card: question, *3 Things from Alex*, the three headlines and *Recorded Sep 27*. |

The recording never interrupts the conversation. If someone gives two things or ten, tells a story, changes their mind or answers a follow-up question from the person asking, the app just keeps listening. Sorting that out happens afterwards (see the editor's brief below).

Problems get one plain sentence and one way forward: *We couldn't access your microphone. Check microphone access and try again.*, *We couldn't find a microphone.*, *The recording stopped.*, *We didn't catch that.*

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
  components/          Mark (the three-stroke motif), ListeningVisual (the three listening forms), Orb,
                       ThingList, ThingsEditor, SavedCard, AudioPlayer, Sheet, BottomNav, Avatar, Button, Toggle, Icon
  screens/
    HomeScreen, LibraryScreen, DetailScreen, YouScreen
    capture/           CaptureFlow (the state machine) and one component per step
  lib/
    store.tsx          Saved conversations and settings (localStorage)
    samples.ts         Sample conversations: realistic, messy transcripts with grounded things
    audio/             useRecorder (record, pause, resume), voice.ts (three voice bands with adaptive
                       noise floors), useSpeechRecognition, audioStore (IndexedDB)
    distill/           contract.ts, grounding.ts, client.ts (live vs. preview)
tests/                 Vitest
```

Everything stays on the device for now: saved conversations in `localStorage`, recordings in IndexedDB (and only when *Keep recordings* is on).

## Design language

- **Paper, ink and one ember.** Warm ivory `#f8f4ec`, near-black ink `#1c1916`, warm grays, and a single terracotta-vermilion accent `#c24a26`. The accent goes on the thing to press, the numbers 1 2 3, and the listening presence. Nowhere else.
- **Editorial type.** Questions are set in *Fraunces* (soft, warm serif, optical sizes). People's things are set in *Instrument Sans*, readable and precise. Human names, questions and ideas dominate; metadata stays quiet.
- **Composition over containers.** Hairlines, whitespace and hierarchy do the work. The saved keepsake is the only real card.
- **The number three, quietly.** The three-stroke mark (a voice level that is also three things), the three listening forms that grow out of it, the three processing positions that become the answers, and the three tabs.
- **Motion that means something.** View transitions carry the question through every step, grow the three marks on *Start listening* into the listening forms, settle them back into the mark on *Got it.*, and hold the 1, 2, 3 positions in place while they fill. Forward steps drift in from the right, Back from the left. Everything respects `prefers-reduced-motion`.

## Deliberately not built yet

Social features, sharing, public profiles, discovery, feeds, followers, likes, comments, messaging, maps, restaurant APIs, recommendations and gamification. The data model (`Capture`: question, person, topic, things with quotes) is shaped so that people, topics, places, collections and sync can be added on top of it later.
