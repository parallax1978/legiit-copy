/**
 * The owner on the post of 30 October: "WTF is a difficulty number?", "What is it?", "7th grade level is way too
 * sophisticated", "technical and not emotional", "didn't follow the research on the legendary copywriters AT ALL".
 * Rules 39 (feeling first) and 40 (plain words), the writer's brief at the top of the drafter's instructions, the
 * reading-grade ceiling and the metric-name tell by machine, the jargon audit, the cold read's feeling, and the social
 * spec written short and plain.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { analyzeText, fleschKincaidGrade, GRADE_CEILING, metricNamePattern, TELLS } from "../tells.ts";
import { FORMATS } from "../formats/index.ts";
import { COPY_CHIEF_RUBRIC, FORMAT_SPECS, OWNER_TELLS, RULES } from "../prompts/standard.ts";
import { draftPrompt, plainJob, WRITERS_BRIEF } from "../prompts/draft.v16.ts";
import { tellEditPrompt } from "../prompts/tell_edit.v14.ts";
import { revisePrompt } from "../prompts/revise.v16.ts";
import { editorialPrompt } from "../prompts/editorial.v17.ts";
import { coldReadPrompt } from "../prompts/cold_read.v3.ts";
import { ColdRead } from "../schemas/review.ts";
import { TellEditAuditItem } from "../schemas/tell_edit.ts";

const NAMES = ["Ahrefs", "Semrush", "Google", "volume", "difficulty"];

Deno.test("the standard: feeling first and plain words are rules, gates and a row in the owner's list", () => {
  assertStringIncludes(RULES, "39. Feeling first. Copy cannot make a reader want something");
  assertStringIncludes(RULES, "A paragraph that informs and makes him feel nothing is a report, not copy");
  assertStringIncludes(RULES, "40. Plain words. The reader is scrolling or skimming, cold. A short piece uses words a ten-year-old knows, at the sixth grade or below");
  assertStringIncludes(COPY_CHIEF_RUBRIC, "if the opening carries no feeling the reader recognizes (rule 39), or a word a cold reader would ask about (rule 40)");
  assertStringIncludes(COPY_CHIEF_RUBRIC, "a reading grade above the format's ceiling (rule 40; the mechanical report's grade), or a run of paragraphs that inform and make the reader feel nothing (rule 39)");
  assertStringIncludes(COPY_CHIEF_RUBRIC, "a direction for a flat line names the feeling it should carry and the moment from the research that carries it (rule 39)");
  assertStringIncludes(OWNER_TELLS, "| 22 | A metric's name, a tool's term or a product label a cold reader would ask about");
  assertStringIncludes(FORMAT_SPECS, "Organic social. One named person posting to the people who follow him, about the thing that bothers them, in the words they use with a friend.");
  assertStringIncludes(FORMAT_SPECS, "Words a ten-year-old knows (rule 40), feeling in every paragraph (rule 39)");
});

Deno.test("the drafter reads the writer's brief before the rulebook, and line one asks for plain words and the feeling", () => {
  assertEquals(draftPrompt.version, 16);
  assert(draftPrompt.system.startsWith("## How to write this (read before the rules below)"), draftPrompt.system.slice(0, 80));
  assert(draftPrompt.system.indexOf(WRITERS_BRIEF) < draftPrompt.system.indexOf("## 1. The standard"));
  for (const t of ["Start inside his head. He is not thinking about the product.", "Then the product in one plain sentence with its name", "Every fact is there to make him feel something", "Words a ten-year-old knows; sentences short, with one long one where the feeling needs it.", "The rules below are the desk's checklist, checked after you write."]) assertStringIncludes(WRITERS_BRIEF, t);
  assert(!/[–—]/.test(WRITERS_BRIEF));
  const v14 = `x Line one: one thought; a first sentence of about twelve words or fewer (an If-clause carrying the reader's own want may run longer); a concrete thing from the reader's world or a ledger number; said as the speaker would say it to one reader across a table. y`;
  const out = plainJob(v14);
  assertStringIncludes(out, "Line one: one thought, in words a ten-year-old knows (no metric's name, no term from his tool, no label from the product, nothing a cold reader would stop and ask about)");
  assertStringIncludes(out, "the moment he recognizes or a ledger number, with the feeling in it (rule 39)");
  assertEquals(plainJob("a sections call"), "a sections call");
});

Deno.test("the reading grade is a ceiling by family, and a metric's name is the owner's tell 22", () => {
  assertEquals([GRADE_CEILING.social, GRADE_CEILING.email, GRADE_CEILING.page], [6.5, 6.5, 8.0]);
  const lecture = "The determination of attainable rankings necessitates a comparative evaluation of the competitive landscape, incorporating authority metrics, relevance signals and the commercial intention underlying each individual query, before any editorial investment is authorised.";
  const prose = Array(3).fill(lecture).join(" ");
  const grade = fleschKincaidGrade(prose)!;
  assert(grade > 12, String(grade));
  const r = analyzeText(prose, { format: FORMATS.organic_social, toolNames: NAMES });
  assert(r.hard_fail_reasons.some((x) => x.startsWith(`readability: grade ${grade.toFixed(1)} is above the social ceiling of 6.5`)), r.hard_fail_reasons.join("; "));
  assert(!analyzeText(prose, { format: FORMATS.sales_letter, toolNames: NAMES }).hard_fail_reasons.some((x) => x.startsWith("readability")) || grade > 8, "a page has the eighth grade as its ceiling");
  const plain = "Ever write ten pages for a client and watch eight of them go nowhere? I did, for years. The page went up. Nothing. Three months later the client asks where the traffic is, and you are the one explaining Google. Legiit Keywords is a keyword tool that looks at what is already ranking for each search, tells you which pages your site can win and which ones will pay, and then writes the page. Try it on your own site for a dollar.";
  assert(fleschKincaidGrade(plain)! < 6.5);
  assert(!analyzeText(plain, { format: FORMATS.organic_social, toolNames: NAMES }).hard_fail_reasons.some((x) => x.startsWith("readability")));
  // short text: the grade is noise and never a failure
  assert(!analyzeText(lecture.split(" ").slice(0, 20).join(" "), { format: FORMATS.organic_social }).hard_fail_reasons.some((x) => x.startsWith("readability")));

  const re = metricNamePattern(NAMES);
  for (const [t, n] of [["a difficulty number", 1], ["the search volume", 1], ["keyword difficulty", 1], ["a quality score", 1], ["your phone number", 0], ["two thousand keywords with scores", 0], ["the volume of calls", 0], ["the number your keyword tool gives each search", 0], ["a difficulty score of 12", 1], ["the first number on the list", 0]] as const) {
    assertEquals((t.match(re) ?? []).length, n, t);
  }
  const rule = TELLS.find((x) => x.name === "metric_name")!;
  assertEquals([rule.tier, rule.owner?.tell, rule.families?.includes("social"), rule.families?.includes("page")], [1, 22, true, false]);
  const post = analyzeText("How many of your pages did someone pick off a difficulty number?\n\nWhoever picked them had a number to interpret and no idea what the pages already ranking there said.", { format: FORMATS.organic_social, toolNames: NAMES });
  const f = post.flags.find((x) => x.tell === "metric_name")!;
  assertEquals(f.count, 1);
  assert(f.examples[0].includes("difficulty number"));
  assert(!analyzeText("How many of your pages did someone pick off a difficulty number?", { format: FORMATS.sales_letter, toolNames: NAMES }).flags.some((x) => x.tell === "metric_name"), "a long page is not read for it");
});

Deno.test("the social spec is short and plain: the lead-in feels and never names the product, the main points name it and never lecture", () => {
  const spec = FORMATS.organic_social;
  const lead = spec.sections.find((s) => s.id === "lead_in")!;
  const main = spec.sections.find((s) => s.id === "main")!;
  assert(lead.job.startsWith("Stop him with the moment he recognizes, said in his own words so he feels it"));
  assert(lead.must.length <= 4 && lead.must_not.length <= 9, `${lead.must.length} musts, ${lead.must_not.length} must-nots`);
  assert(main.must.length <= 6 && main.must_not.length <= 9, `${main.must.length} musts, ${main.must_not.length} must-nots`);
  assert(lead.must.some((m) => m.startsWith("a feeling the research holds")));
  assert(lead.must_not.some((m) => m.startsWith("the product named, used or pointed at")));
  assert(lead.must_not.some((m) => m.startsWith("a metric's name, a term from his tool")));
  assert(main.must.some((m) => m.startsWith("the turn: what the speaker saw, found or built")));
  assert(main.must.some((m) => m.includes("that sentence is the first sentence about the product in the post and survives every later edit")));
  assert(main.must.some((m) => m.startsWith("words a ten-year-old knows")));
  assert(main.must_not.some((m) => m.startsWith("a paragraph that informs and makes him feel nothing")));
  assert(main.must_not.some((m) => m.startsWith("a lesson in how his trade works")));
  for (const s of spec.sections) for (const t of [s.job, ...s.must, ...s.must_not]) assert(!/[–—]/.test(t) && !/backlink|Legiit|SEO|keyword tool/i.test(t), t);
});

Deno.test("the editors: the tell edit reads for jargon and never raises the grade, the reviser fixes the grade and the flat line, the copy chief reads for feeling, the cold read says what he felt", () => {
  assertEquals([tellEditPrompt.version, revisePrompt.version, editorialPrompt.version, coldReadPrompt.version], [14, 16, 17, 3]);
  assertStringIncludes(tellEditPrompt.system, `"jargon", a word a cold reader outside the trade would stop at`);
  assertStringIncludes(tellEditPrompt.system, "Every edit keeps the reading grade where it is or lowers it (rule 40)");
  assertEquals(TellEditAuditItem.parse({ ref: "lead-a-1", line: "x", kind: "jargon", keep: false }).kind, "jargon");
  assertStringIncludes(revisePrompt.system, "(g) A readability failure in the mechanical report (rule 40) is fixed on the lines the notes quote with shorter words and shorter sentences, every fact and tag kept");
  assertStringIncludes(revisePrompt.system, "A flat line a note names gets the feeling the research holds");
  assertStringIncludes(editorialPrompt.system, "read it once as the reader on his phone and write down for yourself what he feels at line one and at the turn");
  assertStringIncludes(editorialPrompt.system, "Nothing felt fails Gate B (rule 39)");
  assertStringIncludes(coldReadPrompt.system, "- felt: what you felt at the first line and at the point where the product came in");
  assertStringIncludes(coldReadPrompt.system, "- stumbled: every word or phrase you had to stop and decode as someone who does not work in this trade");
  assertStringIncludes(coldReadPrompt.system, "Pick the one you felt something at; a line you had to decode (a term from a tool, a number's name) pushes you away.");
  const parsed = ColdRead.parse({ skim_readback: { what_sold: "x", to_whom: "y", price: "z", why_believe: "w" }, attention_drop_line: null, disbelieved_claim: null, promise_one_sentence: "p", lead_pick: null });
  assertEquals([parsed.felt, parsed.stumbled], [null, []]);
  assertEquals(ColdRead.parse({ ...parsed, felt: "a pang", stumbled: ["difficulty number"] }).stumbled, ["difficulty number"]);
});
