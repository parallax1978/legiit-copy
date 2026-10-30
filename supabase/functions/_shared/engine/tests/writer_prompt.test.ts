/**
 * The writer's prompt (draft v19, revise v19): short, in the register of the copy it asks for, with whole exemplars
 * the detector passes, the material said plainly once, the facts deduped, short pieces written whole.
 */
import { assert, assertEquals } from "@std/assert";
import { draftPrompt, NEVER, WRITER, writerTells, type DraftArgs } from "../prompts/draft.v19.ts";
import { revisePrompt } from "../prompts/revise.v19.ts";
import { OWNER_TELLS } from "../prompts/standard.ts";
import { SOCIAL_EXEMPLARS } from "../prompts/exemplars/social.ts";
import { EMAIL_EXEMPLARS } from "../prompts/exemplars/email.ts";
import { AD_EXEMPLARS } from "../prompts/exemplars/ad.ts";
import { VIDEO_EXEMPLARS } from "../prompts/exemplars/video.ts";
import { MESSAGE_EXEMPLARS } from "../prompts/exemplars/message.ts";
import { allExemplarTexts, exemplarsText } from "../prompts/exemplars/index.ts";
import { analyzeText, automatedReadabilityIndex, exemplarCopies, hemingwayGrade, GRADE_CEILING } from "../tells.ts";
import { FORMATS } from "../formats/index.ts";
import { planDraft } from "../draft/plan.ts";
import { dealText, factsText, SAME_FACT_SHARE, writerClaims } from "../draft/brief_text.ts";
import type { ClaimRow, StepContext } from "../steps/types.ts";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

Deno.test("the drafter's system text is short, starts with how the masters wrote, and carries the owner's tells", () => {
  const s = draftPrompt.system;
  assert(words(s) < 4000, `system is ${words(s)} words`);
  assert(s.startsWith("You write direct response copy the way the masters wrote it: Schwartz, Halbert, Carlton, Makepeace, Bencivenga, Caples, Ogilvy, Sugarman, Collier and Hopkins."));
  assert(s.indexOf(WRITER) < s.indexOf(NEVER) && s.indexOf(NEVER) < s.indexOf(writerTells()), "the writer first, then what sends a draft back, then the owner's list");
  assert(OWNER_TELLS.startsWith(writerTells()) && writerTells().includes("Exempt: words inside a quotation") && !writerTells().includes("Structure:") && !s.includes("The tell edit.") && !s.includes("Scoring:"), "the owner's table and word lists, without the editor's structure notes and scoring");
  assert(s.includes("a confession that a proof, a result, a review or a customer does not exist yet"), "no admissions");
  for (const row of ["| 18 |", "| 20 | A namedrop", "| 21 | A wait the reader would sit through", "| 22 |", "| 23 |"]) assert(s.includes(row), row);
  assert(!s.includes("accomplish: do;"), "the word table is the editor's, not the writer's");
  assert(!/[–—]/.test(WRITER + NEVER), "no dashes in the writer's text");
  assertEquals(draftPrompt.version, 19);
  assertEquals(revisePrompt.version, 19);
  assert(revisePrompt.system.startsWith(WRITER) && revisePrompt.system.includes("You change only the lines the notes quote or name") && revisePrompt.system.includes("| 21 | A wait"), "the reviser reads the same writer's prompt");
  assert(words(revisePrompt.system) < 4500, `revise system is ${words(revisePrompt.system)} words`);
});

Deno.test("every social exemplar passes the detector and reads at the social grade or below, and the copy check knows its sentences", () => {
  const ceiling = GRADE_CEILING.social;
  assert(SOCIAL_EXEMPLARS.length >= 5);
  for (const x of SOCIAL_EXEMPLARS) {
    const r = analyzeText(x.text, { format: FORMATS.organic_social });
    const other = r.flags.filter((f) => f.tell !== "copied_exemplar");
    assertEquals(other.map((f) => `${f.tell}: ${f.examples.join(" | ")}`), [], `${x.master}: tells`);
    const ari = automatedReadabilityIndex(x.text);
    assert(ari !== null && hemingwayGrade(ari) <= ceiling, `${x.master}: grade ${ari}`);
    assert(words(x.text) >= 120 && words(x.text) <= 320, `${x.master}: ${words(x.text)} words`);
    assert(!/[–—]/.test(x.text + (x.first_comment ?? "")), `${x.master}: dash`);
    assert(x.move.length > 40 && x.first_comment, `${x.master}: move and first comment`);
    // the piece is the copy guard's own exemplar: six words in a row from it are caught
    assert(exemplarCopies(x.text.split("\n")[0]).length > 0, `${x.master}: its first line is known to the copy check`);
  }
  assert(allExemplarTexts().length >= 23);
  // the emails and the ads pass their own family's detector and grade
  for (const [xs, spec, lo, hi] of [[EMAIL_EXEMPLARS, FORMATS.email_single, 150, 400], [AD_EXEMPLARS, FORMATS.meta_ad, 40, 120], [VIDEO_EXEMPLARS, FORMATS.tiktok_reels, 40, 100], [MESSAGE_EXEMPLARS, FORMATS.sms, 12, 40]] as const) {
    assert(xs.length >= 3);
    for (const x of xs) {
      const body = x.text.replace(/^(Subject|Primary text|Headline|Description|Button): ?/gm, "").replace(/^\[[^\]]*\]\n/gm, "");
      const r = analyzeText(body, { format: spec });
      assertEquals(r.flags.filter((f) => f.tell !== "copied_exemplar").map((f) => `${f.tell}: ${f.examples.join(" | ")}`), [], `${spec.id} ${x.master}: tells`);
      const ari = automatedReadabilityIndex(body);
      assert(ari !== null && hemingwayGrade(ari) <= GRADE_CEILING[spec.family], `${spec.id} ${x.master}: grade ${ari}`);
      assert(words(body) >= lo && words(body) <= hi, `${spec.id} ${x.master}: ${words(body)} words`);
      assert(!/[\u2013\u2014]/.test(x.text), `${x.master}: dash`);
    }
  }
  assert(exemplarsText("email", "Single email").includes("In Bencivenga's manner") && exemplarsText("ad", "Meta ad").includes("In Caples's manner"));
  const t = exemplarsText("social", "Organic social post");
  assert(t.startsWith("HOW THIS KIND OF PIECE READS WHEN IT IS RIGHT (organic social posts from other trades"));
  assert(t.includes("In Halbert's manner") && t.includes("In Hopkins's manner"));
  assertEquals(exemplarsText("page", "Sales letter"), "", "no exemplars yet for a family writes nothing, never a placeholder");
});

const claim = (id: string, text: string, over: Partial<ClaimRow> = {}): ClaimRow => ({ id, claim_text: text, claim_type: "feature", role: "feature", evidence_grade: null, status: "unverified", user_decision: null, precision: null, evidence: {}, flag: null, ...over } as unknown as ClaimRow);

Deno.test("the writer's facts: the same fact once, the user's decided row kept, plan mechanics and legal terms left to the page that takes payment", () => {
  const rows = [
    claim("a1", "Premium: The posted credit price list, with credits that roll over: 100 credits a site plan, 25 a written page, 5 a keyword check, known before you run anything; unused plan credits stay in your balance, answering 'sneaky'", { role: "offer_term", claim_type: "price_discount" }),
    claim("a2", "Every price is posted before you run anything: 100 credits a site plan, 25 a written page, 5 a keyword check. Unused plan credits stay in your balance.", { role: "offer_term", claim_type: "price_discount" }),
    claim("b1", "$1 today for 7 days, one site plan included. Then Pro is $59 a month: 300 credits, three site plans.", { role: "offer_term", claim_type: "continuity_trial" }),
    claim("b2", "$1 for 7 days of Pro, one site plan included. Your first decision shows today; the rest opens on day seven, when Pro starts, paid from 100 of its 300 credits. Pro then renews at $59 a month until you cancel.", { role: "offer_term", claim_type: "continuity_trial", user_decision: "keep" }),
    claim("c1", "Liability is limited to the amount paid in the twelve months before the claim.", { role: "offer_term", claim_type: "other" }),
    claim("d1", "Says skip when you cannot win.", { role: "feature" }),
    claim("d2", "Says skip when you cannot win.", { role: "feature", user_decision: "drop" }),
    claim("e1", "Agency $199/mo: 12 site plans a month (1,200 credits), or a Large topical map of up to 300 pages.", { role: "offer_term", claim_type: "continuity_trial" }),
  ];
  const social = writerClaims(rows, FORMATS.organic_social).map((c) => c.id);
  assertEquals(social, ["b2", "d1"], "credit mechanics and the legal line stay off a post; the user's kept $1 row replaces the engine's duplicate");
  const letter = writerClaims(rows, FORMATS.sales_letter).map((c) => c.id);
  assertEquals(letter, ["a1", "b2", "c1", "d1", "e1"], "a page that takes payment reads the terms, each fact once");
  assert(SAME_FACT_SHARE >= 0.5 && SAME_FACT_SHARE <= 0.8);
  const facts = factsText(rows, FORMATS.organic_social);
  assert(facts.startsWith("THE FACTS (every number, name, date, price, quote, result and credential the piece may use"));
  assert(facts.includes("- [[L:b2]] $1 for 7 days of Pro") && facts.includes("(the user decided: keep)") && !facts.includes("Premium:"), facts);
  const deal = dealText(null, null, rows, FORMATS.organic_social, { cta: "Click the link for a $1 trial" });
  assert(deal.startsWith("THE DEAL (this organic social post takes no payment, so it says the deal once, in one plain line"));
  assert(deal.includes("[[L:b2]]") && deal.includes("The user's call to action: Click the link for a $1 trial") && !deal.includes("Agency"), deal);
});

function ctx(): StepContext {
  return {
    db: {} as StepContext["db"],
    generation: { id: "g", workspace_id: "w", options: { purpose: "convince SEO pros their keyword tool picks losing pages", cta: "Link in the comments for a $1 trial", length: "longer" } } as unknown as StepContext["generation"],
    offer: { id: "o", name: "Legiit Keywords", setup: { speaker_name: "Chris M. Walker", speaker_role: "Founder, Legiit", reader: "SEO freelancers and agencies", product_sentence: "You give it your site and it tells you which pages to build, with the proof, and writes them." }, audience: null, positioning: null } as unknown as StepContext["offer"],
    brief: null,
    claims: [claim("f1", "Says skip when you cannot win.", { evidence_grade: "F" })],
    config: null,
    questions: [],
    variant: null,
    dossier: null,
    voice: null,
    format: FORMATS.organic_social,
    angles: [],
    winningAngle: null,
    drafts: [],
    latestDraft: null,
    stepOutputs: {},
    revisionCycles: 0,
    attempt: 1,
    promptVersions: {},
    progress: () => Promise.resolve(),
    partial: null,
    savePartial: () => Promise.resolve(),
    timeBudgetMs: 1,
    startedAt: 0,
  };
}

Deno.test("the drafter's user message: the material said once in plain headers, the exemplars, the break, then the job; no lecture in a header", () => {
  const c = ctx();
  const plan = planDraft(FORMATS.organic_social);
  const args: DraftArgs = { call: plan.calls[0], callIndex: 1, callTotal: 1, awareness: "solution_aware", segment: null, sophistication: "4", thesis: "the thesis", argumentText: "", drafted: [], leads: null, leadTypes: ["promise", "secret", "proclamation"], examplesText: "", retryNote: null };
  const u = draftPrompt.user(c, args);
  const order = ["WHO IS TALKING, TO WHOM, AND WHAT THIS PIECE MUST DO", "Speaker: Chris M. Walker, Founder, Legiit.", "Reader: SEO freelancers and agencies.", "What the user asked this piece to do: convince SEO pros", "The call to action the user asked for: Link in the comments", "THE IDEA", "THE PRODUCT\nLegiit Keywords: You give it your site", "THE FACTS", "- [[L:f1]] Says skip when you cannot win. (grade F: the seller's own statement)", "THE DEAL", "VOICE: his own.", "THE PIECE: Organic social post", "Length: the user asked for a longer piece.", "HOW THIS KIND OF PIECE READS WHEN IT IS RIGHT", "<<<cache-break>>>", "YOUR JOB NOW:\nWrite the whole piece now, start to finish, as one piece of talk from Chris M. Walker to this reader: lead_in (20 to 70 words), main (30 to 280 words), cta (4 to 25 words), first_comment (3 to 30 words), in that order, 60 to 400 words in all.", "lead-a: promise (the result he wants, with its reason beside it); lead-b: secret", `"leads":[{"id":"lead-a"`];
  let at = -1;
  for (const piece of order) {
    const i = u.indexOf(piece, at + 1);
    assert(i > at, `missing or out of order: ${piece}`);
    at = i;
  }
  for (const lecture of ["CLAIMS LEDGER (", "rule 11", "rule 20", "docs/04", "RESEARCH DOSSIER", "APPROVED OFFER BLOCK", "OFFER CONFIG", "TARGET SEGMENT"]) assert(!u.includes(lecture), `lecture in the writer's material: ${lecture}`);
  assert(words(u) < 4000, `user message is ${words(u)} words with one fact and no dossier`);
  assert(u.includes("WHAT HE HAS SAID: nothing on file."), "no dossier is said plainly");
});
