/**
 * The long page specs (sales letter, advertorial, short landing page) rebuilt from the masters' format research and
 * the owner's verdicts of 30 October ("technical and not emotional", "WTF is a difficulty number?", "What is it?",
 * a lecture on his own trade, nothing like the masters): each section's job says what the part does for the reader,
 * the opening feels before it informs, the body uses plain words, the product is introduced in one plain sentence,
 * an empty proof slot never confesses or asks, and no must pushes the rejected opening shapes, a namedrop, a wait or
 * a metric's name. The register is the drafter's: short plain text, examples from another trade.
 */
import { assert, assertEquals } from "@std/assert";
import { FORMATS } from "../formats/index.ts";
import { planDraft } from "../draft/plan.ts";

const PAGES = [FORMATS.sales_letter, FORMATS.advertorial, FORMATS.landing_page_short] as const;
const section = (spec: (typeof PAGES)[number], id: string) => {
  const s = spec.sections.find((x) => x.id === id);
  assert(s, `${spec.id}: no section ${id}`);
  return s;
};
const texts = (spec: (typeof PAGES)[number]) => [spec.description, ...spec.sections.flatMap((s) => [s.name, s.job, ...s.must, ...s.must_not])];

Deno.test("long pages: the writer-facing text is short and plain, from another trade, with no dashes", () => {
  for (const spec of PAGES) {
    for (const t of texts(spec)) {
      assert(!/[–—]/.test(t), `${spec.id}: dash in "${t}"`);
      assert(!/backlink|Legiit|SEO|keyword tool|search volume|difficulty/i.test(t), `${spec.id}: the owner's trade in "${t}"`);
      assert(!/how long|arrives when|within \d+ minutes/i.test(t), `${spec.id}: a wait in "${t}"`);
    }
    for (const s of spec.sections) {
      assert(s.job.split(/(?<=[.!?])\s+/).length <= 5 && s.job.length <= 400, `${spec.id}.${s.id}: job too long`);
      assert(s.must.length <= 6 && s.must_not.length <= 9, `${spec.id}.${s.id}: ${s.must.length} musts, ${s.must_not.length} must-nots`);
      for (const m of s.must) assert(m.length <= 280, `${spec.id}.${s.id}: must too long: ${m}`);
      for (const m of s.must_not) assert(m.length <= 200, `${spec.id}.${s.id}: must-not too long: ${m}`);
    }
  }
});

Deno.test("long pages: the opening feels first and never takes the rejected shapes; the body uses plain words and never lectures", () => {
  const openings = [section(FORMATS.sales_letter, "lead"), section(FORMATS.advertorial, "lead"), section(FORMATS.landing_page_short, "headline")];
  for (const s of openings) {
    assert(s.must.length >= 4, `${s.id}: ${s.must.length} musts`);
    assert(s.must.some((m) => /\(rule 39\)/.test(m) && /said as the thing itself|so he feels it/.test(m)), `${s.id}: no feeling must`);
    assert(s.must_not.some((m) => /tells 14 to 17/.test(m)), `${s.id}: the four opening shapes are not named`);
    assert(s.must_not.some((m) => /metric's name/.test(m)), `${s.id}: a metric's name is not banned`);
    assert(!s.must.some((m) => /open loop$|credential|founder/i.test(m)), `${s.id}: a must pushes a teaser or a credential`);
  }
  for (const s of [section(FORMATS.sales_letter, "lead"), section(FORMATS.advertorial, "lead")]) {
    assert(s.must.some((m) => m.startsWith("line one opens on one fact with one opening move from Section 3")), s.id);
    assert(s.must_not.some((m) => /pointed at/.test(m)), `${s.id}: the product pointed at before it is introduced is not banned`);
    assert(s.must_not.some((m) => /lesson in how his trade works/.test(m)), s.id);
  }
  const bodies = [section(FORMATS.sales_letter, "problem_mechanism"), section(FORMATS.sales_letter, "build_up"), section(FORMATS.advertorial, "usual_fixes"), section(FORMATS.landing_page_short, "benefits")];
  for (const s of bodies) {
    assert(s.must.length >= 4 && s.must.length <= 6, `${s.id}: ${s.must.length} musts`);
    assert(s.must.some((m) => /\(rule 40\)/.test(m)), `${s.id}: no plain-words must`);
    assert(s.must.some((m) => /\(rule 39\)|rules 37, 39/.test(m)), `${s.id}: no feeling must`);
    assert(s.must_not.some((m) => /lesson in how his trade works/.test(m)), `${s.id}: the lecture is not banned`);
    assert(s.must_not.some((m) => /metric's name/.test(m)), `${s.id}: a metric's name is not banned`);
  }
});

Deno.test("long pages: the product is introduced in one plain sentence, proof never invents, confesses or asks, and the pushers are gone", () => {
  for (const s of [section(FORMATS.sales_letter, "build_up"), section(FORMATS.advertorial, "turn"), section(FORMATS.landing_page_short, "benefits")]) {
    assert(s.must.some((m) => /one plain sentence/.test(m) && /\(rule 38\)/.test(m)), `${s.id}: no introduction must`);
  }
  assert(section(FORMATS.advertorial, "turn").must_not.some((m) => m.startsWith("the product pointed at as 'it'")));
  for (const s of [section(FORMATS.sales_letter, "proof"), section(FORMATS.advertorial, "proof"), section(FORMATS.landing_page_short, "proof_strip")]) {
    assert(s.must.some((m) => m.startsWith("with none on file")), `${s.id}: no rule for an empty slot`);
    assert(s.must_not.some((m) => /missing, or asks for/.test(m)), `${s.id}: a confession or a request is not banned`);
    assert(s.must_not.some((m) => /invented/.test(m)), `${s.id}: invention is not banned`);
    assert(s.must_not.some((m) => /placeholder/.test(m)), `${s.id}: a placeholder is not banned`);
  }
  assert(section(FORMATS.advertorial, "byline").job.includes("With no narrator on file, the speaker writes in the first person."));
  assert(section(FORMATS.sales_letter, "credibility").must_not.some((m) => /namedrop/.test(m)));
  for (const s of [section(FORMATS.sales_letter, "urgency"), section(FORMATS.sales_letter, "close"), section(FORMATS.advertorial, "offer_links"), section(FORMATS.landing_page_short, "cta_primary")]) {
    assert(s.must_not.some((m) => /\(tell 21\)/.test(m)), `${s.id}: a wait is not banned`);
  }
  // the pushers the audit named
  assert(!FORMATS.sales_letter.description.includes("Skim path must sell alone"));
  assert(!/claim, reason, proof, picture/.test(section(FORMATS.sales_letter, "build_up").job));
  assert(!/claim, reason, proof, picture/.test(section(FORMATS.landing_page_short, "benefits").job));
  assert(!FORMATS.advertorial.description.startsWith("Editorial voice"));
  assert(!section(FORMATS.sales_letter, "credibility").job.startsWith("Who is talking"));
  assert(section(FORMATS.sales_letter, "lead").job.includes("a loop the letter closes later"));
  assert(section(FORMATS.sales_letter, "close").must.some((m) => m.startsWith("the ask three times, each in new words")));
  assert(section(FORMATS.sales_letter, "ps").must[0].startsWith("one fact the letter has not used"));
  assert(section(FORMATS.landing_page_short, "objections").must_not.some((m) => /\(tell 3\)/.test(m)));
  assert(section(FORMATS.landing_page_short, "cta_repeat").must.some((m) => m.startsWith("in new words")));
});

Deno.test("long pages: ids, bands, gates and the draft plan are unchanged, and the landing page refuses a Submit button", () => {
  assertEquals(FORMATS.sales_letter.sections.map((s) => s.id), ["headline", "lead", "credibility", "problem_mechanism", "solution_mechanism", "build_up", "proof", "offer", "price", "guarantee", "urgency", "close", "ps"]);
  assertEquals(FORMATS.advertorial.sections.map((s) => s.id), ["label", "headline", "byline", "lead", "usual_fixes", "listicle_items", "mechanism", "proof", "turn", "offer_links"]);
  assertEquals(FORMATS.landing_page_short.sections.map((s) => s.id), ["headline", "subhead", "cta_primary", "benefits", "proof_strip", "objections", "demo_offer", "cta_repeat"]);
  assertEquals(FORMATS.sales_letter.hard_gates, ["page.cta_count>=3", "page.close_share>=0.15", "page.speaker_by_word<=150", "page.no_markdown_headings"]);
  assertEquals(FORMATS.advertorial.hard_gates, ["advertorial.ftc_label", "advertorial.cta_count>=2", "page.no_markdown_headings"]);
  assertEquals(FORMATS.landing_page_short.hard_gates, ["page.cta_count>=2", "page.no_submit_button", "page.no_markdown_headings"]);
  assertEquals(planDraft(FORMATS.sales_letter).calls.map((c) => c.units.map((u) => u.id)), [["offer", "price", "guarantee", "urgency"], ["close", "ps"], ["build_up"], ["proof", "problem_mechanism"], ["solution_mechanism", "credibility"], ["lead"], ["headline"]]);
  assertEquals(planDraft(FORMATS.advertorial).calls.map((c) => c.kind), ["sections", "sections", "leads", "headline"]);
  assertEquals(planDraft(FORMATS.landing_page_short).calls.length, 1);
  assertEquals([FORMATS.sales_letter.standard_section, FORMATS.advertorial.standard_section, FORMATS.landing_page_short.standard_section], ["Long-form sales letter", "Advertorial and native landing page", "Short landing page, product-aware"]);
});
