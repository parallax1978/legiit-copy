/**
 * The owner's test of 30 October (generation 756d3093) went backwards: the revise step deleted the product's
 * introduction while fixing the sentence beside it and replaced the hook with the reviewer's example, "longer" forced
 * a 196-word body that lectured, the lead-in pointed at "it" before the main points said what it was. These pin the
 * fixes: a revision keeps every sentence no note quotes and the product's introduction (verified by machine), the
 * opening rule for a product pointed at before its name, the social spec's lecture bans, and the prompts.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import type { Block, Section } from "../schemas/draft.ts";
import type { RevisionOutput } from "../schemas/review.ts";
import { reconcileRevision, unquotedSentencesLost } from "../draft/review.ts";
import { analyzeDraft, openingMatches, TELLS } from "../tells.ts";
import { FORMATS } from "../formats/index.ts";
import { FORMAT_SPECS } from "../prompts/standard.ts";
import { TellEditAuditItem } from "../schemas/tell_edit.ts";
import { tellEditPrompt } from "../prompts/tell_edit.v13.ts";
import { revisePrompt } from "../prompts/revise.v15.ts";
import { editorialPrompt } from "../prompts/editorial.v16.ts";

const blk = (id: string, text: string, type: Block["type"] = "paragraph"): Block => ({ id, type, text, items: null, meta: null });
const sec = (section_id: string, blocks: Block[]): Section => ({ section_id, title: null, blocks });
const revision = (sections: Section[], changed: string[] = []): RevisionOutput => ({ sections, changes: changed.map((block_id) => ({ block_id, note_applied: "x" })), untouched_confirmed: [] } as unknown as RevisionOutput);

const INTRO = "Legiit Keywords is a keyword tool that reads your site and the pages ranking against it, then tells you which pages to build and writes them [[L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa]].";
const CPC = "Every keyword in it carries Google's cost per click and the searcher's intent [[L:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb]].";
const BEHIND = "You see the ranking pages behind every call, and the reason for every skip [[L:cccccccc-cccc-4ccc-8ccc-cccccccccccc]].";
const before = [sec("lead_in", [blk("lead_in-1", "Nobody can read a difficulty score and know their site will rank.", "hook")]), sec("main", [blk("main-1", "Ahrefs and Semrush stop at the keyword list [[L:dddddddd-dddd-4ddd-8ddd-dddddddddddd]]."), blk("main-3", `${INTRO} ${CPC} ${BEHIND}`)]), sec("cta", [blk("cta-1", "Enter your site at the link in the first comment.", "cta")])];

Deno.test("a revision changes only the sentence a note quotes: the rest of the block comes back as it was, or the block is reverted whole", () => {
  const quotes = [CPC];
  const good = `${INTRO} It keeps only the searches advertisers keep paying for, so every page it tells you to build sits where people buy [[L:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb]]. ${BEHIND}`;
  assertEquals(unquotedSentencesLost(before[1].blocks[1], blk("main-3", good), quotes), []);
  const bad = "It makes both of those checks for you before it picks a page. So it keeps only the searches advertisers keep paying for [[L:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb]]. You see the ranking pages behind every call [[L:cccccccc-cccc-4ccc-8ccc-cccccccccccc]].";
  assertEquals(unquotedSentencesLost(before[1].blocks[1], blk("main-3", bad), quotes).map((s) => s.slice(0, 20)), ["Legiit Keywords is a", "You see the ranking "]);
  // a quote that cuts across two sentences covers both (its head is one sentence's tail, its tail the next one's head)
  const across = ["the searcher's intent. You see the ranking pages behind"];
  assertEquals(unquotedSentencesLost(before[1].blocks[1], blk("main-3", `${INTRO} Rewritten here. And here too.`), across), []);
  // cutting the quoted sentence is fine; so is a light touch on an unquoted one (a pronoun made plain)
  assertEquals(unquotedSentencesLost(before[1].blocks[1], blk("main-3", `${INTRO} ${BEHIND}`), quotes), []);
  assertEquals(unquotedSentencesLost(before[1].blocks[1], blk("main-3", `${INTRO} ${CPC} You see the ranking pages behind every one of its calls, and the reason for every skip [[L:cccccccc-cccc-4ccc-8ccc-cccccccccccc]].`), quotes), []);

  const ok = reconcileRevision(before, revision([before[0], sec("main", [before[1].blocks[0], blk("main-3", good)]), before[2]], ["main-3"]), quotes, [], undefined, { productName: "Legiit Keywords" });
  assertEquals([ok.changed, ok.reverted, ok.sentencesLost, ok.productKept], [["main-3"], [], [], []]);
  const reverted = reconcileRevision(before, revision([before[0], sec("main", [before[1].blocks[0], blk("main-3", bad)]), before[2]], ["main-3"]), quotes, [], undefined, { productName: "Legiit Keywords" });
  assertEquals(reverted.changed, []);
  assertEquals(reverted.reverted, ["main-3"]);
  assertEquals(reverted.productKept, ["main-3"], "the name vanished, so the block that introduced the product is kept");
  assertEquals(reverted.sections[1].blocks[1].text, `${INTRO} ${CPC} ${BEHIND}`);
});

Deno.test("a revision never leaves the piece with no line that names the product, even when a note quotes that line", () => {
  const quotes = [INTRO];
  const dropped = reconcileRevision(before, revision([before[0], sec("main", [before[1].blocks[0], blk("main-3", `It reads your site and the pages ranking against it [[L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa]]. ${CPC} ${BEHIND}`)]), before[2]], ["main-3"]), quotes, [], undefined, { productName: "Legiit Keywords" });
  assertEquals([dropped.reverted, dropped.productKept, dropped.sentencesLost], [["main-3"], ["main-3"], []]);
  // moved, not lost: the name now sits in another block
  const moved = reconcileRevision(before, revision([before[0], sec("main", [blk("main-1", "Ahrefs and Semrush stop at the keyword list [[L:dddddddd-dddd-4ddd-8ddd-dddddddddddd]]. Legiit Keywords does not."), blk("main-3", `It reads your site and the pages ranking against it [[L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa]]. ${CPC} ${BEHIND}`)]), before[2]], ["main-1", "main-3"]), [INTRO, "Ahrefs and Semrush stop at the keyword list"], [], undefined, { productName: "Legiit Keywords" });
  assertEquals([moved.productKept, moved.changed.sort()], [[], ["main-1", "main-3"]]);
  // without a product name the guard is off
  const off = reconcileRevision(before, revision([before[0], sec("main", [before[1].blocks[0], blk("main-3", `It reads your site [[L:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa]]. ${CPC} ${BEHIND}`)]), before[2]], ["main-3"]), quotes, []);
  assertEquals([off.productKept, off.changed], [[], ["main-3"]]);
});

Deno.test("opening rule: the product pointed at as 'it' before the opening names it is the owner's tell 18", () => {
  const lines = ["How many of your pages did someone pick off a difficulty number?", "Whoever picked them had a number to interpret and no idea what the pages already ranking there said.", "Then it reads the pages ranking for each group, and you get a build, improve or skip call on it. Your pages win rankings on keywords that bring paying customers."];
  const hits = openingMatches(lines, { productName: "Legiit Keywords", all: true }).filter((m) => m.tell === "unintroduced_product");
  assertEquals(hits.map((h) => [h.line, h.match]), [[2, "Then it reads"]]);
  assertEquals(openingMatches(lines, {}).filter((m) => m.tell === "unintroduced_product"), [], "read only with the product's name");
  const named = [lines[0], "Legiit Keywords is a keyword tool that tells you which pages to build.", lines[2]];
  assertEquals(openingMatches(named, { productName: "Legiit Keywords" }).filter((m) => m.tell === "unintroduced_product"), [], "named first, so 'it' is introduced");
  assertEquals(openingMatches(["Advertisers already put a price on every search worth ranking for.", "It's the cost per click in Google Ads. In the tool I use, that price sits on every keyword beside the searcher's intent."], { productName: "Legiit Keywords" }).map((m) => m.tell), ["unintroduced_product"]);
  assertEquals(openingMatches(["A water heater shows rust at the drain valve months before it floods.", "It takes a plumber ten minutes to check."], { productName: "Drainguard" }).filter((m) => m.tell === "unintroduced_product").length, 1, "'it takes' is read as the product's doing; the editor decides");
  assertEquals(openingMatches(["The page gets checked against the ten pages ranking right now.", "It's a different list every week."], { productName: "Drainguard" }).filter((m) => m.tell === "unintroduced_product"), []);

  const r = analyzeDraft([sec("lead_in", [blk("h", lines[0], "hook"), blk("p1", lines[1]), blk("p2", lines[2])]), sec("main", [blk("m", "Legiit Keywords is a keyword tool that tells you which pages to build and writes them.")])], FORMATS.organic_social, { productName: "Legiit Keywords" });
  const f = r.flags.find((x) => x.tell === "unintroduced_product")!;
  assertEquals([f.tier, f.count], [1, 1]);
  assert(f.examples[0].includes("Then it reads"), f.examples.join("|"));
  const rule = TELLS.find((x) => x.name === "unintroduced_product")!;
  assertEquals([rule.owner?.tell, rule.regex], [18, null]);
  assert(!analyzeDraft([sec("lead_in", [blk("h", lines[0], "hook"), blk("p1", lines[1]), blk("p2", lines[2])])], FORMATS.organic_social).flags.some((x) => x.tell === "unintroduced_product"));
});

Deno.test("the social post: the lead-in never carries the product, the main points introduce it in two sentences at most and never lecture", () => {
  const spec = FORMATS.organic_social;
  const lead = spec.sections.find((s) => s.id === "lead_in")!;
  const main = spec.sections.find((s) => s.id === "main")!;
  assert(lead.must.some((m) => m.includes("never the product's work: the product, by name, by \"it\" or by its own terms, waits for the main points")));
  assert(lead.must_not.some((m) => m.startsWith("the product named, used or pointed at")));
  assert(main.must.some((m) => m.includes("that sentence names the product, is the first sentence about it in the post, and survives every later edit")));
  assert(main.must.some((m) => m.startsWith("the mechanism in at most two short sentences")));
  assert(main.must.some((m) => m.startsWith("every paragraph stands on its own: the lead-in is chosen later from three")));
  for (const t of ["a lesson in how the reader's trade works", "two sentences built on one frame", "a pair of short sentences that land a moral"]) assert(main.must_not.some((m) => m.startsWith(t)), t);
  assertStringIncludes(FORMAT_SPECS, "in the main points, never in the lead-in, and that sentence survives every edit; the mechanism as one idea in the reader's words, in at most two short sentences (rule 1)");
  assertStringIncludes(FORMAT_SPECS, "a lesson in how the reader's trade works; two sentences built on one frame; a pair of short sentences that land a moral; the product named or pointed at in the lead-in;");
});

Deno.test("prompts: the tell edit reads for the lecture and the frame pair and keeps the speaker's call; revise and the copy chief protect the introduction", () => {
  assertEquals([tellEditPrompt.version, revisePrompt.version, editorialPrompt.version], [13, 15, 16]);
  for (const t of [`"lecture", in a short piece, a lesson in how the reader's trade works or a mechanism told in more than two sentences`, `"frame_pair", two sentences built on one frame`, `a pair of short sentences that land a moral or a verdict on the reader's way: "The writer did the job he was given. The research stopped one step early."`, `A first-person call ("I think the research is done when...", "I'd rather", "I built it to") is the speaker's conviction (rule 8), never a hedge`, "never rewritten as an instruction to the reader", "the main points' introduction sentence is never cut"]) assertStringIncludes(tellEditPrompt.system, t);
  assertEquals(TellEditAuditItem.parse({ ref: "main-2", line: "x", kind: "lecture", keep: false }).kind, "lecture");
  assertEquals(TellEditAuditItem.parse({ ref: "main-2", line: "x", kind: "frame_pair", keep: false }).kind, "frame_pair");
  for (const t of ["1. Change only the sentence a note quotes. Inside a quoted block, every sentence no note quotes is returned byte for byte as it was", "The sentence that introduces the product by name (rule 38) is never cut, merged away or rewritten unless a note quotes it", "(f) A rebuilt line stands on its own", "An example line in a note shows the move; the rebuilt line is written from a fact the piece holds"]) assertStringIncludes(revisePrompt.system, t);
  assert(!revisePrompt.system.includes("1. Change only blocks a note quotes."));
  for (const t of ["goes in DO NOT TOUCH unless THE ONE THING is about that sentence", "never to rebuild the block that holds the introduction and never to move the introduction into the lead-in", "Gate D also fails a lesson in how the reader's trade works, a mechanism told in more than two short sentences, two sentences built on one frame"]) assertStringIncludes(editorialPrompt.system, t);
});
