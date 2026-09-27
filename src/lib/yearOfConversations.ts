import type { Capture } from "./types";

/**
 * A year of asking people things: how the Library feels once it holds
 * hundreds of things from dozens of people. Offered from You as a preview,
 * and removed again as a whole.
 *
 * [days ago, person, topic, place, question, [headline, context][], kept close]
 */
type Entry = [number, string, string, string, string, [string, string][], boolean?];

const YEAR: Entry[] = [
  [62, "Priya", "Career", "", "What are three things you look for when you hire an analyst?", [
    ["Curiosity over polish", "The best ones ask a second question about the data before they build anything."],
    ["Clear writing", "If they can't explain it in an email, they can't explain it to a client."],
    ["Owning mistakes fast", "Everyone makes errors in a model. The good ones flag it the same day."],
  ]],
  [65, "Tom", "Travel", "Boston", "What are three things to do in Boston in winter?", [
    ["Skate on the Frog Pond", "Go on a weeknight when it's quiet, and get hot chocolate after."],
    ["A snowy afternoon at the Gardner Museum", "The courtyard garden is green all year, which feels like a small miracle in January."],
    ["Chowder in the North End", "Skip the famous places with lines and go wherever the fishermen go."],
  ]],
  [68, "Dad", "Money", "", "What are three money rules you've never broken?", [
    ["Never borrow for something that loses value", "Cars were the one exception, and I regretted most of them."],
    ["Pay yourself first", "Savings come out the day the paycheck lands, before anything else."],
    ["Keep six months in cash", "It's not an investment. It's what lets you sleep at night."],
  ]],
  [71, "Aunt Rosa", "Cooking", "", "What are three things every home cook should know?", [
    ["Salt the pasta water like the sea", "Most people use a pinch. It should taste like the ocean."],
    ["Let meat rest", "Ten minutes on the board makes more difference than any marinade."],
    ["Taste as you go", "The recipe is a suggestion. Your tongue is the rule."],
  ]],
  [74, "Jason", "Startup", "", "What are three signs a startup idea is worth pursuing?", [
    ["People already pay for a bad version", "If they're using spreadsheets and hating it, that's your market."],
    ["You can reach the first ten customers yourself", "If you need ads to find them, it's too early."],
    ["You'd still work on it if it took ten years", "Because it probably will."],
  ]],
  [77, "Leah", "Health", "", "What are three things that actually helped you sleep better?", [
    ["Same wake-up time every day", "Even weekends. Bedtime sorted itself out after that."],
    ["No phone in the bedroom", "A cheap alarm clock changed everything."],
    ["A cooler room", "Turning the heat down at night is when I started sleeping through."],
  ]],
  [80, "Kenji", "Travel", "Tokyo", "What are three things I shouldn't miss in Tokyo?", [
    ["Breakfast at a standing sushi bar", "Go early near the fish market. It's cheap and better than the dinner places."],
    ["Walk Yanaka in the late afternoon", "Old Tokyo, cats, tiny shops. Nobody rushes there."],
    ["Take the train, not taxis", "The trains are easier than they look, and taxis are painfully expensive."],
  ]],
  [84, "Maya", "Leadership", "", "What are three things you learned from your first bad manager?", [
    ["Silence reads as disapproval", "She never gave feedback, so everyone assumed the worst."],
    ["Credit flows down, blame stays up", "She did the opposite, and I promised myself I never would."],
    ["Meetings aren't management", "We had five a week and still didn't know what mattered."],
  ]],
  [88, "Grandpa Joe", "Work", "", "What are three things you'd tell your younger self about work?", [
    ["Learn to fix things with your hands", "Even if you work at a desk. It keeps you humble and useful."],
    ["Your reputation walks in before you do", "In a small town, everyone knew who was honest."],
    ["Leave on time", "Nobody remembers the overtime."],
  ]],
  [92, "Elena", "Food", "Mexico City", "What are three places to eat in Mexico City?", [
    ["Tacos al pastor at El Vilsito", "It's a mechanic's shop by day. Go after ten at night."],
    ["Contramar for lunch", "Order the tuna tostadas and the fish grilled half red, half green."],
    ["Any mercado for breakfast", "Sit at a counter and point at whatever the person next to you is eating."],
  ]],
  [95, "Carlos", "Money", "", "What are three things you wish you'd known about equity?", [
    ["Read the vesting schedule twice", "The cliff matters more than the number of shares."],
    ["Ask about the strike price", "A lot of options means nothing if they're priced too high."],
    ["Treat it like a lottery ticket", "Negotiate salary as if the equity is worth zero."],
  ]],
  [99, "Dr. Kim", "Health", "", "What are three health habits that are worth the effort?", [
    ["Walk after meals", "Even ten minutes. It does more for blood sugar than most people realize."],
    ["Strength training twice a week", "It matters more as you get older, not less."],
    ["See a doctor when you're well", "Checkups catch the boring problems before they become interesting ones."],
  ]],
  [103, "Sam", "Books", "", "What are three books you give as gifts?", [
    ["A Gentleman in Moscow", "Everyone I've given it to has called me after finishing it."],
    ["Four Thousand Weeks", "It made me stop trying to get everything done."],
    ["The Overstory", "I'll never look at a tree the same way."],
  ]],
  [106, "Mom", "Family", "", "What are three things that kept our family close?", [
    ["Sunday dinner, no matter what", "Even when you were teenagers and pretended to hate it."],
    ["Nobody goes to bed angry", "We didn't always solve it, but we always said goodnight."],
    ["Showing up for small things", "Recitals and games mattered more than big vacations."],
  ], true],
  [110, "Omar", "Career", "", "What are three things that helped you switch careers?", [
    ["Coffee with people doing the job", "I asked thirty people what their day actually looked like."],
    ["A small project before quitting", "I built one real thing on weekends so I had proof."],
    ["A money runway", "Eight months of savings let me say no to the wrong offers."],
  ]],
  [114, "Nadia", "Relationships", "", "What are three things that make a friendship last?", [
    ["Remember the small stuff", "Asking how the dentist appointment went means more than a big gift."],
    ["Don't keep score", "Some years one of you gives more. It evens out."],
    ["Say the awkward thing", "Every friendship I lost, I lost to something nobody said."],
  ]],
  [118, "Jason", "Leadership", "", "What are three things that make a good one-on-one?", [
    ["Their agenda, not yours", "If you're doing the talking, it's a status meeting."],
    ["Ask what's getting in the way", "It surfaces problems weeks before they show up anywhere else."],
    ["Never cancel it", "Moving it is fine. Cancelling tells them they're not a priority."],
  ]],
  [122, "Ben", "Travel", "Lisbon", "What are three things to know before going to Lisbon?", [
    ["Wear shoes with grip", "The stone sidewalks are beautiful and incredibly slippery."],
    ["Skip Tram 28 at midday", "Ride it early in the morning, or walk the route instead."],
    ["Eat where the menu is handwritten", "The best tascas don't have English menus or photos."],
  ]],
  [126, "Hannah", "Parenting", "", "What are three things you'd tell a new parent?", [
    ["Sleep when you can, not when you should", "Forget the laundry. Nap."],
    ["Accept every offer of help", "People want to help. Give them a specific job."],
    ["It's a phase, all of it", "The good parts and the hard parts both pass faster than you think."],
  ]],
  [130, "Professor Reyes", "Career", "", "What are three things that make someone good at strategy?", [
    ["Saying what you won't do", "A strategy that includes everything isn't a strategy."],
    ["Starting with the customer's problem", "Not the competitor's latest move or the org chart."],
    ["Fitting it on one page", "If it takes a deck, you haven't decided yet."],
  ], true],
  [134, "Sarah", "Travel", "Cape Cod", "What are three things to do on Cape Cod?", [
    ["Bike the Rail Trail", "Rent bikes in Orleans and ride as far as you feel like."],
    ["Sunset at First Encounter Beach", "Bring a blanket. People clap when the sun goes down."],
    ["Go in June, before the crowds", "Everything's open and you can still get a table."],
  ]],
  [138, "Coach Miller", "Health", "", "What are three things that make someone a better runner?", [
    ["Run slower most days", "Easy days should feel almost too easy."],
    ["Consistency beats intensity", "Three runs every week beat one heroic long run."],
    ["Rest is part of training", "You get stronger recovering, not running."],
  ]],
  [142, "Lucia", "Travel", "Barcelona", "What are three things to do in Barcelona beyond the Sagrada Família?", [
    ["Get lost in Gràcia", "Small squares, local bars, and no tour groups."],
    ["Eat late", "Dinner before nine is for tourists."],
    ["Climb up to the Bunkers del Carmel", "Go at sunset for the best view of the whole city."],
  ]],
  [146, "Maya", "Startup", "", "What are three things you'd tell a founder before they fundraise?", [
    ["Have a reason to close now", "Investors will wait forever unless something makes them move."],
    ["Talk to investors before you need them", "The first meeting shouldn't be the ask."],
    ["Know your numbers cold", "One fumbled question about churn can end the conversation."],
  ]],
  [150, "Dad", "Life", "", "What are three things you learned from your father?", [
    ["Fix things before replacing them", "He could keep anything running with wire and patience."],
    ["Be early", "Five minutes early is on time."],
    ["Say thank you out loud", "He thanked every waiter and every mechanic, every time."],
  ]],
  [155, "Priya", "Work", "", "What are three things that make you better at running meetings?", [
    ["Send the question, not just the topic", "People come ready to decide instead of discuss."],
    ["End with who does what", "Otherwise everyone leaves thinking someone else has it."],
    ["Cancel when there's nothing to decide", "An update can be an email."],
  ]],
  [160, "Marcus", "Books", "", "What are three books you reread every few years?", [
    ["Meditations by Marcus Aurelius", "Different lines matter every time, depending on what's going on."],
    ["East of Eden", "Every time I'm older, I understand a different character."],
    ["The Little Prince", "I thought it was for kids until I read it at forty."],
  ]],
  [165, "Tom", "Career", "", "What are three things that helped you get promoted?", [
    ["Making my manager's job easier", "I'd bring the problem and a proposed fix together."],
    ["Writing down my wins", "At review time, I had a list instead of trying to remember."],
    ["Asking what the next level looks like", "Nobody told me until I asked directly."],
  ]],
  [170, "Aunt Rosa", "Family", "", "What are three family traditions worth keeping?", [
    ["Cooking together at the holidays", "The recipes are an excuse. The talking is the point."],
    ["Calling on birthdays, not texting", "Hearing a voice matters."],
    ["Telling the old stories", "Kids pretend to be bored, then tell them to their own kids."],
  ]],
  [175, "Elena", "Relationships", "", "What are three things that help when you're arguing with a partner?", [
    ["Take a break before it gets mean", "Twenty minutes apart saves a week of repair."],
    ["Talk about the problem, not the person", "“This keeps happening” instead of “you always.”"],
    ["Assume good intent", "They're almost never trying to hurt you."],
  ]],
  [180, "Kenji", "Food", "Kyoto", "What are three things to eat in Kyoto?", [
    ["Yudofu near Nanzen-ji", "Simple tofu hot pot. Better than it sounds, especially in winter."],
    ["Snacks at Nishiki Market", "Go before eleven or it's shoulder to shoulder."],
    ["Matcha anything in Uji", "It's a short train ride and worth half a day."],
  ]],
  [185, "Nadia", "Career", "", "What are three things you'd tell someone starting in consulting?", [
    ["Answer first, then explain", "Partners want the conclusion in the first sentence."],
    ["Every slide needs a so-what", "If the title isn't a takeaway, rewrite it."],
    ["Protect one evening a week", "The job will take all of them if you let it."],
  ]],
  [190, "Carlos", "Startup", "", "What are three mistakes you made with your first hire?", [
    ["Hiring a friend", "It worked until we disagreed, and then it didn't."],
    ["No written expectations", "Neither of us knew what success looked like after ninety days."],
    ["Waiting too long to have the hard talk", "I knew in the first month and said nothing for six."],
  ]],
  [195, "Sam", "Life", "", "What are three things that made your thirties better than your twenties?", [
    ["Caring less what people think", "It freed up an enormous amount of energy."],
    ["Fewer, closer friends", "I stopped going to things I didn't want to go to."],
  ]],
  [200, "Hannah", "Cooking", "", "What are three weeknight dinners you always come back to?", [
    ["Sheet-pan chicken and vegetables", "One pan, forty minutes, almost no cleanup."],
    ["Fried rice with whatever's left", "Day-old rice is the secret."],
    ["Pasta with lemon and parmesan", "Ten minutes, and the kids actually eat it."],
  ]],
  [205, "Omar", "Money", "", "What are three things that helped you pay off debt?", [
    ["Smallest balance first", "Seeing one disappear kept me going."],
    ["Automatic payments", "If I had to decide every month, I'd have found excuses."],
    ["Telling a friend the plan", "Knowing someone would ask made me stick to it."],
  ]],
  [210, "Jason", "Career", "", "What are three things you'd do in your first ninety days in a new job?", [
    ["Meet everyone one-on-one", "Ask each of them what they'd change if they were you."],
    ["Find one quick win", "Something small and visible that earns trust."],
    ["Don't change anything big yet", "You don't know yet why things are the way they are."],
  ]],
  [215, "Leah", "Travel", "Montreal", "What are three things I should do in Montreal?", [
    ["Bagels from St-Viateur", "Get them hot from the wood oven, at any hour."],
    ["Walk up Mount Royal", "The view from the lookout is worth the stairs."],
    ["Jean-Talon Market on a Saturday", "Bring cash and an empty stomach."],
  ]],
  [220, "Dr. Kim", "Life", "", "What are three things patients taught you about getting older?", [
    ["Stay curious", "The happiest ones were always learning something."],
    ["Keep your friendships up", "Loneliness hurt my patients more than most diagnoses."],
    ["Move every day", "The ones who kept walking kept their independence."],
  ]],
  [225, "Ben", "Work", "", "What are three things that make remote work actually work?", [
    ["A real start and end to the day", "I walk around the block before and after, like a commute."],
    ["Over-communicate in writing", "If it's not written down, it didn't happen."],
    ["Meet in person a few times a year", "Those days carry the relationship for months."],
  ]],
  [230, "Lucia", "Cooking", "", "What are three things you learned cooking in Spain?", [
    ["Good olive oil changes everything", "Buy one good bottle for finishing, not for frying."],
    ["Tomato on bread is a meal", "Rub it on toasted bread with salt and oil. That's it."],
    ["Slow down the sofrito", "Forty minutes on low heat. Rushing it is the most common mistake."],
  ]],
  [235, "Maya", "Work", "", "What are three things you do to protect your focus?", [
    ["Mornings are for deep work", "No meetings before eleven, ever."],
    ["One tab, one task", "Close everything else, even email."],
    ["Write tomorrow's three things tonight", "Then the day starts already decided."],
  ]],
  [240, "Grandpa Joe", "Relationships", "", "What are three things that kept your marriage going for fifty years?", [
    ["We laughed at ourselves", "Most fights ended when one of us saw how silly it was."],
    ["Separate hobbies", "She had her garden, I had my workshop. We missed each other."],
    ["Never stop courting", "Flowers every Friday, until the end."],
  ], true],
  [245, "Priya", "Travel", "Chicago", "What are three things to do in Chicago?", [
    ["The architecture boat tour", "Even locals do it. You'll see the city differently."],
    ["A real Italian beef", "Dipped, with hot peppers. Forget deep dish."],
    ["Walk the Lakefront Trail", "Start at Navy Pier and head north as far as you want."],
  ]],
  [250, "Coach Miller", "Parenting", "", "What are three things parents get wrong about youth sports?", [
    ["Replaying the game on the drive home", "Just say you loved watching them play."],
    ["Specializing too early", "Kids who play three sports end up better at one."],
    ["Treating it like a career", "At ten, the point is friends and fun."],
  ]],
  [255, "Kenji", "Career", "", "What are three things you learned working in Japan?", [
    ["Preparation is respect", "Showing up with everything printed and read says more than any pitch."],
    ["Decisions happen before the meeting", "The meeting confirms agreement. It doesn't build it."],
    ["Silence isn't awkward", "People think before they answer, and that's fine."],
  ]],
  [260, "Mom", "Health", "", "What are three things you do to stay well?", [
    ["A morning walk with a friend", "The walking is good. The talking is better."],
    ["Early to bed", "Nothing good is on television after ten."],
    ["A big salad at lunch", "Then I don't worry about dinner."],
  ]],
  [265, "Elena", "Career", "", "What are three things you'd tell a woman starting in finance?", [
    ["Say the number first", "In a negotiation, whoever anchors usually wins."],
    ["Find a sponsor, not just a mentor", "A mentor gives advice. A sponsor says your name in rooms you're not in."],
    ["Don't apologize for asking questions", "The people who ask get better faster."],
  ]],
  [270, "Alex", "Life", "Jersey City", "What are three things you love about living in Jersey City?", [
    ["The skyline from the waterfront", "I still stop on the walk home to look at it."],
    ["Twenty minutes to Manhattan on the PATH", "All of the city, none of the rent."],
    ["Neighbors actually know each other", "My block has a group chat and it's genuinely useful."],
  ]],
  [275, "Tom", "Relationships", "", "What are three things you learned from your divorce?", [
    ["Own your share of it", "It wasn't all her, and seeing that is what helped me heal."],
    ["Keep the kids out of it", "They should never have to pick a side."],
    ["Build a life you like on your own", "I'd forgotten what I actually enjoyed."],
  ]],
  [280, "Nadia", "Books", "", "What are three books that made you better at work?", [
    ["The Pyramid Principle", "It taught me to lead with the answer."],
    ["Never Split the Difference", "I use mirroring in almost every negotiation."],
    ["Crucial Conversations", "It gave me words for the conversations I kept avoiding."],
  ]],
  [285, "Ben", "Cooking", "", "What are three things you learned working in a restaurant kitchen?", [
    ["Clean as you go", "A clean station is a calm station."],
    ["Prep everything before you cook", "Chop it all first, then turn on the heat."],
    ["Sharp knives are safer", "Dull ones slip."],
  ]],
  [290, "Carlos", "Leadership", "", "What are three things you learned about letting someone go?", [
    ["Do it early in the week", "Not Friday afternoon. They should have support the next day."],
    ["Be clear in the first sentence", "Kindness is not making them guess."],
    ["It should never be a surprise", "If it is, the failure is yours as a manager."],
  ]],
  [295, "Hannah", "Relationships", "", "What are three things you learned in your first year of marriage?", [
    ["Split chores by what you hate least", "Not by what's fair on paper."],
    ["A money talk every month", "Short, boring, and it prevents the big fights."],
    ["Protect one night a week", "Phones away, just the two of us."],
  ]],
  [300, "Professor Reyes", "Books", "", "What are three books every business student should read?", [
    ["Good Strategy Bad Strategy", "It shows how most strategies are just goals in disguise."],
    ["The Innovator's Dilemma", "Why good companies fail by doing everything right."],
    ["Thinking, Fast and Slow", "It will make you suspicious of your own confidence."],
  ]],
  [305, "Leah", "Career", "", "What are three things that helped you negotiate a raise?", [
    ["Market data, not feelings", "I brought salary ranges from three similar roles."],
    ["Asking in writing first", "It gave my manager time to get approval."],
    ["Knowing my walk-away number", "It made me calmer in the room."],
  ]],
  [310, "Sam", "Travel", "New York", "What are three things to do in New York that aren't touristy?", [
    ["Walk the Brooklyn Bridge at sunrise", "Empty, quiet, and the light on Manhattan is unreal."],
    ["Get a slice in Queens", "Any corner place where the line is mostly locals."],
    ["A set at a small jazz club", "The Village Vanguard, if you can get in."],
  ]],
  [315, "Aunt Rosa", "Life", "", "What are three things you know now that you didn't at thirty?", [
    ["Most worries never happen", "I spent years on things that never came."],
    ["Your health is your wealth", "You don't believe it until your knees tell you."],
    ["Forgive fast", "Holding on only ever hurt me."],
  ]],
  [320, "Omar", "Travel", "Istanbul", "What are three things to do in Istanbul?", [
    ["Take the ferry to the Asian side", "It's cheap, and the view of the city from the water is the best there is."],
    ["Breakfast in Kadıköy", "A full Turkish breakfast takes two hours. Don't rush it."],
    ["Go to a hammam once", "Pick an old one, not a hotel spa."],
  ]],
  [325, "Dad", "Work", "", "What are three things you learned in forty years of work?", [
    ["Be the person who finishes things", "Plenty of people start. Few finish."],
    ["Learn the names of the people who clean the building", "How you treat them says everything."],
    ["Don't take the job home", "It will still be there on Monday."],
  ]],
  [330, "Priya", "Parenting", "", "What are three things you're doing differently from your parents?", [
    ["Saying sorry to my kids", "I want them to know adults get it wrong too."],
    ["Talking about money openly", "It was a secret in our house, and I learned nothing."],
    ["Letting them be bored", "Boredom is where the good ideas come from."],
  ]],
  [335, "Lucia", "Life", "", "What are three things that made moving abroad worth it?", [
    ["Learning the language, badly", "People open up when you try, mistakes and all."],
    ["Being a beginner again", "It made me patient with myself."],
  ]],
  [340, "Jason", "Money", "", "What are three things you learned about money after selling your company?", [
    ["It doesn't change who you are", "It just makes you more of it."],
    ["Wait a year before big decisions", "I almost bought a house I'd have hated."],
    ["Give some away early", "It set the tone for how I think about the rest."],
  ]],
  [345, "Coach Miller", "Life", "", "What are three things coaching taught you about people?", [
    ["Everyone wants to be seen", "The kid on the bench needs attention as much as the star."],
    ["Effort is contagious", "One hard worker changes the whole team."],
    ["Confidence comes from preparation", "Not from pep talks."],
  ]],
  [350, "Marcus", "Career", "", "What are three things you'd tell someone in their first design job?", [
    ["Show work early and often", "The rough version gets better feedback than the polished one."],
    ["Learn the business", "Designers who understand the numbers get listened to."],
    ["Keep a folder of things you love", "It's where every good idea starts."],
  ]],
  [355, "Dr. Kim", "Travel", "Seoul", "What are three things to do in Seoul?", [
    ["Eat at Gwangjang Market", "Get the mung bean pancakes, fresh off the griddle."],
    ["Walk the old city wall", "Start near Naksan Park in the evening."],
    ["Stay in Bukchon", "The old houses are quiet even in the middle of the city."],
  ]],
  [360, "Sarah", "Career", "", "What are three things that helped you most in your first year teaching?", [
    ["Learning every name the first week", "It changed how the kids treated me."],
    ["Planning a week ahead, not a day", "The day-ahead teachers burned out by November."],
    ["One older teacher to ask", "Having someone down the hall saved my first year."],
  ]],
  [365, "Mom", "Cooking", "", "What are three recipes you want me to learn?", [
    ["Grandma's Sunday sauce", "Start it in the morning. It needs the whole day."],
    ["Chicken soup", "The same one I made when you were sick."],
    ["Apple cake", "It's forgiving. You can't really ruin it."],
  ]],
  [370, "Nadia", "Travel", "Paris", "What are three things to do in Paris that tourists miss?", [
    ["Picnic on the Canal Saint-Martin", "Bread, cheese and wine, sitting on the edge with everyone else."],
    ["The Rodin Museum garden", "The garden ticket costs a few euros and it's peaceful."],
    ["Walk the Coulée verte", "An old railway turned into a garden, and almost nobody's on it."],
  ]],
  [375, "Grandpa Joe", "Money", "", "What are three things you learned about money growing up?", [
    ["Waste nothing", "We saved string, jars and every button."],
    ["Cash in hand is real", "My father didn't trust anything he couldn't count."],
    ["Share when you have it", "Neighbors fed us once, so we fed them later."],
  ]],
  [378, "Omar", "Startup", "", "What are three things you learned running a small business?", [
    ["Cash flow is everything", "We were profitable on paper and nearly closed twice."],
    ["Your first customers are your marketing", "Word of mouth brought in more than any ad."],
    ["Pay yourself something", "Working for nothing isn't a plan."],
  ]],
  [382, "Tom", "Leadership", "", "What are three things you learned leading a team through layoffs?", [
    ["Tell people the truth as early as you can", "Rumors are worse than bad news."],
    ["Take care of the people who stay", "They're grieving too, and scared."],
    ["Stay visible", "Hiding in meetings is the worst thing a leader can do."],
  ]],
  // Not every conversation has a name on it.
  [96, "", "Leadership", "", "What are three things you'd tell a first-time manager?", [
    ["Your job is their success now", "Your own output matters less than it ever has."],
    ["Have the hard conversation this week", "It only gets harder next week."],
    ["Ask more than you tell", "People support what they help build."],
  ]],
  [228, "", "Travel", "Philadelphia", "What are three things to see in Philadelphia?", [
    ["The Reading Terminal Market", "Go hungry, and get a roast pork sandwich."],
    ["The Magic Gardens", "A whole building covered in mirror mosaics."],
    ["Walk Elfreth's Alley", "The oldest street in the country, and people still live on it."],
  ]],
];

const TIMES = ["08:40", "12:15", "18:30", "20:10", "10:05", "16:45", "19:20", "13:50", "21:00"];

/** The whole year as saved conversations, dated back from now. */
export function yearOfConversations(now = new Date()): Capture[] {
  return YEAR.map(([daysAgo, person, topic, place, question, things, keptClose], i) => {
    const [h, m] = TIMES[i % TIMES.length].split(":").map(Number);
    const at = new Date(now);
    at.setDate(at.getDate() - daysAgo);
    at.setHours(h, m, 0, 0);
    return {
      id: `year-${i}`,
      question,
      person,
      topic,
      ...(place ? { place } : {}),
      things: things.map(([headline, detail], j) => ({ id: `year-${i}-${j}`, headline, detail })),
      recordedAt: at.toISOString(),
      durationSec: 55 + ((i * 37) % 140),
      hasAudio: false,
      origin: "sample" as const,
      ...(keptClose ? { keptClose: true } : {}),
    };
  });
}

export function isYearConversation(capture: Capture): boolean {
  return capture.id.startsWith("year-");
}
