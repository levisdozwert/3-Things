import type { Capture } from "./types";

/**
 * Sample conversations.
 *
 * These make the app feel alive on first open, and power preview mode when no
 * transcription service is connected. Each transcript is written the way people
 * actually talk: tangents, restarts, corrections, a fourth idea, a name they
 * can't remember, the asker chiming in. Every thing's `quote` (and any `said`)
 * is copied verbatim from it. The things are what a careful editor would write
 * down: nothing added, nothing the speaker didn't say.
 */

export interface SampleThing {
  headline: string;
  detail: string;
  /** Verbatim evidence from the transcript. */
  quote: string;
  /** A memorable phrase, verbatim. Rare. */
  said?: string;
  /** The follow-up question, when the speaker left something unclear. */
  unclear?: string;
}

export interface SampleConversation {
  key: string;
  person: string;
  question: string;
  topic: string;
  /** Words that suggest a typed question is close to this one (preview mode). */
  keywords: string[];
  transcript: string;
  durationSec: number;
  things: SampleThing[];
  /** A fourth idea the speaker also clearly cared about. */
  extra?: SampleThing;
  /** What the speaker says when the asker goes back to them (preview mode). */
  followUps?: {
    more?: { transcript: string; things: SampleThing[] };
    clarify?: { index: number; transcript: string; thing: SampleThing };
  };
  /** When present, this conversation appears in the library as a saved 3 Things. */
  seed?: { daysAgo: number; time: string };
}

export const sampleConversations: SampleConversation[] = [
  {
    key: "founders",
    person: "Jason",
    question: "What are three things first-time founders get wrong?",
    topic: "Startup",
    keywords: ["founder", "founders", "startup", "company", "business", "starting", "wrong"],
    durationSec: 131,
    seed: { daysAgo: 0, time: "09:40" },
    transcript:
      "Oh man. Okay. The first one, and I did this, is building for way too long before talking to anyone. Like, we spent eight months on the product and then showed it to customers and, yeah. You have to get it in front of people in weeks, not months. Second, hiring your friends because it's comfortable. It's not always wrong, but people hire for comfort instead of for the gap they actually have. And then, this one's less obvious, founders think fundraising is the milestone. Like closing the round is the win. It's not. It's fuel. The actual job starts the day after the money hits. Oh, and pricing too low, but that's kind of the same as the first one. So yeah, those three.",
    things: [
      {
        headline: "Building too long before talking to customers",
        detail: "We spent eight months on the product before showing it to anyone. Get it in front of people in weeks, not months.",
        quote: "You have to get it in front of people in weeks, not months.",
      },
      {
        headline: "Hiring for comfort instead of the gap",
        detail: "Hiring friends isn't always wrong. Hire for the gap you actually have, not because it feels comfortable.",
        quote: "people hire for comfort instead of for the gap they actually have",
      },
      {
        headline: "Treating the fundraise as the finish line",
        detail: "Closing a round isn't the win, it's fuel. The actual job starts the day after the money arrives.",
        quote: "It's fuel. The actual job starts the day after the money hits.",
      },
    ],
  },
  {
    key: "boston",
    person: "Sarah",
    question: "What are three places I shouldn't miss in Boston?",
    topic: "Travel",
    keywords: ["boston", "places", "miss", "visit", "see", "trip"],
    durationSec: 104,
    seed: { daysAgo: 1, time: "18:15" },
    transcript:
      "Boston. Okay, so everyone's going to tell you the Freedom Trail, and fine, do part of it, but honestly the North End is the part I'd actually go for. Go in the evening, get dinner, walk around. It feels like a small neighborhood even though it's right downtown. Then the Arnold Arboretum. Hardly any visitors go there. It's in Jamaica Plain, it's free, and in the fall it's just stunning. And the Boston Public Library in Copley. Go inside. People walk right past it. Sit in the courtyard for twenty minutes, it's the calmest place in the city. Skip the Cheers bar. Please.",
    things: [
      {
        headline: "The North End in the evening",
        detail: "Get dinner and walk around. It feels like a small neighborhood even though it's right downtown.",
        quote: "It feels like a small neighborhood even though it's right downtown.",
      },
      {
        headline: "The Arnold Arboretum",
        detail: "It's in Jamaica Plain, it's free, and hardly any visitors go. Stunning in the fall.",
        quote: "in the fall it's just stunning",
      },
      {
        headline: "The courtyard at the Boston Public Library",
        detail: "Go inside the Copley library and sit in the courtyard for twenty minutes. The calmest place in the city.",
        quote: "Sit in the courtyard for twenty minutes, it's the calmest place in the city.",
      },
    ],
  },
  {
    key: "jersey-city",
    person: "Alex",
    question: "What are three things I should do in Jersey City?",
    topic: "Travel",
    keywords: ["jersey", "visit", "places", "miss", "here", "town", "neighborhood", "weekend", "restaurants", "eat"],
    durationSec: 134,
    seed: { daysAgo: 1, time: "12:05" },
    transcript:
      "Okay, Jersey City. Um, so first, honestly, walk the waterfront. Like around sunset, if you can. The skyline is, it's kind of unreal in the evening, you're looking right across at Manhattan, and I think that's the best way to actually get the city. What else. Food. Newark Avenue. There's a stretch there with a ton of independent places, and it's really walkable, so you can just wander and pick. Oh, and Liberty State Park. But don't do it as a quick stop. Give it a couple hours, walk it. People treat it like a drive-by and they miss it. There's also the farmers market at Grove Street, but that's only certain days. So yeah. Waterfront, Newark Ave, Liberty State Park.",
    things: [
      {
        headline: "Walk the waterfront around sunset",
        detail: "The skyline is especially good in the evening, and it's the best way to really get the city.",
        quote: "The skyline is, it's kind of unreal in the evening",
      },
      {
        headline: "Try the restaurants around Newark Avenue",
        detail: "There are plenty of independent places, and it's an easy area to explore on foot.",
        quote: "There's a stretch there with a ton of independent places, and it's really walkable",
      },
      {
        headline: "Spend some time in Liberty State Park",
        detail: "Go when you have a couple of hours to walk, rather than treating it as a quick stop.",
        quote: "don't do it as a quick stop. Give it a couple hours, walk it.",
      },
    ],
  },
  {
    key: "mba",
    person: "Professor Reyes",
    question: "What are three things every MBA student should know?",
    topic: "Career",
    keywords: ["mba", "student", "students", "school", "career", "class"],
    durationSec: 162,
    seed: { daysAgo: 5, time: "16:30" },
    transcript:
      "Three things. Well, first, your classmates are the curriculum. I mean that. The cases are fine, but the person sitting next to you who ran a supply chain in Lagos for six years, that's the education. Second, decide what you're optimizing for early, before recruiting season decides for you. Everyone gets swept toward consulting and banking because the calendar pushes you there. And third, learn to write a one-page memo. Honestly. Clear writing is clear thinking, and it's the skill I see people underrate the most. If you can put a recommendation on one page, people will trust you with bigger things.",
    things: [
      {
        headline: "Your classmates are the curriculum",
        detail: "The cases are fine, but the people next to you and what they've done are the real education.",
        quote: "your classmates are the curriculum. I mean that.",
      },
      {
        headline: "Decide what you're optimizing for early",
        detail: "Choose before recruiting season chooses for you. The calendar pushes everyone toward consulting and banking.",
        quote: "decide what you're optimizing for early, before recruiting season decides for you",
      },
      {
        headline: "Learn to write a one-page memo",
        detail: "Clear writing is clear thinking. Put a recommendation on one page and people will trust you with bigger things.",
        quote: "If you can put a recommendation on one page, people will trust you with bigger things.",
      },
    ],
  },
  {
    key: "raising-children",
    person: "Mom",
    question: "What are three things you've learned about raising children?",
    topic: "Life",
    keywords: ["children", "kids", "raising", "parent", "parents", "parenting", "family", "learned"],
    durationSec: 147,
    seed: { daysAgo: 9, time: "19:50" },
    transcript:
      "Oh, goodness. Three? Okay. Um. The first thing is that they're watching what you do much more than listening to what you say. I used to give you all these speeches and you don't remember any of them, but you all remember how your father and I treated people. Second, let them be bored. I know that sounds strange. But the best things you ever made, you made because you were bored on a Saturday. And the third one, I think, is to say sorry to them when you get it wrong. I didn't do that enough early on. When I started doing it, things got so much better between us. Kids need to see that grown-ups can be wrong too.",
    things: [
      {
        headline: "They learn from what you do, not what you say",
        detail: "Nobody remembers the speeches. Everyone remembers how you treated people.",
        quote: "they're watching what you do much more than listening to what you say",
      },
      {
        headline: "Let them be bored",
        detail: "It sounds strange, but the best things you ever made came from being bored on a Saturday.",
        quote: "the best things you ever made, you made because you were bored on a Saturday",
      },
      {
        headline: "Say sorry when you get it wrong",
        detail: "Kids need to see that grown-ups can be wrong too. When I started apologizing, things got so much better between us.",
        quote: "Kids need to see that grown-ups can be wrong too.",
      },
    ],
  },
  {
    key: "twenties",
    person: "Grandpa Joe",
    question: "What are three mistakes you made in your twenties?",
    topic: "Life",
    keywords: ["mistakes", "mistake", "twenties", "young", "regret", "regrets", "age"],
    durationSec: 118,
    seed: { daysAgo: 15, time: "14:10" },
    transcript:
      "Mistakes. Plenty. Let me think. I didn't save anything. Not a dollar, until I was almost thirty. Even ten dollars a week would have added up. I stayed at a job I didn't like for five years because I was scared to ask for more. That was a big one. What else. I didn't call my father enough. He was only a phone call away and I always thought there'd be more time. So, save something, ask for what you're worth, and call your parents. I'm serious about that last one.",
    things: [
      {
        headline: "Not saving anything",
        detail: "Not a dollar until I was almost thirty. Even ten dollars a week would have added up.",
        quote: "Even ten dollars a week would have added up.",
      },
      {
        headline: "Being too scared to ask for more",
        detail: "I stayed five years at a job I didn't like. Ask for what you're worth.",
        quote: "I stayed at a job I didn't like for five years because I was scared to ask for more.",
      },
      {
        headline: "Not calling my father enough",
        detail: "He was only a phone call away, and I always thought there'd be more time. Call your parents.",
        quote: "He was only a phone call away and I always thought there'd be more time.",
      },
    ],
  },
  {
    key: "learn-from-you",
    person: "Daniel",
    question: "What are three things I can learn from you?",
    topic: "Work",
    keywords: ["learn", "teach", "habits", "work", "advice"],
    durationSec: 96,
    seed: { daysAgo: 20, time: "11:25" },
    transcript:
      "From me? Ha. Okay, um. I guess I write everything down. Every meeting, every idea, I keep one running doc. It sounds boring, but it means I never have to hold stuff in my head, and I can always go back and find what someone said. Two, I try to answer messages the same day. Even if it's just, got it, I'll get back to you Thursday. People trust you way more when they're not left wondering. And three, I ask a lot of dumb questions. On purpose. Usually half the room had the same question and nobody wanted to ask it.",
    things: [
      {
        headline: "Write everything down in one place",
        detail: "One running doc for every meeting and idea, so nothing has to live in your head and you can always find what someone said.",
        quote: "I keep one running doc",
      },
      {
        headline: "Reply the same day, even briefly",
        detail: "Even “got it, I'll get back to you Thursday.” People trust you more when they're not left wondering.",
        quote: "People trust you way more when they're not left wondering.",
      },
      {
        headline: "Ask the obvious question",
        detail: "Do it on purpose. Usually half the room has the same question and nobody wants to ask it.",
        quote: "Usually half the room had the same question and nobody wanted to ask it.",
      },
    ],
  },
  {
    key: "books",
    person: "Marcus",
    question: "What are three books that changed how you think?",
    topic: "Books",
    keywords: ["books", "book", "read", "reading", "changed", "think"],
    durationSec: 71,
    seed: { daysAgo: 24, time: "21:05" },
    transcript:
      "Three books. Hmm. Honestly, I can only think of two that really did that. Thinking in Systems, by Donella Meadows. After that I couldn't stop seeing feedback loops everywhere, at work, in my own habits. And The Mom Test. It's tiny, you can read it in an afternoon, but it completely changed how I ask people questions. I'd be making up a third if I gave you one.",
    things: [
      {
        headline: "Thinking in Systems by Donella Meadows",
        detail: "After reading it, I couldn't stop seeing feedback loops everywhere, at work and in my own habits.",
        quote: "I couldn't stop seeing feedback loops everywhere",
      },
      {
        headline: "The Mom Test",
        detail: "Short enough to read in an afternoon, and it completely changed how I ask people questions.",
        quote: "it completely changed how I ask people questions",
      },
    ],
  },
  {
    // The spec's founder conversation: a correction mid-thought, the asker chiming in,
    // four ideas, one of them named "the most important thing", and one memorable line.
    key: "founder-know",
    person: "",
    question: "What are three things every first-time founder should know?",
    topic: "Startup",
    keywords: ["founder", "founders", "startup"],
    durationSec: 142,
    transcript:
      "Okay. So the first thing, and I learned this one the hard way. My first lesson was hiring fast. Actually, no. Hiring carefully. I hired way too quickly that first year, and fixing those hires took longer than making them. So hire more slowly than you think you need to. Why slower, though? Because every early hire kind of sets the culture, and you can't really undo that. Second, cash flow. Everyone watches revenue, but revenue is vanity if the cash isn't there. We had our best revenue month and almost missed payroll. Oh, and pricing. Don't underprice. Everybody charges too little at the start. But honestly, the most important thing, the thing I'd tell anyone, is talk to customers before you build anything. We spent months building something nobody asked for. Talk to them first. Seriously.",
    things: [
      {
        headline: "Talk to customers before you build anything",
        detail: "If there's one thing I'd tell anyone, it's this. We spent months building something nobody asked for.",
        quote: "the most important thing, the thing I'd tell anyone, is talk to customers before you build anything",
      },
      {
        headline: "Hire more slowly than you think you need to",
        detail:
          "I hired way too quickly that first year, and fixing those hires took longer than making them. Every early hire sets the culture, and you can't really undo that.",
        quote: "So hire more slowly than you think you need to.",
      },
      {
        headline: "Watch cash flow, not just revenue",
        detail: "We had our best revenue month and almost missed payroll.",
        quote: "Everyone watches revenue, but revenue is vanity if the cash isn't there.",
        said: "Revenue is vanity if the cash isn't there.",
      },
    ],
    extra: {
      headline: "Don't underprice",
      detail: "Everybody charges too little at the start.",
      quote: "Don't underprice. Everybody charges too little at the start.",
    },
  },
  {
    // A change of mind ("forget that") and a place whose name they can't remember.
    key: "jersey-places",
    person: "",
    question: "What are three places I shouldn’t miss in Jersey City?",
    topic: "Travel",
    keywords: ["jersey", "places", "shouldn't", "shouldn’t"],
    durationSec: 97,
    transcript:
      "Okay, Jersey City. First, walk the waterfront, but definitely around sunset. During the afternoon it's fine, but around sunset you get the Manhattan skyline and the light is beautiful. For food, I'd say the pizza place on Grove... actually, no, forget that. Razza is much better. Razza. Get the margherita, and go early, because there's always a line. And then there's that coffee place near the station... I can't remember the name... but it's really good. Oh, and Liberty State Park is nice too, I guess, if you have time.",
    things: [
      {
        headline: "Walk the waterfront around sunset",
        detail: "It's fine in the afternoon, but around sunset you get the Manhattan skyline and the light is beautiful.",
        quote: "walk the waterfront, but definitely around sunset",
      },
      {
        headline: "Go to Razza for pizza",
        detail: "Get the margherita, and go early, because there's always a line.",
        quote: "Razza is much better. Razza. Get the margherita, and go early",
      },
      {
        headline: "Try the coffee place near the station",
        detail: "The name didn't come to mind, but it's really good.",
        quote: "that coffee place near the station... I can't remember the name... but it's really good",
        unclear: "Which coffee place near the station did you mean?",
      },
    ],
    followUps: {
      clarify: {
        index: 2,
        transcript:
          "Oh, the coffee place! It's right by the Grove Street PATH, the one with the green door. It's actually called The Green Door, I just remembered. Get the cardamom latte.",
        thing: {
          headline: "Try The Green Door, by the Grove Street PATH",
          detail: "It's the coffee place right by the station. Get the cardamom latte.",
          quote: "It's actually called The Green Door",
        },
      },
    },
  },
  {
    // Only two clear things. The app never invents a third.
    key: "life-taught",
    person: "",
    question: "What are three things life has taught you?",
    topic: "Life",
    keywords: ["life", "taught", "lessons", "lesson", "wisdom", "learned"],
    durationSec: 64,
    transcript:
      "Life. Hmm. Honestly, the biggest thing I learned is don't wait forever to call your parents. You always think there'll be more time. And people remember how you made them feel. Not what you said, not exactly what you did. How you made them feel. What else... I don't know. I'd have to think about that one.",
    things: [
      {
        headline: "Don't keep putting off calling your parents",
        detail: "You always think there'll be more time.",
        quote: "don't wait forever to call your parents. You always think there'll be more time.",
      },
      {
        headline: "People remember how you made them feel",
        detail: "Not what you said, and not exactly what you did.",
        quote: "people remember how you made them feel",
      },
    ],
    followUps: {
      more: {
        transcript:
          "One more? Okay. Walk every day. It sounds small. It's not small. Half my good decisions happened on walks.",
        things: [
          {
            headline: "Walk every day",
            detail: "It sounds small, but it isn't.",
            quote: "Walk every day. It sounds small. It's not small.",
            said: "Half my good decisions happened on walks.",
          },
        ],
      },
    },
  },
  {
    key: "wish-knew-earlier",
    person: "",
    question: "What are three things you wish you knew earlier?",
    topic: "Life",
    keywords: ["wish", "earlier", "knew", "sooner", "younger"],
    durationSec: 97,
    transcript:
      "Hmm. Wish I knew earlier. One, that nobody really has it figured out. I thought everyone older than me had a plan, and they were mostly just improvising too. Two, that you can just email people. People you admire. Most of them write back. I didn't try that until I was thirty-five. And three, that your energy matters more than your time. I used to plan my days by the hour. Now I plan around when I actually have energy, and I get more done in less time.",
    things: [
      {
        headline: "Nobody really has it figured out",
        detail: "I thought everyone older than me had a plan. They were mostly improvising too.",
        quote: "they were mostly just improvising too",
      },
      {
        headline: "You can just email people you admire",
        detail: "Most of them write back. I didn't try it until I was thirty-five.",
        quote: "Most of them write back.",
      },
      {
        headline: "Plan around your energy, not your hours",
        detail: "Planning my days around when I actually have energy gets more done in less time.",
        quote: "Now I plan around when I actually have energy",
      },
    ],
  },
];

function atDaysAgo(daysAgo: number, time: string, now = new Date()): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(now);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  // A "today" sample should never sit in the future.
  if (d > now) d.setTime(now.getTime() - 50 * 60 * 1000);
  return d.toISOString();
}

export function seedCaptures(now = new Date()): Capture[] {
  return sampleConversations
    .filter((c) => c.seed)
    .map((c) => ({
      id: `sample-${c.key}`,
      question: c.question,
      person: c.person,
      topic: c.topic,
      things: c.things.map((t, i) => ({ id: `sample-${c.key}-${i}`, ...t })),
      recordedAt: atDaysAgo(c.seed!.daysAgo, c.seed!.time, now),
      durationSec: c.durationSec,
      hasAudio: false,
      origin: "sample" as const,
    }));
}

/** The home screen's inspiration. The user asks another person; nobody answers these for them. */
export const starterQuestions = [
  "What are three things life has taught you?",
  "What are three places I should visit here?",
  "What are three things you wish you knew earlier?",
];
