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
| Understand | **Processing** | *Finding the three things*, with the status cycling *Listening back → Finding the main ideas → Keeping the context → Making it clear*. The three forms from *Got it.* move into three positions, which become 01, 02 and 03 on the result. |
| Extract | **Result** | The question, then *3 Things from Jason* (or *From this conversation*), then three distilled thoughts set editorially: a large 01, the idea, one to three sentences of their context, and, rarely, a short quote they actually said. |
| Verify | **Review** | At the bottom, *Did we get their 3 right?* **Looks right** saves in one tap; **Edit** and **Listen back** are there when needed. Only when it's true: *We found 2 clear things* with **Ask for one more**; *One thing needs clarification* with **Clarify**, **Edit**, **Keep as-is**; *There was one more idea worth keeping* with **See it** to swap it in. |
| | **Edit** | Change a headline or its context, reorder, remove, or add something they said. **Done** returns to the review. No model settings, confidence numbers or transcript. |
| Save | **Saved** | *Saved to your 3 Things*, a keepsake card, **Done**, and a basic **Share** (the share sheet, or copy to clipboard). |
| | **Saved detail** | The person first, a quiet line with date and topic, the question, then the three things. Listen back stays secondary. |

The recording never interrupts the conversation. If someone gives two things or ten, tells a story, changes their mind or answers a follow-up question from the person asking, the app just keeps listening. Sorting that out happens afterwards (see the editor's brief below).

Problems get one plain sentence and one way forward: *We couldn't access your microphone. Check microphone access and try again.*, *We couldn't find a microphone.*, *The recording stopped.*, *We didn't catch that.*

Plus the **Library** (below) and **You** (profile, listening settings, export, and a short explanation of how 3 Things listens). Navigation is three tabs: Home, Library, You.

## The Library

Over time the Library becomes a record of what people have taught you, organized the way you remember it: **people → questions → things worth remembering**. It reads like a journal, not a database.

| Screen | What it does |
| --- | --- |
| **Your 3 Things** | A quiet growth line (*You've learned 53 things from 10 people.*), then search, then an understated **Recent · People · Topics** switch. No extra tab, no streaks, no scores. |
| **Recent** | The default. Grouped *Today*, *This week* and *Earlier*. Each row leads with the person (small initial avatar), then the question in serif, then a quiet line: topic · place · when. A **Kept close** chip filters to the conversations you bookmarked. |
| **People** | Everyone you've asked, with how many things you've learned from them and what you talked about. No profiles, followers or social features. Unnamed conversations are counted in a footnote, never guessed. |
| **Person** | *15 things you've learned from Jason*, the topics and places that came up, then *What you've asked, over time*: each question with its three headlines. **Ask Jason something** starts a new question with the name already filled in. |
| **Topics** | Suggested when saved (Startup, Travel, Food, Life…), always changeable. Places sit underneath as a quiet line, not a tab. |
| **Topic** | Every conversation about it, across people. With two or more: *Different people, different views. Each stays in their own words.* Jason's "Hire more slowly than you think you need to" and Maya's "Hire faster than feels comfortable" stay side by side, attributed and never merged into a consensus. |
| **Search** | *Search people, questions or things.* Matches names, questions, things, their context, topics and places, with gentle word matching (*hiring* finds *hire*). Results are grouped **People**, **Questions**, **Things**, and every thing shows who said it and what was asked. When a thing matched on its context, that sentence is shown so you can see why. Opening one scrolls to it and highlights it briefly. |
| **Saved detail** | The person (links to their page), date, topic (links to the topic), place, the question and the three things. **Keep close** bookmarks it; there's no separate Favorites tab. |
| **Saved** | After saving: *Filed under Startup · Change*, a small sheet with topic suggestions and a *Where* field. |

The empty Library says *Your Library grows one conversation at a time.* and *Ask someone something worth remembering.*, with **Ask for 3** and a few example questions.

Places are metadata only: they come from what the speaker actually said (a place the transcript doesn't contain is dropped by the grounding check), or from what you type in.

People are grouped by name (case and spacing ignored), so "Jason" in March and "jason" in May are the same person. The sample conversations are refreshed for existing users without touching anything they've edited, kept close or deleted.

## How the three are chosen

Real answers are messy, and the editor is told to expect that (full brief in [`server/prompt.ts`](server/prompt.ts)):

- **More than three ideas:** keep the three the speaker emphasized most. Signals: "the most important thing", explicit ranking, final choices, repetition, how much they explained, strong emphasis, and direct answers. Never just the first three. A clearly important fourth is kept aside as *one more idea worth keeping*.
- **Exactly three:** keep them, and clarify without reinterpreting.
- **Two or one:** show only those. *We found 2 clear things* and **Ask for one more** reopens listening for a follow-up. Nothing is ever generated to fill a slot.
- **Corrections:** "Porta… actually no, forget that. Razza is much better" gives Razza, and the rejected choice disappears. "Hiring fast… actually, no, hiring carefully" gives *hire carefully*.
- **The asker's follow-ups** ("Why?") are context, never things.
- **Unclear details** ("that place near the station, I can't remember the name") stay as vague as they were said, with a suggested follow-up question to ask them. **Clarify** records their answer and updates just that thing.
- **Ranking:** if they ranked, that order is kept. Otherwise, what they called most important comes first.
- **Useful context is preserved** (when to go, what to order, why), as one to three short sentences, and only if they said it.
- **Their voice is preserved.** Casual stays a little casual, direct stays direct, a life lesson stays human. "Don't wait forever to call your parents" never becomes "Prioritize familial communication".
- **Quotes are rare and exact.** A short quote appears only when they said something memorable, and only if those exact words are in the transcript.

## The most important rule: the speaker is the source

The AI is an editor sitting quietly in the background. It may organize, condense, clarify and fix grammar. It may never add advice, look things up, invent details, pad to three or change someone's opinion. Several layers enforce this:

1. **The editor's brief:** [`server/prompt.ts`](server/prompt.ts) spells out what the model may and may not do, how to pick three when someone offers five, where to land when they change their mind, and to return *fewer* than three rather than invent one. Everything in the transcript is treated as material, never as instructions.
2. **Structured output with evidence:** [`server/distill.ts`](server/distill.ts) asks Claude for each thing plus a **verbatim quote** from the transcript that supports it.
3. **Grounding check:** [`src/lib/distill/grounding.ts`](src/lib/distill/grounding.ts) runs on everything the editor returns, including follow-ups. It only removes; it never adds or replaces.
   - A thing is dropped if its evidence can't be found in what was said.
   - A headline is dropped if it names a person, place or number nobody said (so a restaurant name the speaker couldn't remember can't be supplied), and any context sentence that does so is removed.
   - Quotes must match the transcript word for word.
   - Duplicates are removed and the list is capped at three.
4. **Honest gaps:** if someone shares two things, the review shows two and an empty 03: *"Only two clear things came up. We didn't fill the third."* If nothing usable was heard, the app says so and offers *Ask again* or *Write their things down yourself*. It never shows a plausible-sounding guess.
5. **Honest uncertainty:** in words, never percentages. *We weren't completely sure about this one.* appears only where something was actually unclear.
6. **Evidence stays attached:** every saved thing keeps the span of the conversation it came from, and the original recording (plus any follow-ups) is a tap away for verification.

These rules are covered by tests in [`tests/`](tests). They include a check that every sample thing, quote, fourth idea and follow-up passes grounding completely unchanged.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 (also exposed on your LAN for phone testing)
npm test             # grounding, samples, library and formatting tests
npm run build        # typecheck + production build
```

### Preview mode vs. live mode

- **Preview mode** (the default, with no key): everything works end to end. After you record, the three things come from the closest *sample conversation*, and the review screen clearly labels it a **Preview answer**. With no microphone available, *Preview without the microphone* runs the listening screen with a simulated voice. The Ask screen's examples each demonstrate one messy case:
  - *first-time founder*: a correction, "the most important thing", a memorable quote, and a fourth idea
  - *Jersey City*: a change of mind, plus a name they couldn't remember, which **Clarify** resolves
  - *life has taught you*: only two things, and **Ask for one more** adds the third
- **Live mode**: create `.env.local` with `ANTHROPIC_API_KEY=...` and restart `npm run dev`. The browser transcribes the conversation quietly in the background (Web Speech API), then `POST /api/distill` sends the question and transcript to Claude (`claude-opus-5`, adaptive thinking, structured output). Effort is `high` by default, because getting someone's meaning right is worth a few seconds; set `DISTILL_EFFORT` to change it. Follow-ups (*Ask for one more*, *Clarify*) use the same endpoint with the conversation so far. Requests opt into server-side refusal fallbacks (`fallbacks: "default"`).

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
  App.tsx              Routes: / · /library · /library/people/:key · /library/topics/:key · /library/:id · /you · /ask
  styles/              tokens.css (color, type, space, motion), base.css, transitions.css
  components/          Mark (the three-stroke motif), ListeningVisual (the three listening forms), Orb,
                       ThingsEditorial, ThingList, ThingsEditor, SavedCard, AudioPlayer, Sheet, BottomNav, Avatar, Button, Toggle, Icon
    library/           Library rows (conversation, person, topic, thing) and search highlighting
  screens/
    HomeScreen, LibraryScreen, PersonScreen, TopicScreen, DetailScreen, YouScreen
    capture/           CaptureFlow (the state machine) and one component per step
  lib/
    store.tsx          Saved conversations and settings (localStorage)
    library.ts         People, topics and places derived from conversations, and Library search
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

Social features, public profiles, discovery, feeds, followers, likes, comments, messaging, maps, restaurant APIs, recommendations, AI summaries across people, and gamification. Sharing is a basic share sheet only. People, topics and places are derived from saved conversations rather than stored separately, so collections, photos and sync can be added on top later without migrating anything.
