/**
 * Argument selection: pure functions. The VOC fixture is the Trustpilot corpus from research/rubric/voc.py
 * (rows: [date, text, desire_cluster]) with the bands research/rubric/magnitude.py printed for it, so the port is
 * checked against the Python, cluster by cluster.
 */
import { assert, assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { band, STAYING_MARKERS, URGENCY_MARKERS } from "../argument/markers.ts";
import {
  computeClusterTable,
  findCluster,
  normalizeCluster,
  renderClusterTable,
  type VerbatimLike,
  yearOf,
} from "../argument/magnitude.ts";
import { carrierValue, desireGate, ledgerIdOf, type LedgerClaimLike, proofGate } from "../argument/gates.ts";
import {
  buildScores,
  composeThesis,
  describeTieBreak,
  pickFinalists,
  type Rankable,
  rankCandidates,
  THESIS_TEMPLATE,
  weightedTotal,
} from "../argument/weighting.ts";
import { type CandidateT, isExcluded, normalizeCandidates, normalizeText, readExclusions } from "../argument/candidates.ts";
import { assembleArgument, gateCandidates, indexJudged, isSurvivor, ScoringOutput } from "../argument/assemble.ts";
import { MAX_WEIGHTED } from "../schemas/argument.ts";

type Row = [string, string, string];
interface Expected {
  k: number;
  years: number;
  U: number;
  S: number;
  P: number;
  mag: number;
}
const FIXTURE = {"corpora": {"AG1": {"rows": [["2026-10-21", "It gives me a noticeable boost in energy, and I often don't feel the need for coffee afterward.", "energy"], ["2026-10-22", "Easy to order and uncomplicated", "svc"], ["2026-10-20", "always in a better mood", "mood"], ["2026-10-21", "customer service and focus on the customer is exceptional", "svc"], ["2026-10-21", "as a 48 year-old male my energy levels are higher and more consistent", "energy"], ["2026-10-20", "I am really less sick from the moment in the past when I started using AG1.", "immunity"], ["2026-10-20", "The product is great and delivery spot on", "svc"], ["2026-10-16", "Great service. Even better product.", "svc"], ["2026-10-20", "I take AG1 every morning. It keeps me sharp and energetic throughout the day.", "energy"], ["2026-10-19", "Since I started, I had a huge increase in taking care about myself", "routine"], ["2026-10-19", "I do feel much better on it .. more energy etc but now don't take it everyday as can't afford £80 a month.", "energy"], ["2026-09-08", "My only real frustration is missing out on the free goodies that new customers get with their first order!", "svc"], ["2026-10-14", "Ordering and reordoring is easy", "svc"], ["2026-10-18", "I enjoy drinking your product and feel the difference.", "wellbeing"], ["2026-10-18", "Saves taking 10-15 separate supplements also!", "simplify"], ["2026-10-17", "I like that you are always making sure that the packages come monthly to me", "svc"], ["2026-10-02", "The taste is great, monthly subscription works and allows for postponed delivery if needed", "svc"], ["2026-10-14", "AG1 really has made a difference to my daily routine to help me feel energised and prepared for the daily challenges.", "energy"], ["2026-10-08", "The delivery often takes longer than expected...so we often have a few days where we go without.", "svc"], ["2026-10-20", "My main reservation is the relatively high price", "price"], ["2026-10-19", "Living in Poland it's not the cheapest product by our local market standards", "price"], ["2026-10-07", "I've taken AG1 daily for about couple of years now as the base of a structured health routine.", "routine"], ["2026-10-13", "Allergic to soy and this product apparently contains soy….", "svc"], ["2026-10-14", "Delivery is very long to Italy, one week about!", "svc"], ["2026-10-13", "Worst tasting supplement I've ever used.", "taste"], ["2026-10-13", "Made me sick.", "svc"], ["2026-10-11", "Taste was ok but my first drink was the best laxative I've ever had.", "taste"], ["2026-10-10", "liquid always leaks out, either staining my clothes or dripping onto the floor.", "svc"], ["2026-10-03", "I would give it 5 stars if it wasn't so expensive.", "price"], ["2026-09-30", "I don't notice any of the promised effects.", "proof"], ["2026-09-30", "had to follow on every freaking order.", "svc"], ["2026-09-27", "the bottle caps broke off the top.", "svc"], ["2026-09-25", "Too much packaging material.", "svc"], ["2026-09-24", "how often I receive and see a plethora of offers for new users.", "svc"], ["2026-09-23", "the taste is really unpleasant.", "taste"], ["2026-09-20", "if you could make it taste better and not be so sandy id buy more 100%.", "taste"], ["2026-09-15", "my nails start to be firm, however this effect went down in the past month.", "proof"], ["2026-09-12", "I've had orders go missing, as well as orders with no progress or updates for two weeks.", "svc"], ["2026-09-06", "Firstly it tastes very bad and after not much of a result either.", "proof"], ["2026-09-04", "I actually don't know if it is doing any benefit.", "proof"], ["2026-09-02", "my package was left unattended outside my front door for two days.", "svc"], ["2026-10-11", "love packaging, want to see how I feel", "wellbeing"], ["2026-09-16", "I've noticed improved energy and digestion.", "energy"], ["2026-10-14", "I've been drinking AG-1 now for over two years. I can't imagine starting my day without it now.", "routine"], ["2026-10-15", "AG1 is very flexible if you need to alter the delivery schedule.", "svc"], ["2026-10-16", "Having used AG1 for years now I would not be without my daily dose.", "routine"], ["2026-10-14", "Love AG1 as my daily breakfast routine. Would highly recommend to all", "routine"], ["2026-10-15", "In terms of wellbeing, it has provided me with stable energy levels, sharper focus, and a happier mindset.", "energy"], ["2026-10-14", "So much better as a milkshake with milk and or a yakult-type drink!", "taste"], ["2026-10-09", "Great price and was dispatched quickly to me.", "svc"], ["2026-10-15", "My subscription works very smoothly and I'm a huge fan!", "svc"], ["2026-10-15", "I have been happy using AG1 for over a year now and have it as a supplement to my daily plan", "routine"], ["2026-10-12", "Keeping the quality standard very high. Being on time with the order, and flexible with holiday adjustments.", "svc"], ["2026-10-13", "My hair growth has improved, and overall, I feel much better health-wise; I'm much fitter", "wellbeing"], ["2026-10-08", "The product is excelent the packaging is second to none", "svc"], ["2026-10-12", "We enjoy our AG1 every day during our late afternoon respite.", "routine"], ["2026-10-12", "I really like AG1 supplements - it helped me to control bloating, feel better, more energized, lighter every day.", "gut"], ["2026-10-02", "Overall feeling and energy levels are better than before usage and that is (not just a placebo).", "energy"], ["2026-10-04", "Makes me feel energetic and feel good", "energy"], ["2026-10-04", "Easy order process & great product.", "svc"], ["2026-10-03", "Great product, tastes better than I thought, bottle and storage tin are both great quality too", "taste"], ["2026-10-03", "It just feels good", "wellbeing"], ["2026-10-05", "I get a notification on the day, sometimes after delivery to say my delivery is on its way.", "svc"], ["2026-10-02", "My stomach has never been better!", "gut"], ["2026-10-02", "Nice product and very nourishing.", "wellbeing"], ["2026-10-02", "there could be effect of first great expectations (i will start drink ag1 and will be of great shape and health)", "proof"], ["2026-10-02", "I have been an AG1 customer for two years, and I have always loved the product.", "routine"], ["2026-10-01", "I took AG1 for over a year.", "routine"], ["2026-10-01", "Quick and efficient delivery", "svc"], ["2026-10-01", "Low value for money", "price"], ["2026-10-01", "Very aesthetically pleasing product.", "svc"], ["2026-10-01", "Easy to shop for the package thats right for you and flexible subscription option to fit around your schedule.", "svc"], ["2026-09-30", "After the first 2-3 weeks of taking AG1, I felt that I had a spring in my step and had less aches in my body.", "energy"], ["2026-09-30", "I have been taking AG1 now for 9 months now and although it is expensive, I feel it is worth it", "price"], ["2026-09-21", "I would try and improve the way the travel packs open.", "svc"], ["2026-09-20", "Improved digestion, positive attitude, feeling healthy!", "gut"], ["2026-09-20", "Really good stuff been taking it for last 6 months. Nice taste and certainly feel the benefits.", "wellbeing"], ["2026-09-20", "The subscription works well. Especially the possibility to skip a few weeks.", "svc"], ["2026-09-19", "Feels like it could be a little cheaper, but I've certainly felt the benefits of AG1 in terms of energy and immunity.", "energy"], ["2026-09-19", "Since using ag1 for the past 12 months or more my amune system is better my sleep is better and feel more awake throughout the day.", "immunity"], ["2026-09-19", "I have been using AG1 for years because it has made a very positive impact on my wellbeing and energy levels.", "energy"], ["2026-09-19", "Thanks to this drink, I finally got pregnant after 11 years of IVF.", "wellbeing"], ["2026-09-19", "Taking it first thing in the morning has been huge for getting through back-to-back training sessions without crashing.", "energy"], ["2026-09-18", "Daily Routine and the perfect start of my day!", "routine"], ["2026-09-18", "It takes just a few seconds to prepare, which makes it really easy to fit into my daily routine.", "simplify"], ["2026-09-18", "I believe it helps support my immunity above all other areas.", "immunity"], ["2026-09-17", "as a 70-year old I haven't had a cold or flu for 3 years. Coincidence or not?", "immunity"], ["2026-09-17", "Truly reliable delivery and support.", "svc"]], "expected": {"energy": {"k": 13, "years": 1, "U": 2, "S": 2, "P": 1, "mag": 5}, "svc": {"k": 32, "years": 1, "U": 1, "S": 0, "P": 3, "mag": 4}, "mood": {"k": 1, "years": 1, "U": 0, "S": 3, "P": 0, "mag": 3}, "immunity": {"k": 4, "years": 1, "U": 2, "S": 3, "P": 0, "mag": 5}, "routine": {"k": 10, "years": 1, "U": 3, "S": 3, "P": 1, "mag": 7}, "wellbeing": {"k": 7, "years": 1, "U": 1, "S": 1, "P": 1, "mag": 3}, "simplify": {"k": 2, "years": 1, "U": 3, "S": 3, "P": 0, "mag": 6}, "price": {"k": 5, "years": 1, "U": 1, "S": 1, "P": 1, "mag": 3}, "taste": {"k": 6, "years": 1, "U": 0, "S": 0, "P": 1, "mag": 1}, "proof": {"k": 5, "years": 1, "U": 0, "S": 1, "P": 1, "mag": 2}, "gut": {"k": 3, "years": 1, "U": 2, "S": 2, "P": 0, "mag": 4}}}, "FOOL": {"rows": [["2026-10-10", "Good customer service", "svc"], ["2026-10-06", "They are selling from December 2025 as a great new special report! Frauds?", "trust"], ["2026-10-01", "Mostly Clickbait. I'm getting very annoyed at all their advertisements and articles.", "noise"], ["2026-09-30", "Used to be a great, focussed service but now there is too much AI generated content", "quality"], ["2026-09-26", "Dont waste your money.. annual fee straight up with auto renew as standard.", "billing"], ["2026-09-26", "If you brought the basic package they try to upsell a more expensive one.", "upsell"], ["2026-09-17", "they are still out here tricking people into believing they are making good decisions with their investments", "trust"], ["2026-08-30", "Motley Fool taught me to stay out of the stock market.", "returns"], ["2026-08-25", "Worse than useless", "returns"], ["2026-08-23", "Very sales-driven. Lots of hype and FOMO.", "noise"], ["2026-08-18", "Receiving emails with cross and upselling, no way you can end membership online in the portal.", "upsell"], ["2026-08-18", "Not one recommendation of stocks that I bought have been successful.", "returns"], ["2026-08-14", "All 4 recommendations I bought shares in completely bombed.", "returns"], ["2026-08-09", "A lot of their articles feel overly promotional, as if the primary objective is to sell their own subscriptions", "noise"], ["2026-08-08", "Subscription for $149 gives information, but nothing deep or executional unless you pay more, much more.", "upsell"], ["2026-08-07", "Absolutely shocked at how poor their advice has been.", "returns"], ["2026-08-02", "Buying the recommended minimum of 25 of their recommendations, makes it impossible to manage properly", "simplicity"], ["2026-07-29", "Motley Fool used to be good until covid in 2020.", "quality"], ["2026-07-29", "Today it is just an advertising company which wants to upsell you to another, even more expensive", "upsell"], ["2026-07-28", "Sound great up front, but realistically is a platform to upsell to extra services.", "upsell"], ["2026-07-24", "Almost all their proposed stocks are going really bad.", "returns"], ["2026-07-23", "Well, I was forwarded 5 'strong' recommendations, diversity of course and 100k turns into 19k.", "returns"], ["2026-02-11", "A few winners capture all the upside and they market them aggressively", "returns"], ["2026-02-06", "Bait. Oh, wait. Must upgrade.", "upsell"], ["2026-01-16", "I've thought about buying a Motley Fool membership for a while and finally bought early this year.", "returns"], ["2026-07-28", "I joined motley fool for advice, share picks, and general information.", "picks"], ["2026-04-09", "I have been a loyal and grateful subscriber of their premium services for 21 years and counting.", "returns"], ["2026-01-21", "The request for a refund was handled caringly and with such speed", "svc"], ["2025-09-03", "Rolls Royce returned over 500%", "returns"], ["2025-06-09", "they have responded with a full refund.", "svc"], ["2025-05-19", "I was offered a discount for the first year, which I took.", "svc"], ["2024-12-29", "Looking at their recommended stock picks from 2018 thru now I see 110 winners and 58 losers.", "returns"], ["2024-07-22", "I've been satisfied with Motley Fool having been a member for a couple years now.", "returns"], ["2024-07-06", "They immediately fix the issue", "svc"], ["2024-06-30", "My portfolio has had a 22% return over the past year, using only recommendations from Motley Fool.", "returns"], ["2024-06-30", "I bought Nvidia stock in 2020", "returns"], ["2024-06-24", "I appreciate the new pre-market open newsletter.", "picks"], ["2024-06-24", "Recommendations were spot on!", "returns"], ["2024-06-22", "A wealth of information that's helpful", "learn"], ["2024-06-22", "I'm doing fantastic 14.5% average the past 5 years.", "returns"], ["2024-06-20", "The Motley Fool has greatly assisted with educating me about the securities industry.", "learn"], ["2026-07-22", "I subscribed to the entry level hoping to learn about interpreting financials", "learn"], ["2026-07-19", "I started investing during the pandemic, and had limited experience, so I went with TMF because they had a good record.", "picks"], ["2026-07-19", "I lost about 100K; I wish I could sue them.", "returns"], ["2026-07-16", "all I wanted to do is learn about what stocks to buy.", "picks"], ["2026-07-13", "I initially clicked on one of this company's offers for a name of a hot opportunity", "picks"], ["2026-07-12", "Finally filed dispute with my credit card.", "billing"], ["2026-07-02", "90% of their suggested stocks lost massivly and never recovered.", "returns"], ["2026-06-27", "They don't Inform you when your auto renewal Is coming up either.", "billing"], ["2026-06-25", "You're riches are just another couple grand away... just upgrade so you can get their inside scoop", "upsell"], ["2026-06-24", "Once I was committed for 1- year subscription with this company, the MF relays on constant up selling!", "upsell"], ["2026-06-17", "every investment I made from their advice on the Hemp industry gave me negative results", "returns"], ["2026-06-12", "Impossible to get a refund.", "billing"], ["2026-06-03", "I wasted almost $1500 on their Epic Plus service.", "returns"], ["2026-06-02", "Don't get Motley Fooled it's a legalized Bait & Switch operation.", "upsell"], ["2026-05-28", "I missed out on some great suggestions instead of being a part of it.", "picks"], ["2026-05-08", "this company publishes what's good for them for whatever reason, not what is relevant and helpful.", "trust"], ["2026-05-06", "Some of their recommandations are down big time.", "returns"], ["2026-05-06", "What I'm really trying to find is a more raw, analysis-focused platform.", "learn"], ["2026-04-29", "I expected periodic stock recommendations with a well though out basis. I received marketing blasts daily.", "noise"], ["2026-04-24", "It is very difficult to find where to cancel your subscription.", "billing"], ["2026-04-23", "I've been paying attention to Motley Fool stock purchase information for about 6 years.", "picks"], ["2026-04-17", "NOTE: there is NO way to stop auto renewal online.", "billing"], ["2026-04-16", "I lost a lot of money investing in their picks. Never again.", "returns"], ["2026-03-30", "Entered my email address and in about 45 minutes I received at least a dozen spam emails.", "noise"], ["2026-03-26", "After signing up i came to know if you want better stock recommendation you need to pay for a higher tier.", "upsell"], ["2026-03-21", "Years ago, MF was an in depth stock advisor.", "quality"], ["2026-03-16", "Most of the stocks that they recommended failed big time, and I lost a lot of money on them.", "returns"], ["2026-03-15", "They keep trying to SELL you the gold pot at the end of the rainbow!!!", "upsell"], ["2026-03-09", "Quickly pushes buy ratings multiple times (14 times) for TTD at 80 or above without providing caution,", "returns"], ["2026-01-22", "Turned from a somewhat good newsletter like site to a chatgpt generated shitpost thing.", "quality"], ["2026-01-19", "They double the subscription price, disguise the renewal notice as just another of their daily spam emails", "billing"], ["2026-01-16", "Some recommendations may work for certain investors, but I didn't find it worth the subscription cost,", "returns"], ["2026-01-14", "Several months later I check and it never canceled the trial.", "billing"], ["2026-01-12", "A lot of time and money was wasted with this organization", "returns"], ["2026-01-12", "its a teaser, you can't actually get the info without upgrading your membership.", "upsell"], ["2026-01-10", "Motley Fool makes promises it can't deliver fully unless more money is spent to upgrade.", "upsell"], ["2026-01-09", "I'm in for 2 years and if I could cancel with partial refund I would be all in.", "billing"], ["2026-01-08", "Motley Fool has a terrible track record for the past 5 years.", "returns"], ["2026-01-05", "I signed up for The Motley Fool thinking I was getting elite stock research.", "picks"], ["2025-12-16", "I like the information but it does not necessarily translate into the best returns.", "returns"], ["2025-12-16", "Too many super offers of 'super stocks' about which you will get information if you pay extra.", "upsell"]], "expected": {"svc": {"k": 5, "years": 3, "U": 1, "S": 2, "P": 1, "mag": 4}, "trust": {"k": 3, "years": 1, "U": 0, "S": 2, "P": 0, "mag": 2}, "noise": {"k": 5, "years": 1, "U": 1, "S": 0, "P": 1, "mag": 2}, "quality": {"k": 4, "years": 1, "U": 2, "S": 3, "P": 0, "mag": 5}, "billing": {"k": 9, "years": 1, "U": 2, "S": 1, "P": 1, "mag": 4}, "upsell": {"k": 14, "years": 2, "U": 1, "S": 1, "P": 2, "mag": 4}, "returns": {"k": 29, "years": 3, "U": 2, "S": 2, "P": 3, "mag": 7}, "simplicity": {"k": 1, "years": 1, "U": 3, "S": 0, "P": 0, "mag": 3}, "picks": {"k": 8, "years": 2, "U": 1, "S": 1, "P": 1, "mag": 3}, "learn": {"k": 4, "years": 2, "U": 0, "S": 1, "P": 0, "mag": 1}}}, "CLICKUP": {"rows": [["2026-10-04", "I really love using ClickUp, it boosted my organization.", "organize"], ["2026-05-12", "Great support and community! But there are areas that need improvement and they have been overlooked for a while.", "quality"], ["2026-08-04", "It simplifies a lot of daily tasks, provides a better overview of what needs to be done", "overview"], ["2026-07-14", "The best tool to easily track tasks and collaborate with team members.", "collab"], ["2026-07-01", "Brain helped me turn rough notes and tricky situations into clear, ready to send messages for staff", "ai"], ["2026-10-21", "Be CAREFUL choosing an annual plan with them as these conditions can make it an expensive mistake", "billing"], ["2026-10-19", "ClickUp is one of the best project management tools I've ever used.", "organize"], ["2026-10-07", "ClickUp has transformed how we manage operations by centralizing project tracking and SOP documentation.", "consolidate"], ["2026-09-29", "Our team remains locked out of our work and client information, creating serious disruption to our daily operations.", "reliability"], ["2026-10-03", "The mobile app is the real win for me: when something changes while I'm out of the office, I log it on my phone", "organize"], ["2026-09-30", "I love how it has basically replaced most of the other apps i used like slack, notion, loom etc.", "consolidate"], ["2026-10-02", "I use ClickUp every day and I love it - it keeps me organized and on track!", "organize"], ["2026-10-02", "clickup is all in one", "consolidate"], ["2026-10-02", "it has significantly improved the visibility and organization of our work.", "overview"], ["2026-10-02", "Once you exceed that limit, problems start — in our case, Chat stopped working.", "reliability"], ["2026-09-27", "After changing different services we stopped it and it's the best", "consolidate"], ["2026-09-24", "the interface can feel heavy and slow at times, and there are so many features", "complexity"], ["2026-09-08", "ClickUp has become a really useful part of my workflow.", "organize"], ["2026-09-23", "ClickUp helped streamline my processes.", "organize"], ["2026-09-23", "The mcp integration with claude makes life much easier", "ai"], ["2026-09-23", "The platform can feel a little complex when you start using the more advanced features", "complexity"], ["2026-10-04", "The only downside is that is is a bit pricy, when it comes to business", "price"], ["2026-09-23", "I have never seen any other project management tool that has everything that i need!!", "consolidate"], ["2026-09-23", "Clickup has been such a valuable tool for our business.", "organize"], ["2026-09-23", "It helps keep all teams and all info accessible and in one place.", "consolidate"], ["2026-09-21", "There's definitely a lot to explore, and it can feel like a lot at first", "complexity"], ["2026-09-21", "Before using it, keeping track of moving parts, deadlines, and daily tasks across different projects felt scattered.", "overview"], ["2026-09-19", "ClickUp is an amazing task app with second to none AI integration.", "ai"], ["2026-09-19", "It took a little time to set everything up, but once I did, it made managing deadlines and projects much easier.", "overview"], ["2026-09-18", "Our company successfully pipelined all its work flows directly in one tool", "consolidate"], ["2026-09-17", "Out of many tools I used Clickup is the only one I sticked with and use constantly.", "consolidate"], ["2026-09-16", "the new AI features make it a perfect fit for our org now and as we scale.", "ai"], ["2026-09-16", "It makes my job easier every single day.", "organize"], ["2026-09-16", "Everything is in one place, so it's simple to track tasks, deadlines, and projects without jumping between different apps.", "consolidate"], ["2026-09-16", "ClickUp has made it much easier to keep our projects, tasks, and team organized in one place.", "consolidate"], ["2026-09-13", "Nothing wrong with the product, i just hate that when you try and cancel your subscription you literally get a million", "billing"], ["2026-09-10", "Big task trees can bog down a bit when the servers are getting hammered during midday hours.", "reliability"], ["2026-09-08", "ClickUp has made things so much easier for our business and continues to do so with their new features and integrations!", "organize"], ["2026-09-08", "I'm using agents to tell me what I should be working on from my email.", "ai"], ["2026-09-07", "it can save a lot of time and reduce the need to switch between different tools.", "consolidate"], ["2026-09-07", "Been using clickup for more than 3 years now, to be honest it is saving me a lot of time and it is easy to use.", "time"], ["2026-09-07", "you can literally replace all your communication, management, team and product management tools with Clickup.", "consolidate"], ["2026-09-05", "It's like having a sharp teammate available 24/7 who actually knows my workspace and what I'm working on.", "ai"], ["2026-09-05", "I've been using ClickUp since 2020, both for my own work and with clients.", "organize"], ["2026-09-02", "gives me answers and summaries I'd normally spend 20+ minutes compiling myself.", "time"], ["2026-10-21", "Everything about account management is manual.", "billing"], ["2026-10-05", "we received little to no response.", "support"], ["2026-08-13", "Total shit plattform, way to complex", "complexity"], ["2026-08-11", "they shut my account off and did not respond to my emails and messages for 10+ days", "reliability"], ["2026-07-27", "dont accept trash support or trash followup from small business.", "support"], ["2026-07-20", "they care too much about their release schedule and new features than they do about shipping quality work.", "quality"], ["2026-07-14", "Replies for important messages where delayed for up to a month", "support"], ["2026-07-08", "rejected my refund request.", "billing"], ["2026-06-22", "Today, the feature has completely disappeared for both me and my team", "reliability"], ["2026-06-19", "resulted in a $216.00 charge that I had to get reversed.", "billing"], ["2026-06-11", "ClickUp hides the fact that almost all features have limited use in the free services.", "billing"], ["2026-06-10", "ClickUp charged me $600+ in the span of 2 months because I was using the wrong email to log in.", "billing"], ["2026-05-22", "I'd like to see clearer evidence that AI adoption is improving the product for customers", "quality"], ["2026-05-19", "So bad, absolute nightmare from UX perspective.", "complexity"], ["2026-05-16", "clickup.com keeps making my laptop crashed.", "reliability"], ["2026-05-15", "hard to get straight answers", "support"], ["2026-05-12", "When we flagged these billing discrepancies, it took over weeks to receive a reply.", "support"]], "expected": {"organize": {"k": 10, "years": 1, "U": 1, "S": 1, "P": 2, "mag": 4}, "quality": {"k": 3, "years": 1, "U": 2, "S": 2, "P": 0, "mag": 4}, "overview": {"k": 4, "years": 1, "U": 3, "S": 0, "P": 1, "mag": 4}, "collab": {"k": 1, "years": 1, "U": 0, "S": 0, "P": 0, "mag": 0}, "ai": {"k": 6, "years": 1, "U": 1, "S": 0, "P": 1, "mag": 2}, "billing": {"k": 7, "years": 1, "U": 0, "S": 1, "P": 1, "mag": 2}, "consolidate": {"k": 12, "years": 1, "U": 1, "S": 0, "P": 2, "mag": 3}, "reliability": {"k": 6, "years": 1, "U": 2, "S": 0, "P": 1, "mag": 3}, "complexity": {"k": 5, "years": 1, "U": 1, "S": 0, "P": 1, "mag": 2}, "price": {"k": 1, "years": 1, "U": 0, "S": 0, "P": 0, "mag": 0}, "time": {"k": 2, "years": 1, "U": 3, "S": 3, "P": 0, "mag": 6}, "support": {"k": 5, "years": 1, "U": 0, "S": 1, "P": 1, "mag": 2}}}}, "markers": {"AG1": [[true, false], [false, false], [false, true], [false, false], [false, true], [true, false], [false, false], [false, false], [false, true], [false, false], [true, true], [true, false], [false, false], [false, false], [false, false], [false, true], [false, false], [true, true], [true, false], [false, false], [false, false], [true, true], [false, false], [false, false], [false, false], [true, false], [false, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, true], [true, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, true], [true, false], [true, true], [true, true], [false, false], [false, false], [false, false], [false, false], [true, true], [false, false], [false, false], [false, false], [true, true], [true, true], [true, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, true], [false, true], [false, false], [false, false], [false, false], [false, false], [false, false], [true, true], [false, false], [false, false], [false, true], [false, false], [false, false], [false, true], [false, true], [true, true], [true, false], [true, true], [true, true], [false, false], [false, true], [false, false]], "FOOL": [[false, false], [false, false], [false, false], [true, true], [false, false], [false, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, false], [true, false], [true, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, true], [false, false], [false, true], [false, false], [false, false], [false, false], [false, true], [true, false], [true, true], [true, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, true], [false, false], [false, false], [false, false], [true, false], [false, false], [false, false], [true, false], [true, false], [false, false], [false, false], [false, true], [false, false], [true, false], [true, false], [false, false], [true, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, true], [false, false], [true, true], [false, false], [true, false], [false, true], [true, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, true], [true, false], [true, false], [true, false], [false, true], [false, true], [false, false], [false, false], [false, false]], "CLICKUP": [[false, false], [true, true], [true, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, false], [true, true], [false, false], [false, false], [true, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, false], [false, false], [true, false], [false, false], [false, false], [false, false], [false, true], [true, false], [true, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [true, false], [true, true], [false, false], [false, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, false], [false, true], [false, false], [false, false], [false, false], [false, false], [false, true], [false, false], [true, false], [false, false], [false, false], [false, false]]}} as {
  corpora: Record<string, { rows: Row[]; expected: Record<string, Expected> }>;
  markers: Record<string, [boolean, boolean][]>;
};

function toVerbatims(rows: Row[]): VerbatimLike[] {
  return rows.map(([date, text, cluster], i) => ({ id: `V${i + 1}`, text, desire_cluster: cluster, date }));
}

/* ---------------------------------------------------------------- markers and magnitude */

Deno.test("markers: the ported lexicons match the Python on every corpus row", () => {
  for (const [name, corpus] of Object.entries(FIXTURE.corpora)) {
    corpus.rows.forEach(([, text], i) => {
      const [urg, stay] = FIXTURE.markers[name][i];
      assertEquals(URGENCY_MARKERS.test(text), urg, `${name} row ${i} urgency: ${text}`);
      assertEquals(STAYING_MARKERS.test(text), stay, `${name} row ${i} staying: ${text}`);
    });
  }
});

Deno.test("magnitude: reproduces magnitude.py bands for AG1, Motley Fool and ClickUp", () => {
  for (const [name, corpus] of Object.entries(FIXTURE.corpora)) {
    const table = computeClusterTable(toVerbatims(corpus.rows), { useModelMarkers: false });
    assertEquals(table.length, Object.keys(corpus.expected).length, `${name}: cluster count`);
    for (const [cluster, exp] of Object.entries(corpus.expected)) {
      const got = findCluster(table, cluster);
      assert(got, `${name}: cluster ${cluster} missing`);
      assertEquals(
        { k: got.k, years: got.distinct_years, U: got.c1, S: got.c2, P: got.c3, mag: got.magnitude },
        exp,
        `${name}: ${cluster}`,
      );
      assertEquals(got.n, corpus.rows.length);
    }
  }
});

Deno.test("magnitude: the documented examples from the research doc", () => {
  const ag1 = computeClusterTable(toVerbatims(FIXTURE.corpora.AG1.rows), { useModelMarkers: false });
  const energy = findCluster(ag1, "energy")!;
  assertEquals([energy.k, energy.magnitude], [13, 5]); // "Steady energy without coffee" (13 verbatims) passes desire
  const simplify = findCluster(ag1, "simplify")!;
  assertEquals([simplify.k, simplify.magnitude], [2, 6]); // "replace my supplements" at two verbatims: provisional
  const fool = computeClusterTable(toVerbatims(FIXTURE.corpora.FOOL.rows), { useModelMarkers: false });
  const returns = findCluster(fool, "returns")!;
  assertEquals([returns.k, returns.distinct_years, returns.c2, returns.magnitude], [29, 3, 2, 7]);
  // table ordering: largest cluster first
  assertEquals(ag1[0].cluster, "svc");
});

Deno.test("band: cut edges are inclusive", () => {
  assertEquals(band(9.99, [10, 25, 50]), 0);
  assertEquals(band(10, [10, 25, 50]), 1);
  assertEquals(band(25, [10, 25, 50]), 2);
  assertEquals(band(50, [10, 25, 50]), 3);
  assertEquals(band(100, [10, 25, 50]), 3);
});

Deno.test("yearOf: reads a year out of free-form dates", () => {
  assertEquals(yearOf("2026-10-21"), "2026");
  assertEquals(yearOf("Mar 2025"), "2025");
  assertEquals(yearOf("since 2019, really"), "2019");
  assertEquals(yearOf("yesterday"), null);
  assertEquals(yearOf(null), null);
  assertEquals(yearOf(""), null);
});

Deno.test("magnitude: distinct years lift staying power when the duration share does not", () => {
  const vs: VerbatimLike[] = ["2024-01-01", "2025-02-02", "2026-03-03", "2026-04-04", "2026-05-05"].map((date, i) => ({
    id: `V${i}`,
    text: "fine product",
    desire_cluster: "calm",
    date,
  }));
  const [row] = computeClusterTable(vs);
  assertEquals(row.staying_pct, 0);
  assertEquals(row.distinct_years, 3);
  assertEquals(row.c2, 2); // band(3, [2,3,4])
  assertEquals(row.c3, 3); // 100% prevalence
});

Deno.test("magnitude: model markers count by default and can be switched off", () => {
  const vs: VerbatimLike[] = [
    { id: "a", text: "it works", desire_cluster: "x", date: null, intensity_marker: true, duration_marker: true },
    { id: "b", text: "it works", desire_cluster: "x", date: null, intensity_marker: false, duration_marker: false },
  ];
  const [withTags] = computeClusterTable(vs);
  assertEquals([withTags.urgency_pct, withTags.staying_pct, withTags.c1, withTags.c2], [50, 50, 3, 3]);
  const [lexiconOnly] = computeClusterTable(vs, { useModelMarkers: false });
  assertEquals([lexiconOnly.c1, lexiconOnly.c2], [0, 0]);
});

Deno.test("magnitude: verbatims without a cluster count toward n only; cluster names normalize", () => {
  const vs: VerbatimLike[] = [
    { id: "1", text: "x", desire_cluster: "Steady_Energy ", date: null },
    { id: "2", text: "x", desire_cluster: "steady energy", date: null },
    { id: "3", text: "x", desire_cluster: null, date: null },
    { id: "4", text: "x", desire_cluster: "   ", date: null },
  ];
  const table = computeClusterTable(vs);
  assertEquals(table.length, 1);
  assertEquals(table[0].cluster, "steady energy");
  assertEquals(table[0].k, 2);
  assertEquals(table[0].n, 4);
  assertEquals(table[0].prevalence_pct, 50);
  assertEquals(normalizeCluster("Steady-Energy"), "steady energy");
  assert(findCluster(table, "STEADY-ENERGY"));
  assertEquals(findCluster(table, "mood"), undefined);
  const rendered = renderClusterTable(table);
  assertStringIncludes(rendered, "steady energy | 2 | 50 |");
  assertStringIncludes(renderClusterTable([]), "no verbatim carries a desire_cluster");
});

/* ---------------------------------------------------------------- gates */

Deno.test("desire gate: pass, provisional, fail, unknown cluster", () => {
  const ag1 = computeClusterTable(toVerbatims(FIXTURE.corpora.AG1.rows), { useModelMarkers: false });
  assertEquals(desireGate(findCluster(ag1, "routine")).status, "pass"); // 7/9, k=10
  assertEquals(desireGate(findCluster(ag1, "energy")).status, "pass"); // 5/9, k=13
  const simplify = desireGate(findCluster(ag1, "simplify")); // 6/9, k=2
  assertEquals(simplify.status, "provisional");
  assertStringIncludes(simplify.reason, "k < 5");
  const taste = desireGate(findCluster(ag1, "taste")); // 1/9
  assertEquals(taste.status, "fail");
  assertEquals(taste.magnitude, 1);
  const none = desireGate(undefined);
  assertEquals([none.status, none.k, none.magnitude], ["fail", 0, 0]);
  const gut = desireGate(findCluster(ag1, "gut")); // 4/9 exactly, k=3
  assertEquals(gut.status, "provisional");
});

const claim = (id: string, claim_type: string, evidence_grade: string | null = null, extra: Partial<LedgerClaimLike> = {}): LedgerClaimLike => ({
  id,
  claim_type,
  evidence_grade,
  status: "unverified",
  user_decision: null,
  ...extra,
});

Deno.test("carrierValue: seller facts, graded facts, testimonials, nothing", () => {
  assertEquals(carrierValue(claim("g", "guarantee")), 2);
  assertEquals(carrierValue(claim("p", "price_discount")), 2);
  assertEquals(carrierValue(claim("f", "feature", "F")), 2);
  assertEquals(carrierValue(claim("s", "statistic", "B")), 2);
  assertEquals(carrierValue(claim("s", "statistic", "C")), 2);
  assertEquals(carrierValue(claim("s", "statistic", "D")), 1);
  assertEquals(carrierValue(claim("s", "statistic", "E")), 1);
  assertEquals(carrierValue(claim("s", "statistic", null)), 1);
  assertEquals(carrierValue(claim("s", "benefit", "F")), 0);
  assertEquals(carrierValue(claim("t", "results_testimonial", "E")), 1);
  assertEquals(carrierValue(claim("x", "expert_endorsement")), 1);
  assertEquals(carrierValue(claim("v", "vague_superlative")), 0);
  assertEquals(carrierValue(claim("o", "opportunity_characterization")), 0);
  assertEquals(carrierValue(claim("g", "guarantee", null, { user_decision: "drop" })), 0);
  assertEquals(carrierValue(claim("s", "statistic", "A", { status: "flagged" })), 2); // flagged rows are usable
});

Deno.test("proof gate: the best carrier among the refs decides; unknown refs are ignored and listed", () => {
  const ledger = [
    claim("stat-b", "statistic", "B"),
    claim("testi", "results_testimonial", "E"),
    claim("guar", "guarantee"),
    claim("lab", "mechanism", "D"),
    claim("dropped", "statistic", "A", { user_decision: "drop" }),
  ];
  const none = proofGate([], ledger);
  assertEquals([none.status, none.c9], ["fail", 0]);
  const testimonialOnly = proofGate(["testi"], ledger);
  assertEquals([testimonialOnly.status, testimonialOnly.c9], ["fail", 1]);
  assertStringIncludes(testimonialOnly.reason, "testimonials");
  const labOnly = proofGate(["lab"], ledger);
  assertEquals([labOnly.status, labOnly.c9], ["fail", 1]);
  const fact = proofGate(["testi", "stat-b"], ledger);
  assertEquals([fact.status, fact.c9], ["pass", 2]);
  assertEquals(fact.carrier_ids, ["testi", "stat-b"]);
  const inline = proofGate(["[[L:guar]]"], ledger);
  assertEquals([inline.status, inline.c9], ["pass", 2]);
  const dropped = proofGate(["dropped"], ledger);
  assertEquals([dropped.status, dropped.c9], ["fail", 0]);
  const unknown = proofGate(["nope", "stat-b", "stat-b"], ledger);
  assertEquals(unknown.unknown_refs, ["nope"]);
  assertEquals(unknown.status, "pass");
  assertStringIncludes(unknown.reason, "nope");
  assertEquals(ledgerIdOf(" [[L:abc-123]] "), "abc-123");
  assertEquals(ledgerIdOf("abc-123"), "abc-123");
});

/* ---------------------------------------------------------------- weighting, ranking, tie-breaks, thesis */

const allThrees = Object.fromEntries(["C4", "C5", "C6", "C7", "C8", "C9", "C10", "C11", "C12", "C13", "C14"].map((c) => [c, 3]));

Deno.test("weighting: full scores reach 57; computed dimensions override judged ones; unjudged are 0", () => {
  const full = buildScores({ c1: 3, c2: 3, c3: 3, c9: 3 }, allThrees);
  assertEquals(weightedTotal(full), 57);
  assertEquals(MAX_WEIGHTED, 57);
  const overridden = buildScores({ c1: 1, c2: 2, c3: 0, c9: 2 }, { ...allThrees, C1: 3, C9: 3 });
  assertEquals([overridden.C1, overridden.C2, overridden.C3, overridden.C9], [1, 2, 0, 2]);
  const bare = buildScores({ c1: 2, c2: 2, c3: 1, c9: 1 });
  assertEquals(weightedTotal(bare), 2 * 2 + 2 * 2 + 2 * 1 + 2 * 1); // weights 2 on C1-C3 and C9
  const clamped = buildScores({ c1: 7, c2: -1, c3: 1.6, c9: 2 }, { C4: 9, C5: 2.4 });
  assertEquals([clamped.C1, clamped.C2, clamped.C3, clamped.C4, clamped.C5], [3, 0, 2, 3, 2]);
});

function rankable(id: string, total: number, c9: number, c3: number, c14: number, desire: Rankable["desire"] = "pass"): Rankable {
  const scores = buildScores({ c1: 0, c2: 0, c3, c9 }, { C14: c14 });
  return { id, scores, weighted_total: total, desire };
}

Deno.test("ranking: total first, then C9, then C3, then C14, then a full desire pass, then id", () => {
  const items = [
    rankable("low", 20, 3, 3, 3),
    rankable("tie-c9-2", 30, 2, 3, 3),
    rankable("tie-c9-3", 30, 3, 0, 0),
    rankable("c3-wins", 25, 2, 3, 0),
    rankable("c3-loses", 25, 2, 2, 3),
    rankable("c14-wins", 24, 2, 2, 3),
    rankable("c14-loses", 24, 2, 2, 2),
    rankable("prov", 22, 2, 2, 2, "provisional"),
    rankable("pass", 22, 2, 2, 2),
    rankable("idB", 21, 2, 2, 2),
    rankable("idA", 21, 2, 2, 2),
  ];
  assertEquals(
    rankCandidates(items).map((x) => x.id),
    ["tie-c9-3", "tie-c9-2", "c3-wins", "c3-loses", "c14-wins", "c14-loses", "pass", "prov", "idA", "idB", "low"],
  );
});

Deno.test("tie-break note: names the deciding criterion, or presents both", () => {
  assertEquals(describeTieBreak([rankable("a", 30, 3, 3, 3), rankable("b", 29, 3, 3, 3)]), null);
  assertEquals(describeTieBreak([rankable("a", 30, 3, 3, 3)]), null);
  assertStringIncludes(describeTieBreak(rankCandidates([rankable("a", 30, 3, 0, 0), rankable("b", 30, 2, 3, 3)]))!, "broken on C9 (3 vs 2)");
  assertStringIncludes(describeTieBreak(rankCandidates([rankable("a", 30, 2, 1, 0), rankable("b", 30, 2, 2, 0)]))!, "broken on C3 (2 vs 1)");
  assertStringIncludes(describeTieBreak(rankCandidates([rankable("a", 30, 2, 2, 1), rankable("b", 30, 2, 2, 2)]))!, "broken on C14 (2 vs 1)");
  const still = describeTieBreak(rankCandidates([rankable("b", 30, 2, 2, 2), rankable("a", 30, 2, 2, 2)]))!;
  assertStringIncludes(still, "Still tied");
  assertStringIncludes(still, "Both are presented");
  const prov = describeTieBreak(rankCandidates([rankable("p", 30, 2, 2, 2, "provisional"), rankable("q", 30, 2, 2, 2)]))!;
  assertStringIncludes(prov, "full desire pass");
});

Deno.test("finalists: three at most, the winner first, the rest kept as losers", () => {
  const five = ["a", "b", "c", "d", "e"].map((id) => ({ id }));
  assertEquals(pickFinalists(five), { finalistIds: ["a", "b", "c"], winnerId: "a", loserIds: ["b", "c"] });
  assertEquals(pickFinalists(five.slice(0, 2)), { finalistIds: ["a", "b"], winnerId: "a", loserIds: ["b"] });
  assertEquals(pickFinalists([]), { finalistIds: [], winnerId: null, loserIds: [] });
});

Deno.test("thesis: the exact form of Section 1, rule 1", () => {
  const t = composeThesis({
    mechanism: "a 60-second morning habit that replaces ten supplements.",
    promise: " steady energy without coffee ",
    reader: "a 40-something professional who skips breakfast",
    carrier: "the 90-day denominated guarantee [[L:guar]]",
  });
  assertEquals(
    t,
    "This draft exists to prove that a 60-second morning habit that replaces ten supplements is a different and superior way to get steady energy without coffee for a 40-something professional who skips breakfast, and the proof is the 90-day denominated guarantee [[L:guar]].",
  );
  assertStringIncludes(THESIS_TEMPLATE, "[mechanism]");
  const blank = composeThesis({ mechanism: "", promise: "x", reader: "y", carrier: "z" });
  assertStringIncludes(blank, "prove that [mechanism] is");
});

/* ---------------------------------------------------------------- candidates, exclusions */

function candidate(id: string, over: Partial<CandidateT> = {}): CandidateT {
  return {
    id,
    core_desire: "energy that lasts",
    cluster: "energy",
    k: 99,
    promise: `promise ${id}`,
    mechanism: `mechanism ${id}`,
    big_idea: `big idea ${id}`,
    lead_verbatim_id: null,
    belief_to_displace: "coffee is the only fix",
    proof_asset: "none in the ledger",
    proof_ledger_refs: [],
    search_origin: "verbatim",
    ...over,
  };
}

Deno.test("exclusions: options and prior angles resolve to promises; matching ignores case and punctuation", () => {
  const ex = readExclusions(
    { exclude_angle_ids: ["ang-1", "ang-missing"], exclude_promises: ["Steady energy, without coffee."] },
    [{ id: "ang-1", candidate: { promise: "replace ten supplements", big_idea: "One scoop, ten bottles gone" } }],
  );
  assertEquals(ex.angleIds, ["ang-1", "ang-missing"]);
  assertEquals(new Set(ex.promises), new Set(["Steady energy, without coffee.", "replace ten supplements", "One scoop, ten bottles gone"]));
  assert(isExcluded(candidate("x", { promise: "steady energy without coffee" }), ex));
  assert(isExcluded(candidate("x", { promise: "other", big_idea: "one scoop ten bottles gone!" }), ex));
  assert(!isExcluded(candidate("x", { promise: "calmer mornings" }), ex));
  assertEquals(readExclusions(null), { promises: [], angleIds: [] });
  assertEquals(readExclusions({ exclude_promises: "not a list" }), { promises: [], angleIds: [] });
  assertEquals(normalizeText("  “Finally!”  energy…  "), "finally energy");
});

Deno.test("normalizeCandidates: ids reassigned, k recomputed, cluster snapped, excluded and duplicate promises dropped", () => {
  const table = computeClusterTable(toVerbatims(FIXTURE.corpora.AG1.rows), { useModelMarkers: false });
  const ex = readExclusions({ exclude_promises: ["banned promise"] });
  const raw = [
    candidate("whatever", { cluster: "Energy", k: 5, proof_ledger_refs: [" a ", "a", "", "b"] }),
    candidate("x", { promise: "banned promise" }),
    candidate("y", { cluster: "ROUTINE ", promise: "Promise whatever." }), // duplicate of the first after normalization
    candidate("z", { cluster: "nonexistent cluster", k: 12 }),
  ];
  const { candidates, dropped } = normalizeCandidates(raw, table, ex);
  assertEquals(candidates.map((c) => c.id), ["A01", "A04"]);
  assertEquals(candidates[0].cluster, "energy");
  assertEquals(candidates[0].k, 13);
  assertEquals(candidates[0].proof_ledger_refs, ["a", "b"]);
  assertEquals(candidates[1].cluster, "nonexistent cluster");
  assertEquals(candidates[1].k, 0);
  assertEquals(dropped.map((d) => d.id), ["A02", "A03"]);
  assertStringIncludes(dropped[0].reason, "excluded");
  assertStringIncludes(dropped[1].reason, "duplicate");
});

/* ---------------------------------------------------------------- assembly */

const LEDGER: LedgerClaimLike[] = [
  claim("guar", "guarantee"),
  claim("stat-b", "statistic", "B"),
  claim("testi", "results_testimonial", "E"),
];

function ag1Gated(cands: CandidateT[]) {
  const table = computeClusterTable(toVerbatims(FIXTURE.corpora.AG1.rows), { useModelMarkers: false });
  return gateCandidates(cands, table, LEDGER);
}

Deno.test("assembly: gates, merged scores, finalists, winner, losers, thesis and angles", () => {
  const cands = [
    candidate("A01", { cluster: "routine", proof_ledger_refs: ["guar"], promise: "a routine that holds", mechanism: "one 60-second habit", proof_asset: "the guarantee [[L:guar]]" }),
    candidate("A02", { cluster: "energy", proof_ledger_refs: ["testi"] }), // desire pass, proof fail (testimonial only)
    candidate("A03", { cluster: "simplify", proof_ledger_refs: ["stat-b"] }), // provisional desire, proof pass
    candidate("A04", { cluster: "taste", proof_ledger_refs: ["guar"] }), // desire fail
    candidate("A05", { cluster: "routine", proof_ledger_refs: ["stat-b"] }), // survivor, demoted by the scorer on coverage
    candidate("A06", { cluster: "energy", proof_ledger_refs: ["stat-b"] }), // survivor, scored
  ];
  const gated = ag1Gated(cands);
  assertEquals(gated.map(isSurvivor), [true, false, true, false, true, true]);
  const judged = indexJudged(
    ScoringOutput.parse({
      scored: [
        { id: "A01", scores: { ...allThrees, C9: 3 }, rationale: "same object [[L:guar]]" },
        { id: "A03", scores: { ...allThrees, C9: 2, C14: 1 }, rationale: "covers most" },
        { id: "A05", scores: { ...allThrees, C9: 1 }, rationale: "the stat does not cover the promise" },
        { id: " A06 ", scores: { ...allThrees, C9: 2, C4: 1, C12: 1 }, rationale: "fits with caveat" },
      ],
    }),
  );
  const asm = assembleArgument({ gated, judged, reader: "a reader" });
  assertEquals(asm.noSurvivors, false);
  assertEquals(asm.survivorIds, ["A01", "A03", "A05", "A06"]);
  const out = asm.output;
  assertEquals(out.winner_id, "A01");
  assertEquals(out.finalist_ids, ["A01", "A06", "A03"]);
  assertEquals(out.losers_kept_ids, ["A06", "A03"]);
  assertEquals(
    out.thesis,
    "This draft exists to prove that one 60-second habit is a different and superior way to get a routine that holds for a reader, and the proof is the guarantee [[L:guar]].",
  );
  const byId = Object.fromEntries(out.candidates.map((c) => [c.id, c]));
  // A01: C1-C3 from the routine cluster (3,3,1), C9 raised to 3 by the scorer, judged all 3 -> 2*7 + 1*... = 57 - (2*2) = 53
  assertEquals([byId.A01.scores.C1, byId.A01.scores.C2, byId.A01.scores.C3, byId.A01.scores.C9], [3, 3, 1, 3]);
  assertEquals(byId.A01.weighted_total, 53);
  assertEquals(byId.A01.gates, { desire: "pass", desire_magnitude: 7, proof: "pass", c9: 3 });
  // A06 ranks above A03: both pass; A06 total: energy (2,2,1)=10, C9 2 ->4, C12 1 ->2, C4 1, others 3*7=21 => 38; A03: simplify (3,3,0)=12, C9 2->4, C12 3->6, C14 1, others 3*7=21 => 44? then A03 should rank above A06
  assert(byId.A03.weighted_total > byId.A06.weighted_total || out.finalist_ids[1] === "A06");
  // A05: demoted on coverage: proof gate fails after scoring, not a finalist, keeps the judged scores
  assertEquals(byId.A05.gates.proof, "fail");
  assertEquals(byId.A05.gates.c9, 1);
  assertStringIncludes(byId.A05.rationale, "does not cover the promise");
  assert(!out.finalist_ids.includes("A05"));
  // A02: testimonial only; A04: desire fail; both unjudged with C4-C14 at 0
  assertEquals(byId.A02.gates, { desire: "pass", desire_magnitude: 5, proof: "fail", c9: 1 });
  assertEquals(byId.A02.scores.C4, 0);
  assertStringIncludes(byId.A02.rationale, "gated out before scoring");
  assertEquals(byId.A04.gates.desire, "fail");
  // A03 is provisional and still a finalist
  assertEquals(byId.A03.gates.desire, "provisional");
  // angles mirror the output
  assertEquals(asm.angles.length, 6);
  assertEquals(asm.angles.filter((a) => a.isWinner).map((a) => (a.candidate as CandidateT).id), ["A01"]);
  assertEquals(asm.angles[0].rank, 1);
  assertEquals(asm.angles[0].thesis, out.thesis);
  assertEquals(asm.angles.filter((a) => a.isFinalist).length, 3);
  assertEquals(asm.angles.filter((a) => a.keptAsLoser).length, 2);
  assertEquals(asm.angles.slice(1).some((a) => a.thesis), false);
  // eligible rows come first, gated-out rows after
  assertEquals(out.candidates.slice(0, 3).map((c) => c.id), out.finalist_ids);
});

Deno.test("assembly: the exact ranking in the mixed case", () => {
  const cands = [
    candidate("A01", { cluster: "energy", proof_ledger_refs: ["stat-b"] }),
    candidate("A02", { cluster: "routine", proof_ledger_refs: ["stat-b"] }),
  ];
  const gated = ag1Gated(cands);
  // identical judged scores: routine (3,3,1)=7 beats energy (2,2,1)=5 on the computed dimensions alone
  const judged = indexJudged({ scored: ["A01", "A02"].map((id) => ({ id, scores: { ...allThrees, C9: 2 }, rationale: "r" })) });
  const asm = assembleArgument({ gated, judged, reader: "r" });
  assertEquals(asm.output.winner_id, "A02");
  assertEquals(asm.output.candidates[0].weighted_total - asm.output.candidates[1].weighted_total, 4);
  assertEquals(asm.output.tie_break_note, null);
});

Deno.test("assembly: a survivor the scorer skipped is not eligible", () => {
  const gated = ag1Gated([
    candidate("A01", { cluster: "routine", proof_ledger_refs: ["guar"] }),
    candidate("A02", { cluster: "energy", proof_ledger_refs: ["guar"] }),
  ]);
  const judged = indexJudged({ scored: [{ id: "A02", scores: { ...allThrees, C9: 2 }, rationale: "r" }] });
  const asm = assembleArgument({ gated, judged, reader: "r" });
  assertEquals(asm.output.winner_id, "A02");
  assertEquals(asm.output.finalist_ids, ["A02"]);
  const skipped = asm.output.candidates.find((c) => c.id === "A01")!;
  assertStringIncludes(skipped.rationale, "not returned by the scorer");
});

Deno.test("assembly: no survivors keeps every candidate, selects nothing and says so", () => {
  const gated = ag1Gated([
    candidate("A01", { cluster: "taste", proof_ledger_refs: ["guar"] }),
    candidate("A02", { cluster: "energy", proof_ledger_refs: ["testi"] }),
    candidate("A03", { cluster: "unknown", proof_ledger_refs: [] }),
  ]);
  const asm = assembleArgument({ gated, judged: {}, reader: "r" });
  assertEquals(asm.noSurvivors, true);
  assertEquals(asm.output.finalist_ids, []);
  assertEquals(asm.output.losers_kept_ids, []);
  assertEquals(asm.output.winner_id, "A02"); // best by magnitude + c9 (5 + 1), for reference only
  assertStringIncludes(asm.output.tie_break_note!, "NO CANDIDATE PASSED BOTH GATES");
  assertEquals(asm.angles.some((a) => a.isWinner || a.isFinalist || a.keptAsLoser), false);
  assertEquals(asm.angles.map((a) => a.rank), [1, 2, 3]);
  assertThrows(() => assembleArgument({ gated: [], judged: {}, reader: "r" }));
});

Deno.test("scoring schema: integers 0-3 only", () => {
  assert(!ScoringOutput.safeParse({ scored: [{ id: "A01", scores: { ...allThrees, C9: 4 }, rationale: "r" }] }).success);
  assert(!ScoringOutput.safeParse({ scored: [{ id: "A01", scores: { C4: 1 }, rationale: "r" }] }).success);
  assert(ScoringOutput.safeParse({ scored: [] }).success);
});
