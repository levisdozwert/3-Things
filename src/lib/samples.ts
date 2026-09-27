import { personIdFor } from "./library";
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
  /** Where it's about, when the conversation named a place. */
  place?: string;
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
  seed?: { daysAgo: number; time: string; keptClose?: boolean };
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
    place: "Boston",
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
    place: "Jersey City",
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
    topic: "Parenting",
    keywords: ["children", "kids", "raising", "parent", "parents", "parenting", "family", "learned"],
    durationSec: 147,
    seed: { daysAgo: 9, time: "19:50", keptClose: true },
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
    seed: { daysAgo: 15, time: "14:10", keptClose: true },
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
    person: "Daniel",
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
    // Boston comes up only in passing, which is how search should describe it.
    key: "daniel-maine",
    person: "Daniel",
    question: "What are three things you'd tell someone planning a trip to Maine?",
    topic: "Travel",
    place: "Maine",
    keywords: ["maine", "lobster"],
    durationSec: 64,
    seed: { daysAgo: 47, time: "10:35" },
    transcript:
      "Okay, Maine. First, fly into Boston and drive up. Flights to Portland cost almost twice as much, and honestly the drive up the coast is part of the trip. Second, go in September, not August. The water's still warm enough, the crowds are gone, and everything's cheaper. And get your lobster roll from a shack, not a restaurant. The ones on the side of the road with a line of locals are always better.",
    things: [
      {
        headline: "Fly into Boston and drive up",
        detail: "Flights to Portland cost almost twice as much, and the drive up the coast is part of the trip.",
        quote: "fly into Boston and drive up. Flights to Portland cost almost twice as much",
      },
      {
        headline: "Go in September, not August",
        detail: "The water's still warm enough, the crowds are gone, and everything's cheaper.",
        quote: "go in September, not August. The water's still warm enough, the crowds are gone",
      },
      {
        headline: "Get your lobster roll from a shack",
        detail: "Not a restaurant. The roadside ones with a line of locals are always better.",
        quote: "The ones on the side of the road with a line of locals are always better",
      },
    ],
  },
  {
    // Probably the same Jason, named differently one day. The Library asks, once.
    key: "jason-patel-pitch",
    person: "Jason Patel",
    question: "What are three things you'd tell someone pitching investors for the first time?",
    topic: "Startup",
    keywords: ["pitch", "pitching", "investors"],
    durationSec: 58,
    seed: { daysAgo: 66, time: "17:20" },
    transcript:
      "Pitching for the first time? Okay. Lead with the problem, not the product. Investors decide in the first two minutes whether they care, so make them feel the problem before you show them anything. Second, know your numbers without looking. If you have to check a slide for your churn, you've lost the room. And practice with people who'll be honest. Your friends will say it's great. Find someone who's sat on the other side of the table.",
    things: [
      {
        headline: "Lead with the problem, not the product",
        detail: "Investors decide in the first two minutes whether they care, so make them feel the problem before you show them anything.",
        quote: "Lead with the problem, not the product. Investors decide in the first two minutes whether they care",
      },
      {
        headline: "Know your numbers without looking",
        detail: "If you have to check a slide for your churn, you've lost the room.",
        quote: "know your numbers without looking. If you have to check a slide for your churn, you've lost the room",
      },
      {
        headline: "Practice with people who'll be honest",
        detail: "Your friends will say it's great. Find someone who's sat on the other side of the table.",
        quote: "Your friends will say it's great. Find someone who's sat on the other side of the table",
      },
    ],
  },
  {
    key: "jason-career",
    person: "Jason",
    question: "What helped you most early in your career?",
    topic: "Career",
    keywords: ["career", "early", "helped"],
    durationSec: 109,
    seed: { daysAgo: 13, time: "08:20" },
    transcript:
      "Early on? Honestly, having one manager who actually gave me real feedback. Not the nice kind. She'd mark up my decks in red and tell me why. That changed everything. Second, I said yes to the projects nobody wanted. The messy ones. That's where you learn the most, because nobody's watching too closely and you get to make real decisions. And third, I wrote down what I learned every Friday. Just ten minutes. After a year I had this whole notebook of lessons I'd have otherwise forgotten.",
    things: [
      {
        headline: "Find someone who gives you real feedback",
        detail: "Not the nice kind. A manager who'd mark up my decks in red and tell me why changed everything.",
        quote: "having one manager who actually gave me real feedback",
      },
      {
        headline: "Say yes to the projects nobody wants",
        detail: "The messy ones are where you learn the most, because nobody's watching too closely and you get to make real decisions.",
        quote: "I said yes to the projects nobody wanted",
      },
      {
        headline: "Write down what you learned every Friday",
        detail: "Just ten minutes. After a year I had a whole notebook of lessons I'd have otherwise forgotten.",
        quote: "I wrote down what I learned every Friday",
      },
    ],
  },
  {
    key: "jason-managing",
    person: "Jason",
    question: "What are three things you learned managing people?",
    topic: "Leadership",
    keywords: ["managing", "manage", "manager", "people", "team", "leadership"],
    durationSec: 96,
    seed: { daysAgo: 36, time: "17:45" },
    transcript:
      "Managing people. Okay. One, say the hard thing early. Every time I waited, it got worse and it got more expensive. Two, your team copies what you do, not what you say. If I answered emails at midnight, suddenly everybody did. And three, one-on-ones are their meeting, not yours. Let them set the agenda. I used to run them like status updates and I learned nothing.",
    things: [
      {
        headline: "Say the hard thing early",
        detail: "Every time I waited, it got worse and it got more expensive.",
        quote: "say the hard thing early",
      },
      {
        headline: "Your team copies what you do, not what you say",
        detail: "If I answered emails at midnight, suddenly everybody did.",
        quote: "your team copies what you do, not what you say",
      },
      {
        headline: "Let them own the one-on-one",
        detail: "It's their meeting, not yours. When I ran them like status updates, I learned nothing.",
        quote: "one-on-ones are their meeting, not yours. Let them set the agenda.",
      },
    ],
  },
  {
    key: "jason-hiring",
    person: "Jason",
    question: "What are three things every founder should know before hiring?",
    topic: "Startup",
    keywords: ["hiring", "hire", "founder", "before"],
    durationSec: 88,
    seed: { daysAgo: 58, time: "10:10" },
    transcript:
      "Before hiring. First, write down the job before you meet anyone. Otherwise you'll hire the person you liked talking to. Second, check references properly. Ask what they'd hire them for again, not whether they were good. And third, hire more slowly than you think you need to. Seriously. A bad early hire costs you months.",
    things: [
      {
        headline: "Write the job down before you meet anyone",
        detail: "Otherwise you'll hire the person you liked talking to.",
        quote: "write down the job before you meet anyone",
      },
      {
        headline: "Check references properly",
        detail: "Ask what they'd hire the person for again, not whether they were good.",
        quote: "check references properly. Ask what they'd hire them for again",
      },
      {
        headline: "Hire more slowly than you think you need to",
        detail: "A bad early hire costs you months.",
        quote: "hire more slowly than you think you need to",
      },
    ],
  },
  {
    // A different view of hiring than Jason's. Both are kept, side by side.
    key: "maya-again",
    person: "Maya",
    question: "What are three things you'd do differently if you started again?",
    topic: "Startup",
    keywords: ["differently", "again", "started", "startup"],
    durationSec: 102,
    seed: { daysAgo: 4, time: "13:30" },
    transcript:
      "If I started again? I'd hire faster, honestly. Everyone told me to hire slowly, and I think early-stage companies sometimes need to hire faster than feels comfortable. We lost six months doing everything ourselves. Second, I wouldn't mistake revenue for cash. We had great months on paper and the bank account said otherwise. And third, I'd take one real day off a week. Burnout cost us more than any competitor did.",
    things: [
      {
        headline: "Hire faster than feels comfortable",
        detail:
          "Early-stage companies sometimes need to hire faster than feels comfortable. We lost six months doing everything ourselves.",
        quote: "early-stage companies sometimes need to hire faster than feels comfortable",
      },
      {
        headline: "Don't mistake revenue for cash",
        detail: "We had great months on paper and the bank account said otherwise.",
        quote: "I wouldn't mistake revenue for cash",
      },
      {
        headline: "Take one real day off a week",
        detail: "Burnout cost us more than any competitor did.",
        quote: "I'd take one real day off a week",
      },
    ],
  },
  {
    key: "carlos-round",
    person: "Carlos",
    question: "What are three things you learned raising your first round?",
    topic: "Startup",
    keywords: ["raising", "round", "investors", "fundraising", "funding"],
    durationSec: 79,
    seed: { daysAgo: 10, time: "15:05" },
    transcript:
      "Raising the first round. One, it takes twice as long as you think, so start before you need the money. Two, a warm intro beats a perfect deck. Every investor who said yes came through someone they trusted. Three, pick the person, not the firm. You'll work with that one partner, not the logo.",
    things: [
      {
        headline: "Start raising before you need the money",
        detail: "It takes twice as long as you think.",
        quote: "it takes twice as long as you think, so start before you need the money",
      },
      {
        headline: "A warm intro beats a perfect deck",
        detail: "Every investor who said yes came through someone they trusted.",
        quote: "a warm intro beats a perfect deck",
      },
      {
        headline: "Pick the person, not the firm",
        detail: "You'll work with that one partner, not the logo.",
        quote: "pick the person, not the firm",
      },
    ],
  },
  {
    key: "sarah-moving",
    person: "Sarah",
    question: "What are three things you'd tell someone moving to Boston?",
    topic: "Life",
    place: "Boston",
    keywords: ["moving", "move", "boston"],
    durationSec: 84,
    seed: { daysAgo: 16, time: "20:40" },
    transcript:
      "Moving to Boston. Okay. Get a good winter coat before November, not after. Everyone learns that one the hard way. Don't bother with a car if you live near the T. Parking is miserable. And say yes to every invitation the first year. People here seem reserved, but they warm up if you keep showing up.",
    things: [
      {
        headline: "Get a good winter coat before November",
        detail: "Not after. Everyone learns that one the hard way.",
        quote: "Get a good winter coat before November, not after.",
      },
      {
        headline: "Skip the car if you live near the T",
        detail: "Parking is miserable.",
        quote: "Don't bother with a car if you live near the T.",
      },
      {
        headline: "Say yes to every invitation the first year",
        detail: "People seem reserved, but they warm up if you keep showing up.",
        quote: "say yes to every invitation the first year",
      },
    ],
  },
  {
    key: "sarah-grandmother",
    person: "Sarah",
    question: "What are three dishes you learned from your grandmother?",
    topic: "Cooking",
    keywords: ["dishes", "grandmother", "recipes", "cook", "cooking"],
    durationSec: 73,
    seed: { daysAgo: 30, time: "18:55" },
    transcript:
      "My grandmother's dishes. Her lentil soup, for sure. The trick is lemon at the very end, not during. Then her flatbread, which she made every Sunday. And her rice pudding with cardamom. I still can't get it exactly right, but I keep trying.",
    things: [
      {
        headline: "Her lentil soup",
        detail: "The trick is lemon at the very end, not during.",
        quote: "Her lentil soup, for sure. The trick is lemon at the very end",
      },
      {
        headline: "Her Sunday flatbread",
        detail: "She made it every Sunday.",
        quote: "her flatbread, which she made every Sunday",
      },
      {
        headline: "Rice pudding with cardamom",
        detail: "I still can't get it exactly right, but I keep trying.",
        quote: "her rice pudding with cardamom",
      },
    ],
  },
  {
    key: "mom-sick",
    person: "Mom",
    question: "What are three things you always cook when someone's sick?",
    topic: "Cooking",
    keywords: ["cook", "sick", "soup", "cooking"],
    durationSec: 58,
    seed: { daysAgo: 12, time: "12:15" },
    transcript:
      "When someone's sick? Chicken soup, obviously, with a lot of ginger. Plain rice with a little butter, because nobody can say no to that. And cinnamon tea with honey. That was my mother's, and her mother's.",
    things: [
      {
        headline: "Chicken soup with a lot of ginger",
        detail: "",
        quote: "Chicken soup, obviously, with a lot of ginger.",
      },
      {
        headline: "Plain rice with a little butter",
        detail: "Nobody can say no to that.",
        quote: "Plain rice with a little butter, because nobody can say no to that.",
      },
      {
        headline: "Cinnamon tea with honey",
        detail: "That was my mother's, and her mother's.",
        quote: "cinnamon tea with honey. That was my mother's, and her mother's.",
      },
    ],
  },
  {
    key: "mom-marriage",
    person: "Mom",
    question: "What are three things that make a marriage last?",
    topic: "Relationships",
    keywords: ["marriage", "relationship", "relationships", "last", "love"],
    durationSec: 81,
    seed: { daysAgo: 40, time: "21:10" },
    transcript:
      "What makes it last. You have to stay curious about each other. People change, and you have to keep meeting the new person. Fight about the thing, not about each other. And laugh. Your father still makes me laugh every day, even when I'm annoyed with him.",
    things: [
      {
        headline: "Stay curious about each other",
        detail: "People change, and you have to keep meeting the new person.",
        quote: "You have to stay curious about each other.",
      },
      {
        headline: "Fight about the thing, not about each other",
        detail: "",
        quote: "Fight about the thing, not about each other.",
      },
      {
        headline: "Keep laughing together",
        detail: "Your father still makes me laugh every day, even when I'm annoyed with him.",
        quote: "Your father still makes me laugh every day",
      },
    ],
  },
  {
    key: "alex-food",
    person: "Alex",
    question: "What are three food places I should try in Jersey City?",
    topic: "Food",
    place: "Jersey City",
    keywords: ["food", "eat", "restaurants", "jersey"],
    durationSec: 77,
    seed: { daysAgo: 7, time: "19:30" },
    transcript:
      "Food in Jersey City. Razza, for pizza. Get the margherita and go early, the line gets long. Then just walk Newark Avenue in India Square and eat whatever smells best. Seriously, you can't go wrong. And the Grove Street farmers market on Saturday mornings, for the bread and the coffee.",
    things: [
      {
        headline: "Razza, for pizza",
        detail: "Get the margherita and go early. The line gets long.",
        quote: "Razza, for pizza. Get the margherita and go early",
      },
      {
        headline: "Eat your way down Newark Avenue",
        detail: "Walk India Square and eat whatever smells best. You can't go wrong.",
        quote: "walk Newark Avenue in India Square and eat whatever smells best",
      },
      {
        headline: "The Grove Street farmers market",
        detail: "Saturday mornings, for the bread and the coffee.",
        quote: "the Grove Street farmers market on Saturday mornings, for the bread and the coffee",
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
    place: "Jersey City",
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
      personIds: c.person ? [personIdFor(c.person)] : [],
      ...(c.place ? { place: c.place } : {}),
      ...(c.seed!.keptClose ? { keptClose: true } : {}),
    }));
}

/**
 * The little context a user might have added about the people in the samples.
 * Private notes in their own words, not fields.
 */
export const sampleNotes: Record<string, string> = {
  Jason: "Former colleague from my first startup",
  Sarah: "College roommate, lives in Boston",
  Maya: "Founder friend from the accelerator",
  Carlos: "Met at a fintech meetup",
  "Professor Reyes": "Strategy professor",
  Alex: "Neighbor in Jersey City",
  Daniel: "Friend from the running club",
  "Dr. Kim": "Our family doctor",
  "Coach Miller": "High school track coach",
  Priya: "Manager at my internship",
  Kenji: "Friend from Tokyo",
};

/** The home screen's inspiration. The user asks another person; nobody answers these for them. */
export const starterQuestions = [
  "What are three things life has taught you?",
  "What are three places I should visit here?",
  "What are three things you wish you knew earlier?",
];
