/**
 * The four opening rules (tells.ts reader_scene_opener, closing_verdict, slogan_rehook, talking_tool), ported from the
 * hook14 measurement: the hooks the owner rejected are caught, the human openings the measurement lists near each
 * boundary are not, the rules read each piece's opening and nothing else, and the tell edit hands them to the editor
 * for every lead in its place.
 */
import { assert, assertEquals } from "@std/assert";
import type { z } from "zod";
import type { Block, DraftOutput, Section } from "../schemas/draft.ts";
import { MechanicalReport } from "../schemas/review.ts";
import { TellEditCall, TellEditOutput } from "../schemas/tell_edit.ts";
import { FORMATS } from "../formats/index.ts";
import type { FormatSpec } from "../formats/spec.ts";
import { analyzeDraft, analyzeText, OPENING_TELLS, openingMatches, openingTellsIn, ownerTellsIn, TELLS, toolNamesFrom } from "../tells.ts";
import { editableUnits, openingFindings, ownerTellCount, unitFindings } from "../draft/tell_edit.ts";
import { assembleDraft, provisionalLeadSection } from "../draft/assemble.ts";
import { blocksQuoted } from "../draft/ledger.ts";
import { runTellEdit } from "../steps/tell_edit.ts";
import type { TellEditArgs } from "../prompts/tell_edit.v15.ts";
import type { callStep } from "../draft/step_util.ts";
import type { StepContext } from "../steps/types.ts";

const L = "0f1e2d3c-4b5a-4968-8778-695a4b3c2d1e";
const blk = (id: string, text: string, type: Block["type"] = "paragraph", items: string[] | null = null): Block => ({ id, type, text, items, meta: null });
const sec = (section_id: string, blocks: Block[]): Section => ({ section_id, title: null, blocks });
const OPENING = new Set<string>(OPENING_TELLS);
const openingTells = (r: MechanicalReport) => r.flags.filter((f) => OPENING.has(f.tell)).map((f) => f.tell).sort();
/** The opening tells of a text whose paragraphs are the opening's lines. */
const opened = (lines: string[], format: FormatSpec = FORMATS.organic_social, toolNames?: string[]) => openingTells(analyzeText(lines.join("\n\n"), { format, toolNames }));
/** measure.py OFFER_NAMES: the offer's named tools and metrics as its claims ledger names them. */
const OFFER_NAMES = ["Ahrefs", "Semrush", "Google", "volume", "difficulty"];

// ---------------------------------------------------------------- the owner's rejected hooks

const ROUND_6 = [
  "You paid a writer for a page your keyword tool scored as easy. It never brought in a single customer.",
  "You win rankings your site can hold, on keywords that bring paying customers.",
];

Deno.test("opening rules: the hooks the owner rejected are caught (rejected.txt, the earlier rounds and round 6)", () => {
  // [lines, the opening tells counted, the owner's tells counted in all]: every one is the owner's stack
  const rejected: [string[], string[], number][] = [
    // rejected.txt 2, "AI poetry and not good either": the reframe that closes on a short pronoun verdict; the
    // disguise frame already counts those words, so the verdict is the same flaw and is not counted twice
    [["Sorting your Ahrefs export by keyword difficulty feels like research. It's where bad content gets made."], [], 3], // "keyword difficulty" is a metric's name (tell 22) besides the disguise frame and the "was never" reveal
    // rejected.txt 3, the same run: the score that hides, and the elliptic twist (the disguise frame's words again)
    [["Here's the part the score hides. The keyword was never your competition. The pages ranking for it are."], ["talking_tool"], 3],
    // the panel 9 and panel 10 chosen hooks
    [["You've paid a writer for a page because Semrush rated the keyword easy. That rating still left you guessing whether anyone searching it would ever become a customer."], ["reader_scene_opener", "talking_tool"], 2],
    [["You paid a writer for a page because the difficulty score said it was easy, and it never cracked page one."], ["closing_verdict", "reader_scene_opener", "talking_tool"], 4], // "the difficulty score" is also a metric's name (tell 22)
    // round 6, "still reads like AI poetry": all four
    [ROUND_6, ["closing_verdict", "reader_scene_opener", "slogan_rehook", "talking_tool"], 4],
  ];
  for (const [lines, want, owner] of rejected) {
    assertEquals(opened(lines), want, lines[0]);
    assertEquals(opened(lines, FORMATS.email_single, OFFER_NAMES), want, `${lines[0]} (an email, with the offer's names)`);
    const r = analyzeText(lines.join("\n\n"), { format: FORMATS.organic_social });
    assertEquals(r.owner_tells, owner, lines[0]);
    assert(r.hard_fail_reasons.some((x) => x.startsWith(`owner_stack: ${owner}`)), `${lines[0]}: ${r.hard_fail_reasons.join("; ")}`);
  }
  // the editor still sees the verdict the disguise frame counts, as one not counted again
  const verdict = openingTellsIn([sec("lead_in", [blk("h", rejected[0][0][0], "hook")])], FORMATS.organic_social);
  assertEquals(verdict.map((h) => [h.tell, h.match, h.counted]), [["closing_verdict", "It's where bad content gets made.", false]]);
  // rejected.txt 1 ("terribly weak") is one of the three engine hooks the measurement's four rules do not reach
  assertEquals(opened(["12 keyword groups went in. 6 came back marked SKIP, each with its reason written next to it."], FORMATS.organic_social, OFFER_NAMES), []);

  // what each rule matched, as measure.py returns it
  const m = openingMatches(ROUND_6, { toolNames: OFFER_NAMES });
  assertEquals(m.map((x) => [x.tell, x.line, x.match]), [
    ["reader_scene_opener", 0, "You paid"],
    ["closing_verdict", 0, "It never brought in a single customer."],
    ["slogan_rehook", 1, "You win rankings your site can hold, on keywords that bring paying customers."],
    ["talking_tool", 0, "tool scored"],
  ]);

  // they are the owner's Tier 1 tells: counted, and two in one piece are the stack
  const r = analyzeText(ROUND_6.join("\n\n"), { format: FORMATS.organic_social });
  MechanicalReport.parse(r);
  assertEquals(r.owner_tells, 4);
  assert(r.hard_fail && r.hard_fail_reasons.some((x) => x.startsWith("owner_stack: 4")), r.hard_fail_reasons.join("; "));
  // the fifth opening rule (a product pointed at before its name) is read only with the product's name, which this text has none of
  for (const t of OPENING_TELLS.filter((x) => x !== "unintroduced_product")) {
    const f = r.flags.find((x) => x.tell === t)!;
    assertEquals([f.tier, f.weight, f.count], [1, 4, 1], t);
    assert(f.examples[0].length > 0 && ROUND_6.join(" ").includes(f.examples[0].replace(/^…|…$/g, "")), `${t}: ${f.examples[0]}`);
    const rule = TELLS.find((x) => x.name === t)!;
    assert(rule.owner && rule.regex === null && rule.scope === "structural" && /Example \(an? [a-z ]+\)/.test(rule.fix), t);
  }
});

// ---------------------------------------------------------------- human openings near each boundary

/** Openings from human.json that sit near a rule's boundary (part of its pattern, no hit), lines 1-5 as measured. */
const HUMAN_NEAR: [string, string[]][] = [
  ["social/threadreader_f83e86410d.txt", ["I sold The Hustle's first ads. About $100k worth.", "Here's the 1st cold email I sent that got a sale. It was Wealthfront.", "Maybe sent emails to 20 diff brands, 5-8 showed interest.", "We had 93,535 subscribers. I charged them $26 per 1,000 sends.", "This took forever because 1) we didn't know anything 2) not many others doing it so we made it up 3) advertisers didn't typically buy newsletter ads. 4) i was doing it and had zero experience"]],
  ["social/threadreader_443eb04e3e.txt", ["In 2021, I started shipping 1 product per week.", "Most failed.", "But 1 winner emerged and led to an $8m acquisition", "Here's the system I use to find great ideas FAST (copy this):", "Before that, I spent 2 years building a product nobody wanted. Twice."]],
  ["social/threadreader_0919125342.txt", ["The entertainment industry will never be the same.", "OpenAI just dropped Sora, a text-to-video tool that feels like magic.", "Here's how it's about to shake up how we create and consume stories 🧵", "For starters, Sora provides creators with these capabilities:", "• Generate videos from text prompts"]],
  ["email/goodemailcopy_2d8f0c533f.txt", ["You signed up for Slack back on Wednesday, November 26. This is a friendly reminder to let you know that we're ready whenever you are – click the big link below to try Slack for free.", "Slack is always free for an unlimited period of time and unlimited number of people.", "Slack is all your team communication in one place, instantly searchable, available wherever you go.", "To see why teams like Expedia, Buzzfeed, Adobe, Salesforce, Nordstrom, Airbnb and Rdio have all switched to Slack for team communication, check the new Slack product tour.", "\"Slack is awesome and continues to add features that make it the best way to communicate as a team.\" – @harper. See more of what people are saying on the Slack Wall of Love."]],
  ["email/goodemailcopy_532148552a.txt", ["You recently canceled your Pipedrive subscription and I'm sorry to see you go. Thank you for being with us. There could be various reasons for leaving and I really hope you can help us learn and improve.", "Thank you, and hope our paths will cross again,", "Kair Käsper Customer Life Cycle Manager"]],
  ["email/goodemailcopy_6ad08b856e.txt", ["Your administrator has deleted your Front Dropbox account. You'll no longer have access to the account and any shared links you've created will be disabled. Your computer will no longer sync with the website, other computers, or other devices. If you have any questions, please contact your"]],
  ["email/banyanhill_4892f194c9.txt", ["If you've been trading for more than 6 months, and you're still not finding success, there's a very specific reason why.", "And it's probably not what you think…", "It's not your strategy or your account size.", "It might not even be your discipline.", "The crazy thing is, it's based on an innate desire we all have."]],
  ["email/draytonbird_236ff42310.txt", ["If you follow finance in this country you'll almost certainly run across the name Tom McPhail.", "He is the leading spokesman for Hargreaves Lansdown, a firm I dash off the odd paragraph for, and is constantly being quoted in the media, probably because it's easy to understand what he says.", "After my last piece about corporate advertising he took me to task with such hilarious accuracy that I thought I should quote him.", "The first part is too flattering so I've edited it a bit. But the point he makes is bang on.", "Generally speaking, your output is so near to gospel as to be unquestioned …"]],
  ["email/bonner_5d26e67ff1.txt", ["You can't always get what you want.", "\"I can't believe it, there's no mustard in the shops,\" said Elizabeth this morning.", "\"Huh? No moutarde… en France?\"", "\"I don't know… but the shopkeeper told me that since the government outlawed pesticides… and with the higher price of fuel… they can't afford to make mustard anymore.\"", "The explanation wasn't very satisfying. But a lot of things don't add up."]],
  ["sales_page/mindvalley_4b2f6166fe.txt", ["You don't need to meditate more. You need the right one.", "1,000+ sessions. 100+ teachers. 6 distinct practices.", "Tell us what you need. We'll find what fits.", "Session ready · 12 min", "You were sold calm. Meditation was built for performance."]],
  ["email/banyanhill_b990ee8425.txt", ["Artificial intelligence doesn't always do what we want it to do.", "That's not breaking news. After all, chatbots have been making mistakes and inventing answers for as long as we've been using them.", "But there's a big difference between an AI giving you the wrong answer and an AI taking the wrong action. And that difference matters a lot more now that AI agents can browse the internet, use software and complete tasks with limited human supervision.", "Because when an AI agent goes off script, it doesn't just say something wrong. It can actually do something you never asked it to do.", "And this week's chart suggests that's happening a lot more often these days."]],
  ["email/draytonbird_0cd95fe0aa.txt", ["Some mornings I walk to work. I've never managed to get my time below an hour, but I keep trying.", "Other mornings I catch the tube at Sloane Square, and I've never managed to understand what lunatic at News International thinks it's a good idea to have people hawking copies of The Sun there. They've been doing it for months, and I'll kiss Rupert Murdoch's arse if anyone can show it could", "For those of you unfamiliar with British journalism I should explain that The Sun is cunningly crafted for people whose lips move – very slowly – when they read. Independent research reveals that it has a drivel-to-news ratio of 3,073.7 to 1.", "Sloane Sqaure is surrounded by some of the very richest parts of the very rich borough of Kensington and Chelsea. There must be a few illiterates in Chelsea, and the ways of the newspaper industry are mysterious but what are they playing at?", "To call that bad targeting is the understatement of the decade. Especially when twenty yards away you can get a free copy of Metro , which is shallow stuff, but a rock of intellectual gravitas next to The Sun ."]],
  ["social/threadreader_de22979697.txt", ["Google Sheets isn't Excel.", "But it's more powerful than you think.", "7 things Sheets can do, you'll wish you knew yesterday: 📊", "QR CODES", "Everyone has a smartphone these days..."]],
  ["social/threadreader_4a82c4d708.txt", ["I knew nothing about marketing when I started my career.", "Since, I've accelerated my learning like crazy and taken tons of notes.", "🧵 18 hard-earned marketing lessons:", "It's all about the hook:", "If you can't write a great first line, you'll never get a reader to the second."]],
  ["email/stansberry_3abbc8abcd.txt", ["It hasn't been an easy start to 2025...", "First, DeepSeek, a Chinese large-language-model company, made waves when it released its artificial-intelligence (\"AI\") model. Its DeepSeek R1 AI assistant is as much as 90% cheaper to use than rival U.S. products. And its debut put the entire AI-stock craze into question.", "Next, President Donald Trump announced a plan to slap tariffs on Chinese, Canadian, and Mexican goods. He has since walked back some of those proposals. But the continuing back-and-forth has thrown investors into uncertainty.", "Despite all that, markets managed to rally in January. And that's a great sign for the rest of 2025... because if stocks win in January, they tend to keep winning throughout the year.", "According to history, this setup points to double-digit upside by year-end. And that's a good reason to be bullish, despite the chaotic headlines."]],
  ["email/copychief_3d37cbb103.txt", ["Would you agree that freelancing is the greatest opportunity on earth?", "Think about it…", "You get to get paid to learn on your client's dime…", "Paid to learn the skills required to produce and sell quality products…", "Paid to learn about YOURSELF!"]],
  ["email/goodemailcopy_2c9c5d1eb2.txt", ["Lots of software say they can do anything and everything for you. We are *not* one of them. KiSSFLOW is not a jack of all trades. We have mastered one thing really well: *workflows*. Now, do you have a workflow problem or a task management problem or both?! Tough, right!? That's exactly why I am", "I will call you in the next 30 minutes or do you want to do this over email?"]],
  ["email/goodemailcopy_5b1660f02c.txt", ["It looks like you'll need to upgrade your account.", "You've currently sent 22,235 of your 25,000 data points so far this month. Don't worry, we won't stop recording your data if you go over, but you'll need to upgrade to a paid plan if you want to keep using Mixpanel.", "Want to earn more free data points?", "You start out with 25,000 free monthly data points, but you can earn 175,000 more points per month by adding a Mixpanel badge to your homepage.", "1. Copy the code: 2. Add it to the footer of your website 3. Email _____________ and let us know you're done"]],
  ["email/goodemailcopy_1852eb1524.txt", ["Michael here, the CEO of OnePageCRM.", "Even though I lead the company, I'm a natural \"product person\" and the user experience you get from our app means a lot to me.", "Our users love OnePage and the focus it brings to sales, but if there's anything that's bugging you, even the smallest of issues that could be done better, I want to hear about it - so hit the reply button.", "And ok, this is an automated email, but if you reply it comes directly to me and will be answered by me.", "Best regards, Michael."]],
];

Deno.test("opening rules: human openings near each boundary are not caught", () => {
  for (const [file, lines] of HUMAN_NEAR) {
    assertEquals(openingMatches(lines, { toolNames: OFFER_NAMES }), [], file);
    for (const f of [FORMATS.organic_social, FORMATS.email_single, FORMATS.sales_letter]) assertEquals(opened(lines, f, OFFER_NAMES), [], `${file} as ${f.id}`);
  }
  // the one human opening of 842 the measurement flags (an elliptic answer) is kept as measured
  assertEquals(opened(["Do you know who's awesome? You are.", "Do you know why? Because your blogs are about to get more action than you got on your honeymoon."]), ["closing_verdict"]);
  // the exemptions: a belief the reader holds, a dated action on record, a question to the reader
  for (const t of ["You've heard that low difficulty means easy rankings.", "You've been told to pick keywords by volume.", "You paid for a site audit last March.", "If you've ever paid for a page that never ranked, this is for you."]) assertEquals(opened([t]), [], t);
});

// ---------------------------------------------------------------- the opening, and only the opening

const R1_LINE = "You paid a writer for a page your keyword tool scored as easy.";

Deno.test("opening rules read each piece's first five lines, from the lead section on, else from its first line", () => {
  const social = (lead: Block[], main: Block[] = [blk("main-1", "I read the ten pages that rank for each keyword.")]) => analyzeDraft([sec("lead_in", lead), sec("main", main), sec("cta", [blk("cta-1", "Comment PLAN and I'll send the link.", "cta")])], FORMATS.organic_social);
  assertEquals(openingTells(social([blk("h", `${R1_LINE} It never brought in a single customer.`, "hook")])), ["closing_verdict", "reader_scene_opener", "talking_tool"]);
  // the opening runs on from the lead-in into the body: the same lines as line 2 are read by the rules that read
  // past line 1, and from line 6 on they are the body
  const clean = blk("h", "I counted 212 ranking pages for one client in March.", "hook");
  const body = (n: number, line: string) => Array.from({ length: n }, (_, i) => blk(`m${i}`, i === n - 1 ? line : `I checked page ${i + 2} by hand.`));
  assertEquals(openingTells(social([clean], body(1, `${R1_LINE} It never brought in a single customer.`))), ["talking_tool"]);
  assertEquals(openingTells(social([clean], body(3, R1_LINE))), []);
  assertEquals(openingTells(social([clean], body(4, "You win rankings your site can hold, on keywords that bring paying customers."))), ["slogan_rehook"]);
  assertEquals(openingTells(social([clean], body(5, "You win rankings your site can hold, on keywords that bring paying customers."))), []);
  // talking_tool reads lines 1-3, slogan_rehook lines 1-5
  const lines = (n: number, line: string) => Array.from({ length: 6 }, (_, i) => blk(`l${i}`, i === n ? line : `I checked page ${i + 1} by hand.`, i ? "paragraph" : "hook"));
  assertEquals(openingTells(social(lines(2, "The score said it was easy."))), ["talking_tool"]);
  assertEquals(openingTells(social(lines(3, "The score said it was easy."))), []);
  const tagline = "You win rankings your site can hold, on keywords that bring paying customers.";
  assertEquals(openingTells(social(lines(4, tagline))), ["slogan_rehook"]);
  assertEquals(openingTells(social(lines(5, tagline))), []);
  // a number or the speaker in the promise sentence is not the slogan
  assertEquals(opened(["I checked 40 pages on Monday.", "You win rankings on 12 keywords that bring paying customers."]), []);
  assertEquals(opened(["I checked 40 pages on Monday.", "You get the pages I would build, with the ones that bring customers first."]), []);

  // an email: the subject and preview are the envelope, a greeting and a salutation are not lines
  const email = (hook: Block[]) => openingTells(analyzeDraft([sec("subject", [blk("s", "Your keyword tool said it was easy", "subject"), blk("p", "It never brought in a customer", "preview")]), sec("hook", hook), sec("body", [blk("b", "I read the ten pages that rank for each keyword.")]), sec("cta", [blk("c", "Reply PLAN.", "cta")])], FORMATS.email_single));
  assertEquals(email([blk("g", "Hi Sam,", "greeting"), blk("h1", "I checked 40 of your pages on Monday.")]), []);
  assertEquals(email([blk("g", "Hi Sam,", "greeting"), blk("h1", R1_LINE)]), ["reader_scene_opener", "talking_tool"]);
  for (const hi of ["Hey Sam,", "Good morning Sam,", "Sam,"]) assertEquals(email([blk("h0", hi), blk("h1", R1_LINE)]), ["reader_scene_opener", "talking_tool"], hi);
  assertEquals(email([blk("g", "Hi Sam,", "greeting"), blk("h1", "I checked 40 of your pages on Monday."), blk("h2", R1_LINE)]), ["talking_tool"]);

  // a sales letter's opening is its lead, not its headline; a landing page's is its headline, not the preheadline
  const letter = (head: string, lead: string) => openingTells(analyzeDraft([sec("headline", [blk("hd", head, "headline")]), sec("lead", [blk("ld", lead)])], FORMATS.sales_letter));
  assertEquals(letter(R1_LINE, "I read 212 ranking pages for one client in March."), []);
  assertEquals(letter("Build only the pages you can win", R1_LINE), ["reader_scene_opener", "talking_tool"]);
  const page = (pre: string, head: string) => openingTells(analyzeDraft([sec("headline", [blk("pre", pre, "preheadline"), blk("hd", head, "headline")]), sec("subhead", [blk("dk", "I read the pages that rank first.", "deck")])], FORMATS.landing_page_short));
  assertEquals(page("Your keyword tool said it was easy", "Pages worth building, with the evidence"), []);
  assertEquals(page("For site owners", "Your keyword tool said it was easy"), ["talking_tool"]);

  // a ledger tag in a block goes with the space before it, as the measurement stripped it (the elliptic twist still
  // ends on its auxiliary); quotations and testimonials keep their words and are not read
  assertEquals(openingTells(social([blk("h", `Here's what I found. The pages ranking for it are [[L:${L}]].`, "hook")])), ["closing_verdict"]);
  assertEquals(opened([`"You paid a writer for a page your keyword tool scored as easy," a client told me in March.`]), []);
  assertEquals(openingTells(social([blk("t", "Your keyword tool said it was easy, and it never ranked.", "testimonial"), blk("h", "I counted 212 ranking pages in March.")])), []);
});

Deno.test("opening rules: one opening per piece, counted per piece; a set of separate assets has none", () => {
  // an email sequence: each email has its own opening, and the stack is per email
  const seq = (one: string, two: string) => analyzeDraft([
    sec("subject#1", [blk("s1", "Day one", "subject")]), sec("hook#1", [blk("h1", one)]), sec("body#1", [blk("b1", "I read the ten pages that rank.")]),
    sec("subject#2", [blk("s2", "Day two", "subject")]), sec("hook#2", [blk("h2", two)]), sec("body#2", [blk("b2", "I read the ten pages that rank.")]),
  ], FORMATS.email_sequence);
  const apart = seq("You paid a writer for a page that never ranked.", "If you pick keywords by volume, read this first.");
  assertEquals(apart.flags.find((f) => f.tell === "reader_scene_opener")?.count, 2);
  assert(!apart.hard_fail_reasons.some((x) => x.startsWith("owner_stack")), apart.hard_fail_reasons.join("; "));
  const together = seq(R1_LINE, "I read 40 pages on Monday.");
  assert(together.hard_fail_reasons.some((x) => x.startsWith("owner_stack: 2")), together.hard_fail_reasons.join("; "));

  // the flags quote the copy as written, so the reviser finds the block a flag is about (tags and curly quotes included)
  const tagged = [sec("lead_in", [blk("h", `You paid a writer for a page your keyword tool scored as easy [[L:${L}]]. It never brought in a single customer [[L:${L}]].`, "hook"), blk("h2", "You win rankings your site can hold, on keywords that bring paying customers.")]), sec("main", [blk("m", "I read the pages that rank.")])];
  const flagged = analyzeDraft(tagged, FORMATS.organic_social).flags.filter((f) => OPENING.has(f.tell));
  assertEquals(flagged.length, 4);
  for (const f of flagged) assert(blocksQuoted(tagged, [f.examples[0]]).size === 1, `${f.tell}: ${f.examples[0]}`);

  // a Meta ad set: each variation's primary text is an opening
  const ads = analyzeDraft([1, 2, 3].map((n) => sec(`primary_text#${n}`, [blk(`pt${n}`, n === 2 ? "I spent $4,000 on ads in March. Your dashboard said it was working." : `I counted ${n * 10} leads in March.`, "hook")])), FORMATS.meta_ad);
  assertEquals(openingTells(ads), ["talking_tool"]);

  // a webinar: the registration page and each reminder open on their own; the presentation opens on its lead section
  const web = analyzeDraft([
    sec("registration_headline", [blk("rh", "Free class: the pages worth building", "headline")]),
    sec("reminder_morning_of", [blk("rs", "Today at 2", "subject"), blk("rg", "Hi Sam,", "greeting"), blk("rp", "You signed up for today's class on Monday.")]),
    sec("reminder_60_minutes", [blk("r6s", "One hour", "subject"), blk("r6p", "You paid for keyword tools you open once a month.")]),
    sec("presentation_open", [blk("po", "I read 212 ranking pages for one client in March.", "beat")]),
    sec("presentation_case_study", [blk("pc", R1_LINE, "beat")]),
  ], FORMATS.webinar_package);
  assertEquals(openingTells(web), ["reader_scene_opener", "talking_tool"]);
  assertEquals(web.flags.find((f) => f.tell === "reader_scene_opener")?.count, 1, "the 60-minute reminder only: the case study is the presentation's line 2");

  // Google RSA: the headlines and descriptions are separate assets, never one opening
  const rsa = analyzeDraft([sec("headlines", [blk("hl1", "Your Keyword Tool Lied", "headline")]), sec("descriptions", [blk("d1", `${R1_LINE} It never ranked.`)])], FORMATS.google_rsa);
  assertEquals(openingTells(rsa), []);
});

// ---------------------------------------------------------------- the offer's tools and metrics

Deno.test("talking_tool: the offer's tools and metrics come from the comparative ledger rows", () => {
  const claims = [
    { claim_type: "comparative", claim_text: "Ahrefs and Semrush hand you a keyword list and leave the decision to you. This reads the pages that rank, checks whether you can compete, and returns a page decision with the evidence.", role: "mechanism", user_decision: null },
    { claim_type: "comparative", claim_text: "Four times Pro, for a team with clients.", role: "offer_term", user_decision: null },
    { claim_type: "comparative", claim_text: "A keyword tool gives you two thousand keywords with scores, a difficulty number to interpret, no idea what the top pages say; the decision is still on you.", role: "mechanism", user_decision: "keep" },
    { claim_type: "comparative", claim_text: "Unlike Moz, it reads every page that ranks.", role: "mechanism", user_decision: "drop" },
    { claim_type: "feature", claim_text: "Every keyword carries Google's cost per click.", role: "feature", user_decision: null },
    { claim_type: "comparative", claim_text: `Legiit Keywords reads the pages; Surfer counts the words [[L:${L}]].`, role: "mechanism", user_decision: null },
  ];
  const names = toolNamesFrom(claims, ["legiit", "keywords"]);
  assertEquals(names, ["Ahrefs", "Semrush", "difficulty", "Surfer"]);
  // a named tool or a named metric as the subject only with the ledger's names; the generic nouns always
  for (const t of ["Semrush rated the keyword easy, so I hired a writer.", "The difficulty said 12, so I hired a writer."]) {
    assertEquals(opened([t]), [], t);
    assertEquals(opened([t], FORMATS.organic_social, names), ["talking_tool"], t);
  }
  assertEquals(opened(["The tool hands you two thousand keywords."]), ["talking_tool"]);
  assertEquals(toolNamesFrom([]), []);
});

Deno.test("a lone line is no opening: idioms, habits and suggested rewrites are not read by the opening rules", () => {
  assertEquals(ownerTellsIn(`${R1_LINE} It never brought in a single customer.`), 0);
  assertEquals(ownerTellsIn("You win rankings your site can hold, on keywords that bring paying customers."), 0);
  // the rest of the owner's list still counts there
  assertEquals(ownerTellsIn("You paid a writer for a genuinely useless page."), 1);
});

// ---------------------------------------------------------------- the tell edit

function leadsDraft(chosen: string | null): DraftOutput {
  const spec = FORMATS.organic_social;
  const leads = [
    { id: "lead-a", lead_type: "promise" as const, reader_hypothesis: "r1", blocks: [blk("lead-a-1", `${R1_LINE} It never brought in a single customer.`, "hook"), blk("lead-a-2", "You win rankings your site can hold, on keywords that bring paying customers.")] },
    { id: "lead-b", lead_type: "story" as const, reader_hypothesis: "r2", blocks: [blk("lead-b-1", "I read 212 ranking pages for one client in March.", "hook")] },
    { id: "lead-c", lead_type: "problem_solution" as const, reader_hypothesis: "r3", blocks: [blk("lead-c-1", "If you pick keywords by difficulty, you pay for pages nobody reads.", "hook"), blk("lead-c-2", "The export said they were easy.")] },
  ];
  const leadSection = chosen ? { section_id: "lead_in", title: null, blocks: leads.find((l) => l.id === chosen)!.blocks.map((b) => ({ ...b, meta: { lead_id: chosen, lead_type: "story" } })) } : provisionalLeadSection("lead_in", null, leads);
  return assembleDraft({ spec, sections: [leadSection, sec("main", [blk("main-1", "You paid a writer for a page that never ranked."), blk("main-2", `It reads the pages that rank and checks your links [[L:${L}]].`)]), sec("cta", [blk("cta-1", "Comment PLAN and I'll send the link.", "cta")])], leads, chosenLeadId: chosen, needsSource: [], keepOrder: true });
}

Deno.test("tell edit: the opening tells reach the editor for every lead in its place and for the chosen one, never for the body", () => {
  const spec = FORMATS.organic_social;
  for (const chosen of [null, "lead-c", "lead-b"]) {
    const draft = leadsDraft(chosen);
    const units = editableUnits(draft, spec);
    const found = openingFindings(units, draft, spec);
    assertEquals(found.map((f) => `${f.ref} ${f.tell}${f.counted ? "" : " (more)"}`).sort(), [
      "lead-a-1 closing_verdict",
      "lead-a-1 reader_scene_opener",
      "lead-a-1 talking_tool",
      "lead-a-2 slogan_rehook",
      "lead-c-1 reader_scene_opener",
      "lead-c-2 talking_tool",
    ], `chosen ${chosen}`);
    // each finding names what the rule saw and carries its fix, with the example from another trade
    const scene = found.find((f) => f.ref === "lead-a-1" && f.tell === "reader_scene_opener")!;
    assert(scene.example.startsWith(`"You paid a writer`) && scene.example.includes("never cut whole") && scene.example.includes("Example (a plumber)"), scene.example);
    // the body's "You paid a writer..." is no opening; a text read alone is never treated as one
    assertEquals(unitFindings(units, spec, []).filter((f) => OPENING.has(f.tell)), []);
    // counted as the detector counts: once per rule for each lead
    assertEquals(ownerTellCount(draft, spec, []), 6);
  }
  // the mechanical review reads the lead section as it stands (the provisional lead before the pick)
  assertEquals(openingTells(analyzeDraft(leadsDraft(null).sections, spec)), ["closing_verdict", "reader_scene_opener", "slogan_rehook", "talking_tool"]);
  assertEquals(openingTells(analyzeDraft(leadsDraft("lead-b").sections, spec)), []);

  // two talking-tool lines in one opening: one tell for the detector, both lines for the editor
  const two = assembleDraft({ spec, sections: [sec("lead_in", [blk("h1", "The score said it was easy.", "hook"), blk("h2", "The export hands you two thousand rows.")]), sec("main", [blk("m1", "I read the pages that rank.")])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  assertEquals(analyzeDraft(two.sections, spec).flags.find((f) => f.tell === "talking_tool")?.count, 1);
  const both = openingFindings(editableUnits(two, spec), two, spec);
  assertEquals(both.map((f) => [f.ref, f.counted]), [["h1", true], ["h2", false]]);
  assertEquals(ownerTellCount(two, spec, []), 1);

  // an email sequence: each email's hook is its own opening
  const seq = FORMATS.email_sequence;
  const mail = assembleDraft({ spec: seq, sections: [sec("subject#1", [blk("s1", "One", "subject")]), sec("hook#1", [blk("h1", R1_LINE)]), sec("subject#2", [blk("s2", "Two", "subject")]), sec("hook#2", [blk("h2", "I read 40 pages on Monday."), blk("h2b", "The report said they were easy.")])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  assertEquals(openingFindings(editableUnits(mail, seq), mail, seq).map((f) => `${f.ref} ${f.tell}`).sort(), ["h1 reader_scene_opener", "h1 talking_tool", "h2b talking_tool"]);
});

function ctxFor(draft: DraftOutput, over: Partial<StepContext> = {}): StepContext {
  return {
    db: {} as StepContext["db"],
    generation: { id: "gen-1", workspace_id: "ws-1", options: {} } as unknown as StepContext["generation"],
    offer: { id: "off-1", name: "Legiit Keywords" } as unknown as StepContext["offer"],
    brief: null,
    claims: [],
    config: null,
    questions: [],
    variant: null,
    dossier: null,
    voice: null,
    format: FORMATS.organic_social,
    angles: [],
    winningAngle: null,
    drafts: [],
    latestDraft: { id: "d-1", version: 4, origin: "system", blocks: draft } as unknown as StepContext["latestDraft"],
    stepOutputs: {},
    revisionCycles: 0,
    attempt: 1,
    promptVersions: {},
    progress: async () => {},
    partial: null,
    savePartial: () => Promise.resolve(),
    timeBudgetMs: 300_000,
    startedAt: Date.now(),
    ...over,
  } as StepContext;
}

function editor(reply: (args: TellEditArgs, call: number) => z.input<typeof TellEditCall>, seen: TellEditArgs[]): typeof callStep {
  return ((_ctx, _step, _mod, args, schema) => {
    seen.push(args as unknown as TellEditArgs);
    return Promise.resolve({ output: schema.parse(reply(args as unknown as TellEditArgs, seen.length)), text: "", model: "fake-model", usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_searches: 0 }, costUsd: 0, latencyMs: 0, stopReason: "end_turn", requestId: null, sources: [] });
  }) as typeof callStep;
}

Deno.test("tell edit step: the opening tells reach the editor with the ledger's tool names, and one left standing gets one more ask", async () => {
  const hook = "You paid a writer because Semrush rated the keyword easy.";
  const draft = assembleDraft({ spec: FORMATS.organic_social, sections: [sec("lead_in", [blk("lead_in-1", hook, "hook")]), sec("main", [blk("main-1", `Legiit Keywords reads the pages that rank and checks your links [[L:${L}]].`)]), sec("cta", [blk("cta-1", "Comment PLAN and I'll send the link.", "cta")])], leads: null, chosenLeadId: null, needsSource: [], keepOrder: true });
  const claims = [{ id: L, claim_type: "comparative", claim_text: "Ahrefs and Semrush hand you a keyword list and leave the decision to you.", role: "mechanism", user_decision: null, precision: null }] as unknown as StepContext["claims"];
  const seen: TellEditArgs[] = [];
  const res = await runTellEdit(ctxFor(draft, { claims }), {
    call: editor((args, call) => {
      if (call === 1) return { edits: [], what_changed: [], already_clean: false };
      assert(args.retryNote?.includes("These opening lines still carry an opening tell") && args.retryNote.includes("[lead_in-1] reader_scene_opener") && args.retryNote.includes("[lead_in-1] talking_tool"), args.retryNote ?? "");
      return { edits: [{ ref: "lead_in-1", before: hook, after: "I read the pages that rank before I trust what Semrush calls easy.", tell: "reader scene opener, talking tool" }], what_changed: ["Opened on the speaker, not the reader's past"], already_clean: false };
    }, seen),
  });
  assertEquals(seen.length, 2);
  const tells = seen[0].findings.filter((f) => f.ref === "lead_in-1").map((f) => f.tell).sort();
  assertEquals(tells, ["reader_scene_opener", "talking_tool"], "the ledger's Semrush makes the rating a talking tool");
  assert(seen[0].findings.some((f) => f.tell === "talking_tool" && f.example.includes("Example (a mechanic)")));
  const out = TellEditOutput.parse(res.output);
  assertEquals([out.owner_tells_before, out.owner_tells_after], [2, 0]);
  assertEquals((res.effects!.newDraft!.blocks as DraftOutput).sections[0].blocks[0].text, "I read the pages that rank before I trust what Semrush calls easy.");

  // without the ledger's names the rating is the generic nouns' to find, and they do not
  const plain: TellEditArgs[] = [];
  await runTellEdit(ctxFor(draft), { call: editor(() => ({ edits: [], what_changed: [], already_clean: false }), plain) });
  assertEquals(plain[0].findings.filter((f) => f.ref === "lead_in-1").map((f) => f.tell), ["reader_scene_opener"]);
});
