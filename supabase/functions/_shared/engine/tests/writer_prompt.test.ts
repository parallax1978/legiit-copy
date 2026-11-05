/**
 * The writer's prompt (draft v19, revise v19): short, in the register of the copy it asks for, with whole exemplars
 * the detector passes, the material said plainly once, the facts deduped, short pieces written whole.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
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
import { leadsWithinGrade } from "../draft/leads.ts";
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
  const planned = factsText([claim("p1", "A plan from one real run: Pull Shot Coffee, a planned espresso bean subscription. The full plan is public.", { claim_type: "narrative", role: "proof", evidence_grade: "E" })], FORMATS.organic_social);
  assert(planned.includes("the words that say it is planned, new or without a site yet are this line's wording, not the fact"), planned);
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
  const order = ["WHO IS TALKING, TO WHOM, AND WHAT THIS PIECE MUST DO", "Speaker: Chris M. Walker, Founder, Legiit.", "Reader: SEO freelancers and agencies.", "What the user asked this piece to do: convince SEO pros", "The call to action the user asked for: Link in the comments", "THE IDEA", "THE PRODUCT\nLegiit Keywords: You give it your site", "THE FACTS", "- [[L:f1]] Says skip when you cannot win. (grade F: the seller's own statement)", "THE DEAL", "VOICE: his own.", "THE PIECE: Organic social post", "Length: the user asked for a longer piece.", "HOW THIS KIND OF PIECE READS WHEN IT IS RIGHT", "<<<cache-break>>>", "YOUR JOB NOW:\nWrite the whole piece now, start to finish, as one piece of talk from Chris M. Walker to this reader: lead_in (20 to 70 words), main (30 to 280 words), cta (4 to 25 words), first_comment (3 to 30 words), in that order, 60 to 400 words in all.", "lead-a: promise (the result he wants, said to him (you), with its reason beside it; never the speaker wanting it); lead-b: secret", `"leads":[{"id":"lead-a"`];
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

Deno.test("an opening two grades over the ceiling loses to one within a grade of it before the cold reader sees them; all three go when every one is over", () => {
  const plain = { id: "lead-a", text: "Half the pages I ever paid writers for never earned a dime. I picked them off a list, easy ones first, sent the brief, and waited. The pages that made money sat where the site could win." };
  const dense = { id: "lead-b", text: "The determination of attainable rankings necessitates a comparative evaluation of the competitive landscape, incorporating authority metrics and the commercial intention underlying each individual query before any editorial investment is authorised." };
  const tiny = { id: "lead-c", text: "Count your stars." };
  assertEquals(leadsWithinGrade([plain, dense, tiny], FORMATS.organic_social).map((l) => l.id), ["lead-a", "lead-c"], "the dense opening is dropped, the tiny one is not graded");
  assertEquals(leadsWithinGrade([dense, { ...dense, id: "lead-d" }], FORMATS.organic_social).map((l) => l.id), ["lead-b", "lead-d"], "every opening over the grade: all go to the reader");
  assertEquals(leadsWithinGrade([plain, dense], FORMATS.sales_letter).length, 1, "a page has Grade 8 as its ceiling; the dense opening is still over it");
});

Deno.test("the engine writes the product sentence itself: the argument step returns it once, the drafter prefers the user's, then the argument's, then the brief's", async () => {
  const { default: argumentV21, PRODUCT_SENTENCE_RULE, productSentenceJob } = await import("../prompts/argument.v21.ts");
  const { default: argumentV20 } = await import("../prompts/argument.v20.ts");
  const { ArgumentOutput } = await import("../schemas/argument.ts");
  const { CandidatesOutput } = await import("../argument/candidates.ts");
  const { productText } = await import("../draft/brief_text.ts");
  assertEquals(argumentV21.version, 21);
  assert(argumentV21.system.includes(PRODUCT_SENTENCE_RULE) && argumentV21.system.indexOf(PRODUCT_SENTENCE_RULE) < argumentV21.system.indexOf("- Each candidate carries: id (A01, A02, ...);"));
  assert(PRODUCT_SENTENCE_RULE.includes(`software is a tool or an app, never "a service"`) && PRODUCT_SENTENCE_RULE.includes("When <setup> gives a product sentence, product_sentence is that sentence as given"));
  assert(!argumentV20.system.includes("product_sentence"), "version 20 is as it was");
  assertEquals(productSentenceJob("x Return cluster_vocabulary_used and candidates. y"), "x Return cluster_vocabulary_used, product_sentence and candidates. y");
  assertEquals(productSentenceJob("a scoring call"), "a scoring call");
  // old rows parse; the field defaults to null
  const parsed = CandidatesOutput.parse({ cluster_vocabulary_used: [], candidates: [] });
  assertEquals(parsed.product_sentence, null);
  assertEquals(ArgumentOutput.shape.product_sentence.parse(undefined), null);
  const offer = (setup: Record<string, unknown>) => ({ id: "o", name: "Legiit Keywords", setup, audience: null, positioning: null } as unknown as Parameters<typeof productText>[1]);
  const brief = { product_name: "Legiit Keywords", one_line: "A keyword research service that reads a website and returns a ranked plan of pages to build, improve or skip.", urls: [], competitors: [], unknowns: [], positioning: null } as unknown as Parameters<typeof productText>[0];
  assert(productText(brief, offer({ product_sentence: "Legiit Keywords is a tool that reads page one and writes the pages you can win." }), null, "the argument's sentence").includes("Legiit Keywords: Legiit Keywords is a tool that reads page one"), "the user's sentence first");
  assert(productText(brief, offer({}), null, "Legiit Keywords is a tool that tells you which pages to write and writes them.").includes("Legiit Keywords: Legiit Keywords is a tool that tells you which pages"), "then the argument's");
  assert(productText(brief, offer({}), null, null).includes("Legiit Keywords: A keyword research service that reads a website"), "then the brief's one line");
});

Deno.test("the intake writes the one line as a friend would say it and one row per decision an example shows", async () => {
  const { default: intakeV17 } = await import("../prompts/intake.v17.ts");
  assertEquals(intakeV17.version, 17);
  assert(intakeV17.system.includes(`software is a tool or an app, never "a service", and a service is people doing the work`));
  assert(intakeV17.system.includes("one row per decision for up to three decisions (role proof, story_claim true): the thing decided, the verdict, what it read or compared"));
});

Deno.test("spoken order: the writer (draft v20) reads each sentence aloud, the cold reader (v4) reports lines read twice, and the revision (v20) rewrites them as spoken", async () => {
  const { draftPrompt: draftV20, SPOKEN_ORDER, WRITER: WRITER_V20 } = await import("../prompts/draft.v20.ts");
  const { revisePrompt: reviseV20, REVISION_V20 } = await import("../prompts/revise.v20.ts");
  const { coldReadPrompt: coldV4, rereadShape } = await import("../prompts/cold_read.v4.ts");
  const { ColdRead } = await import("../schemas/review.ts");
  const { revisionQuotes } = await import("../draft/review.ts");
  assertEquals([draftV20.version, reviseV20.version, coldV4.version], [20, 20, 4]);
  assert(draftV20.system.includes(SPOKEN_ORDER) && draftV20.system.startsWith(WRITER_V20), "the spoken-order rule sits in the writer's words");
  assert(SPOKEN_ORDER.includes(`"You have to decide that yourself" is how a person says it; "You decide alone" is not.`));
  assert(!draftPrompt.system.includes("Every sentence in the order a person speaks it"), "version 19 is as it was");
  assert(reviseV20.system.startsWith(WRITER_V20) && reviseV20.system.includes(REVISION_V20) && REVISION_V20.includes("(f) every sentence a cold reader had to read twice"));
  assert(coldV4.system.includes("- reread: up to five sentences you had to read twice"));
  assertEquals(rereadShape(`x "promise_one_sentence":"", y`), `x "promise_one_sentence":"","felt":"","stumbled":[],"reread":[{"line":"","say_it":""}], y`);
  // old cold reads parse; the new field defaults to empty
  const old = ColdRead.parse({ skim_readback: { what_sold: "a", to_whom: "b", price: "c", why_believe: "d" }, attention_drop_line: null, disbelieved_claim: null, promise_one_sentence: "p", lead_pick: null });
  assertEquals(old.reread, []);
  const cold = ColdRead.parse({ ...old, reread: [{ line: "You decide alone which pages beat page one.", say_it: "You have to decide yourself which pages can beat page one." }] });
  assert(revisionQuotes({ editorial: null, factual: [], mechanical: null, coldRead: cold }).includes("You decide alone which pages beat page one."), "a line read twice may be changed");
  const c = ctx();
  const draft = { format: "organic_social", sections: [{ section_id: "main", title: null, blocks: [{ id: "main-1", type: "paragraph", text: "You decide alone which pages beat page one.", items: null, meta: null }] }], leads: null, chosen_lead_id: null, skim_path: [], ledger_refs_used: [], needs_source: [], word_count: 8 } as unknown as Parameters<typeof reviseV20.user>[1]["draft"];
  const u = reviseV20.user(c, { draft, editorial: null, factual: [], mechanical: null, coldRead: cold, cycle: 1, retryNote: null });
  assert(u.includes("SENTENCES A COLD READER HAD TO READ TWICE") && u.includes(`1. "You decide alone which pages beat page one."`) && u.includes("the reader would say: You have to decide yourself"), u.slice(u.indexOf("SENTENCES"), u.indexOf("SENTENCES") + 300));
  assert(u.indexOf("SENTENCES A COLD READER HAD TO READ TWICE") < u.indexOf("THE DRAFT (block ids in brackets"), "the lines come before the draft");
  const quiet = reviseV20.user(c, { draft, editorial: null, factual: [], mechanical: null, coldRead: old, cycle: 1, retryNote: null });
  assert(!quiet.includes("SENTENCES A COLD READER HAD TO READ TWICE"));
});

Deno.test("a thing is named the first time it appears: rule 40, the writer (draft v21), the reviser (v21), the cold reader (v5), and the rulebook readers bumped", async () => {
  const { RULES } = await import("../prompts/standard.ts");
  assert(RULES.includes(`A thing is named the first time it appears, never referred to as if he already knew it: "the list", "your last list", "that number"`));
  const { draftPrompt: d21, NAME_IT_FIRST, WRITER: W21 } = await import("../prompts/draft.v21.ts");
  const { revisePrompt: r21, REVISION_V21 } = await import("../prompts/revise.v21.ts");
  const { coldReadPrompt: c5 } = await import("../prompts/cold_read.v5.ts");
  assertEquals([d21.version, r21.version, c5.version], [21, 21, 5]);
  assert(d21.system.includes(NAME_IT_FIRST) && d21.system.startsWith(W21) && NAME_IT_FIRST.includes(`"Pick the easiest keyword on your last list" leaves him asking "what list?"`));
  assert(r21.system.startsWith(W21) && REVISION_V21.includes(`a line he could not place ("what list?") is rewritten naming the thing the first time`));
  assert(c5.system.includes(`a thing spoken of as if you already knew it ("the list", "your last list", "that number", "those ten pages")`));
  for (const [file, name, version] of [["argument.v22", "default", 22], ["editorial.v20", "editorialPrompt", 20], ["factual.v16", "factualPrompt", 16], ["intake.v18", "default", 18], ["offer.v19", "default", 19], ["research.v12", "default", 12], ["tell_edit.v17", "tellEditPrompt", 17]] as const) {
    const mod = await import(`../prompts/${file}.ts`);
    const p = mod[name] as { version: number; system: string };
    assertEquals(p.version, version, file);
  }
});

Deno.test("one fact never argues both ways: the writer (draft v22), the reviser (v22) and Gate C (editorial v21)", async () => {
  const { COPY_CHIEF_RUBRIC } = await import("../prompts/standard.ts");
  assert(COPY_CHIEF_RUBRIC.includes("if two proofs in one piece turn on the same fact pointing opposite ways"));
  const { draftPrompt: d22, ONE_FACT_ONE_WAY, WRITER: W22 } = await import("../prompts/draft.v22.ts");
  const { revisePrompt: r22 } = await import("../prompts/revise.v22.ts");
  const { editorialPrompt: e21 } = await import("../prompts/editorial.v21.ts");
  assertEquals([d22.version, r22.version, e21.version], [22, 22, 21]);
  assert(d22.system.includes(ONE_FACT_ONE_WAY) && d22.system.startsWith(W22) && r22.system.startsWith(W22));
  assert(ONE_FACT_ONE_WAY.includes("A Wikipedia page on page one cannot be the reason one page can win and, two lines later, the reason another cannot"));
  assert(e21.system.includes("if two proofs in one piece turn on the same fact pointing opposite ways"), "the copy chief reads the gate");
});

Deno.test("the discovery before the product: the shape in the writer's words (draft v23), Gate B (editorial v22), the social spec, and a gate on where the product is first named", async () => {
  const { COPY_CHIEF_RUBRIC, FORMAT_SPECS } = await import("../prompts/standard.ts");
  assert(COPY_CHIEF_RUBRIC.includes("a pitch before the discovery is a pitch, the discovery before the pitch is persuasion"));
  assert(FORMAT_SPECS.includes("Main points, in the order the masters built a case: the discovery before the product"));
  const { draftPrompt: d23, SHAPE, WRITER: W23 } = await import("../prompts/draft.v23.ts");
  const { revisePrompt: r23 } = await import("../prompts/revise.v23.ts");
  const { editorialPrompt: e22 } = await import("../prompts/editorial.v22.ts");
  assertEquals([d23.version, r23.version, e22.version], [23, 23, 22]);
  assert(d23.system.includes(SHAPE) && d23.system.startsWith(W23) && r23.system.startsWith(W23));
  assert(SHAPE.startsWith("The shape of the case, in the order the masters built one (Collier's start, Halbert's story, Schwartz's mechanism, Hopkins's reason-why, Sugarman's slide)"));
  assert(e22.system.includes("a pitch before the discovery is a pitch"));
  const { organic_social } = await import("../formats/specs/organic_social.ts");
  assert(organic_social.hard_gates.includes("organic_social.product_first_share>=0.3"));
  assert(organic_social.sections.find((x) => x.id === "main")!.must[0].startsWith("the discovery before the product"));
  // the gate: the product named in the first lines of a long post fails; after the middle passes; a short post is not read
  const { evaluateGates } = await import("../tells.ts");
  const { explainGate } = await import("../steps/draft.ts");
  const para = (id: string, text: string) => ({ id, type: "paragraph" as const, text, items: null, meta: null });
  const filler = Array.from({ length: 30 }, (_, i) => `Sentence ${i + 1} about the pages he builds and what they cost him.`).join(" "); // 330 words
  const early = [{ section_id: "lead_in", title: null, blocks: [para("l1", "So I built Legiit Keywords, an app that finds the pages you can win.")] }, { section_id: "main", title: null, blocks: [para("m1", filler)] }, { section_id: "cta", title: null, blocks: [{ id: "c1", type: "cta" as const, text: "Link in the first comment.", items: null, meta: null }] }];
  const r1 = evaluateGates(early, organic_social, { productName: "Legiit Keywords" });
  assert(r1.failures.some((f) => f.startsWith("organic_social.product_first_share>=0.3")), r1.failures.join("; "));
  assert(explainGate(r1.failures[0]).includes("the product is named too early"));
  const late = [{ section_id: "lead_in", title: null, blocks: [para("l1", "Half the pages I ever paid writers for never earned a dime.")] }, { section_id: "main", title: null, blocks: [para("m1", filler), para("m2", "So I built Legiit Keywords, an app that finds the pages you can win.")] }, { section_id: "cta", title: null, blocks: [{ id: "c1", type: "cta" as const, text: "Link in the first comment.", items: null, meta: null }] }];
  assert(!evaluateGates(late, organic_social, { productName: "Legiit Keywords" }).failures.some((f) => f.includes("product_first_share")));
  const short = [{ section_id: "lead_in", title: null, blocks: [para("l1", "So I built Legiit Keywords, an app that finds the pages you can win.")] }, { section_id: "main", title: null, blocks: [para("m1", "Short post.")] }, { section_id: "cta", title: null, blocks: [{ id: "c1", type: "cta" as const, text: "Link in the first comment.", items: null, meta: null }] }];
  assert(!evaluateGates(short, organic_social, { productName: "Legiit Keywords" }).failures.some((f) => f.includes("product_first_share")), "under 200 words the gate does not read");
  assert(!evaluateGates(early, organic_social).failures.some((f) => f.includes("product_first_share")), "without the product's name the gate does not read");
});

Deno.test("a piece is written in one master's manner: the user's choice or the family's default, his exemplar first, three openings as three ways in (draft v24, revise v24, Section 12)", async () => {
  const { DEFAULT_MANNER_BY_FAMILY, isMannerId, MANNER_IDS, MANNERS, openingManners, pickManner } = await import("../prompts/manners.ts");
  for (const id of MANNER_IDS) {
    const m = MANNERS[id];
    const three = openingManners(m);
    assertEquals(three[0], m);
    assertEquals(new Set(three.map((x) => x.lead_type)).size, 3, `${id}: three ways in take three lead types`);
    assert(m.way_in.length > 40 && m.move.length > 120 && !m.move.includes("—"), `${id}: the way in and the move are said`);
  }
  for (const [family, id] of Object.entries(DEFAULT_MANNER_BY_FAMILY)) assert(isMannerId(id), `${family}: a default manner`);
  assertEquals(pickManner(FORMATS.organic_social, undefined), { manner: MANNERS.halbert, chosenBy: "engine" });
  assertEquals(pickManner(FORMATS.organic_social, "schwartz"), { manner: MANNERS.schwartz, chosenBy: "user" });
  assertEquals(pickManner(FORMATS.organic_social, "nobody").chosenBy, "engine");
  const { parseOptions } = await import("../draft/options.ts");
  assertEquals(parseOptions({ manner: "carlton" }).manner, "carlton");
  assertEquals(parseOptions({ manner: "nobody" }).manner, undefined, "an unknown manner is no manner");
  const { exemplarInManner } = await import("../prompts/exemplars/index.ts");
  for (const id of MANNER_IDS) if (id !== "ogilvy") assert(exemplarInManner("social", MANNERS[id].master), `${MANNERS[id].master}: a piece to study`);
  // the format's own default when it has one, else the family's: the master the format research ranked first
  const { DEFAULT_MANNER_BY_FORMAT } = await import("../prompts/manners.ts");
  for (const [format, id] of Object.entries(DEFAULT_MANNER_BY_FORMAT)) assert(isMannerId(id), `${format}: a default manner`);
  assertEquals(pickManner(FORMATS.sales_letter, undefined), { manner: MANNERS.makepeace, chosenBy: "engine" });
  assertEquals(pickManner(FORMATS.webinar_package, undefined).manner.master, "Fladlien");
  assertEquals(pickManner(FORMATS.vsl_long, undefined).manner.master, "Palmer");
  assertEquals(pickManner(FORMATS.youtube_ad, undefined).manner.master, "Harmon Brothers");
  assertEquals(pickManner(FORMATS.landing_page_short, undefined), { manner: MANNERS.schwartz, chosenBy: "engine" }, "a format without its own default takes the family's");
  assertEquals(pickManner(FORMATS.sales_letter, "settle").manner.master, "Settle", "the user's choice wins over the format's default");
  assertEquals(MANNER_IDS.length, 17);
  const { STANDARD_TITLES } = await import("../prompts/standard.ts");
  assertEquals(STANDARD_TITLES.MANNER, "Manner");

  const { draftPrompt: d24, MANNER_RULE, WRITER: W24 } = await import("../prompts/draft.v24.ts");
  const { revisePrompt: r24 } = await import("../prompts/revise.v24.ts");
  assertEquals([d24.version, r24.version], [24, 24]);
  assert(d24.system.includes(MANNER_RULE) && d24.system.startsWith(W24) && r24.system.startsWith(W24));

  // the engine's pick on a social post: Halbert, his way in first, the body in his manner under every opening
  const plan = planDraft(FORMATS.organic_social);
  const base: DraftArgs = { call: plan.calls[0], callIndex: 1, callTotal: 1, awareness: "problem_aware", segment: null, sophistication: "4", thesis: "the thesis", argumentText: "", drafted: [], leads: null, leadTypes: openingManners(MANNERS.halbert).map((m) => m.lead_type), examplesText: "", retryNote: null };
  const u = d24.user(ctx(), base);
  assert(u.includes("WRITTEN LIKE Halbert (the engine's pick for this kind of piece): A story, told like a letter from one person"), "the manner in the material");
  assert(u.includes("to this reader, in Halbert's manner: lead_in (20 to 70 words)"), "the job names the manner");
  assert(u.includes("lead-a: story, Halbert's way in (a letter from one person") && u.includes("lead-b: problem_solution, Hopkins's way in (a test he runs on himself") && u.includes("lead-c: secret, Schwartz's way in (the want he already has"), "three ways in");
  assert(u.includes("The body stays in Halbert's manner under every one of them."));
  assert(u.includes("--- 1. In Halbert's manner (the manner this piece is written in). The move:"), "his exemplar first");
  assert(u.indexOf("WRITTEN LIKE Halbert") < u.indexOf("Its parts, in reading order:"), "the manner before the parts");

  // the user's choice: Schwartz on a social post, whose exemplar is borrowed from another family when social has none
  const c2 = ctx();
  (c2.generation as unknown as { options: Record<string, unknown> }).options.manner = "schwartz";
  const u2 = d24.user(c2, { ...base, leadTypes: openingManners(MANNERS.schwartz).map((m) => m.lead_type) });
  assert(u2.includes("WRITTEN LIKE Schwartz (the user's choice): The want he already has"));
  assert(u2.includes("lead-a: secret, Schwartz's way in") && u2.includes("lead-b: promise, Bencivenga's way in") && u2.includes("lead-c: story, Halbert's way in"));
  const borrowed = exemplarInManner("social", "Schwartz")!;
  assert(u2.includes(borrowed.family === "social" ? "--- 1. In Schwartz's manner (the manner this piece is written in). The move:" : `--- 1. In Schwartz's manner (the manner this piece is written in, shown on a piece from the ${borrowed.family} family: the move carries over, the shape of this piece does not). The move:`), "the chosen master's exemplar first, marked when borrowed");
  assert(!u2.includes("--- 2. In Schwartz's manner"), "his exemplar once");

  // the openings follow the awareness table when the reader is most aware: lead types without a manner, the body still in the piece's manner
  const u3 = d24.user(ctx(), { ...base, awareness: "most_aware", leadTypes: ["offer", "promise", "problem_solution"] });
  assert(u3.includes("lead-a: offer (the deal in line one)") && !u3.includes("'s way in"), "the table's openings");
  assert(u3.includes("Any of the three may open on the test he runs") && u3.includes("in Halbert's manner: lead_in"));

  // a long format: the leads call names the ways in and the sections call names the manner
  const long = planDraft(FORMATS.sales_letter);
  const leadsCall = long.calls.find((c) => c.kind === "leads")!;
  const sectionsCall = long.calls.find((c) => c.kind === "sections")!;
  const c4 = ctx();
  c4.format = FORMATS.sales_letter;
  const u4 = d24.user(c4, { ...base, call: leadsCall, leadTypes: openingManners(MANNERS.makepeace).map((m) => m.lead_type) });
  assert(u4.includes("WRITTEN LIKE Makepeace (the engine's pick for this kind of piece)") && u4.includes("lead-a: proclamation, Makepeace's way in") && u4.includes("The body that follows is in Makepeace's manner, and every one of the three leads into it."), "a sales letter's engine pick is the format's own default");
  assert(u4.includes("--- 1. In Makepeace's manner (the manner this piece is written in, shown on a piece from the email family: the move carries over, the shape of this piece does not)."), "his exemplar borrowed from the email family, since pages have none");
  const u5 = d24.user(c4, { ...base, call: sectionsCall, leadTypes: null });
  assert(u5.includes("in Makepeace's manner: "), "the sections job names the manner");

  // the writer reads at most EXEMPLARS_SHOWN whole pieces: the manner's first, then the family's in file order
  const { EXEMPLARS_SHOWN, exemplarsFor } = await import("../prompts/exemplars/index.ts");
  assert(exemplarsFor("social").length > EXEMPLARS_SHOWN && exemplarsFor("email").length > EXEMPLARS_SHOWN, "the library is larger than what one call reads");
  const shown = (t: string) => (t.match(/^--- \d+\. In /gm) ?? []).length;
  assertEquals(shown(exemplarsText("social", "Organic social post", "Brunson")), EXEMPLARS_SHOWN);
  assert(exemplarsText("social", "Organic social post", "Brunson").includes("--- 1. In Brunson's manner (the manner this piece is written in)"), "the last in the file leads when it is the manner");
  assert(!exemplarsText("social", "Organic social post", "Halbert").includes("In Brunson's manner"), "and sits out when it is not");
  assertEquals(shown(exemplarsText("ad", "Meta ad")), exemplarsFor("ad").length, "a small family shows all of its pieces");
});

Deno.test("the shape of this one: drawn from the human ranges, fixed by the generation id, read as counts by the drafter, the reviser and the tell edit (Section 13)", async () => {
  const { SHAPE_RANGES, itemIndexes, seededRandom, shapeFor, shapeLine, shapeText, shapeTextForDraft } = await import("../draft/shape.ts");
  // the same id draws the same shape; other ids draw other shapes
  const a = shapeFor("gen-1", FORMATS.organic_social);
  assertEquals(a, shapeFor("gen-1", FORMATS.organic_social), "a retry draws the same shape");
  const others = Array.from({ length: 30 }, (_, i) => shapeFor(`gen-${i + 2}`, FORMATS.organic_social));
  assert(others.some((s) => s.spread !== a.spread) && others.some((s) => s.short_share !== a.short_share) && others.some((s) => s.close !== a.close) && others.some((s) => s.questions !== a.questions), "pieces differ");
  assert(new Set(others.map((s) => s.contractions)).size === 3 && new Set(others.map((s) => s.close)).size === 3, "every option is drawn over thirty pieces");
  // every draw sits inside its family's range
  for (const spec of Object.values(FORMATS)) {
    const range = SHAPE_RANGES[spec.family];
    for (let i = 0; i < 20; i++) {
      const s = shapeFor(`id-${i}`, spec);
      assert(s.mean >= range.mean[0] && s.mean <= range.mean[1] && s.spread >= range.spread[0] && s.spread <= range.spread[1], `${spec.id}: mean and spread in range`);
      assert(s.short_share >= range.short_share[0] && s.short_share <= range.short_share[1] && s.long >= range.long[0] && s.long <= range.long[1], `${spec.id}: shares in range`);
      assert(s.questions >= range.questions[0] && s.questions <= range.questions[1] && s.longest_paragraph >= range.longest_paragraph[0] && s.longest_paragraph <= range.longest_paragraph[1], `${spec.id}: counts in range`);
      if (spec.id === "organic_social") assert(s.product_at !== null && s.product_at >= 0.3 && s.product_at <= 0.6, "the product's position respects the format's gate");
      else assert(s.product_at === null, `${spec.id}: no product position without the gate`);
    }
  }
  const r1 = seededRandom("x"), r2 = seededRandom("x");
  assertEquals([r1(), r1(), r1()], [r2(), r2(), r2()]);
  // the line is counts, not adjectives
  const line = shapeLine(a, FORMATS.organic_social);
  assert(/sentences average about \d+ words, with a spread of 0\.\d+/.test(line) && /about \d+ sentences? of four words or fewer/.test(line) && /the close: the step/.test(line), line);
  assert(!/\b(punchy|conversational|natural|engaging|authentic)\b/i.test(line), "no tone adjectives");
  // pages count per 300 words; multi-item pieces draw one shape per item
  assert(shapeLine(shapeFor("g", FORMATS.sales_letter), FORMATS.sales_letter).includes("in every 300 words"));
  assertEquals(itemIndexes([{ section_id: "subject#1" }, { section_id: "body#1" }, { section_id: "subject#3" }, { section_id: "lead_in" }]), [0, 1, 3]);
  const seq = shapeText("g", FORMATS.email_sequence, [1, 2, 3]);
  assert(seq.startsWith("THE SHAPE OF THIS ONE (drawn for this piece") && seq.includes("- email 1: ") && seq.includes("- email 3: "), seq.slice(0, 200));
  assert(shapeFor("g", FORMATS.email_sequence, 1).spread !== shapeFor("g", FORMATS.email_sequence, 2).spread || shapeFor("g", FORMATS.email_sequence, 1).close !== shapeFor("g", FORMATS.email_sequence, 2).close, "the emails of one sequence differ");

  // the drafter (v25): the shape sits last in the stable material, before the cache break; the grade line no longer fixes the rhythm
  const { draftPrompt: d25, WRITER: W25 } = await import("../prompts/draft.v25.ts");
  assertEquals(d25.version, 25);
  assert(W25.includes("sentence lengths as THE SHAPE OF THIS ONE in the material gives them") && !W25.includes("short sentences, with one long one where the feeling needs it"), "the writer's words");
  assert(d25.system.includes("sentence lengths as THE SHAPE OF THIS ONE") && !d25.system.includes("with one long one where the feeling needs it"));
  const plan = planDraft(FORMATS.organic_social);
  const base: DraftArgs = { call: plan.calls[0], callIndex: 1, callTotal: 1, awareness: "problem_aware", segment: null, sophistication: "4", thesis: "the thesis", argumentText: "", drafted: [], leads: null, leadTypes: null, examplesText: "", retryNote: null };
  const u = d25.user(ctx(), base);
  const expected = shapeText("g", FORMATS.organic_social, [0]);
  assert(u.includes(expected), "the piece's own shape in the material");
  assert(u.indexOf("HOW THIS KIND OF PIECE READS") < u.indexOf("THE SHAPE OF THIS ONE (drawn") && u.indexOf("THE SHAPE OF THIS ONE (drawn") < u.indexOf("<<<cache-break>>>"), "after the exemplars, before the break");
  assert(u.includes("the sentence lengths follow THE SHAPE OF THIS ONE") && !u.includes("A sentence over thirty words is two sentences") && !u.includes("most sentences under fifteen words"), "the grade line defers to the shape");

  // the reviser (v25) reads the draft's items' shapes; the tell edit (v18) points its cadence note at the shape
  const { revisePrompt: r25 } = await import("../prompts/revise.v25.ts");
  assertEquals(r25.version, 25);
  assert(r25.system.startsWith(W25));
  const draft = { sections: [{ section_id: "lead_in", title: null, blocks: [{ id: "lead_in-1", type: "paragraph", text: "A line.", items: null, meta: null }] }] };
  const ru = r25.user(ctx(), { cycle: 1, editorial: null, factual: [], mechanical: null, coldRead: null, draft, retryNote: null } as unknown as Parameters<typeof r25.user>[1]);
  assert(ru.includes(shapeTextForDraft("g", FORMATS.organic_social, draft.sections as never)) && ru.indexOf("THE SHAPE OF THIS ONE (drawn") < ru.indexOf("<<<cache-break>>>"), "the revision keeps the drawn rhythm");
  const { tellEditPrompt: t18, shapeNote } = await import("../prompts/tell_edit.v18.ts");
  assertEquals(t18.version, 18);
  const tctx = { format: FORMATS.organic_social, voice: null, config: null } as unknown as Parameters<typeof t18.user>[0];
  const tbase = { draft: { sections: [] }, units: [], findings: [], exemptTerms: [], groupIndex: 0, groupTotal: 1, retryNote: null } as unknown as Parameters<typeof t18.user>[1];
  const flat = t18.user(tctx, { ...tbase, cadence: { cv: 0.37, floor: 0.5 }, shape: expected });
  assert(flat.includes("toward the counts in THE SHAPE OF THIS ONE below") && flat.includes(expected) && !flat.includes("Break one or two long sentences"), "the cadence note points at the shape");
  assert(!t18.user(tctx, { ...tbase, cadence: null, shape: expected }).includes("THE SHAPE OF THIS ONE (drawn"), "no shape block when the piece is not flat");
  assertEquals(shapeNote("plain", null), "plain");
});

Deno.test("one way only (rule 40): the writer says a sentence one way with its doer and tells a two-way failure whole (draft v28, revise v28); the cold read reports a line it had to pick a meaning for (cold read v6)", async () => {
  const { draftPrompt: d28, ONE_WAY, WRITER: W28 } = await import("../prompts/draft.v28.ts");
  const { revisePrompt: r28 } = await import("../prompts/revise.v28.ts");
  const { coldReadPrompt: c6 } = await import("../prompts/cold_read.v6.ts");
  const { coldReadPrompt: c5 } = await import("../prompts/cold_read.v5.ts");
  assertEquals([d28.version, r28.version, c6.version], [28, 28, 6]);
  assert(ONE_WAY.includes("each sentence follows from the one before it") && ONE_WAY.includes("what happens first and then why") && ONE_WAY.includes("either nobody reads it because it never ranks, or plenty of people read it and nobody buys") && ONE_WAY.includes("told in absolutes (nobody reads it, no one buys") && !ONE_WAY.includes("with its doer"));
  assert(W28.includes(ONE_WAY) && d28.system.includes(ONE_WAY) && r28.system.startsWith(W28));
  assert(c6.system !== c5.system && c6.system.includes("a sentence that does not follow from the one before it") && c6.system.includes(`a sentence you could take two ways ("The page goes up": put online, or up the rankings?`) && !c6.system.includes("hidden behind \"nobody\"") && c6.system.includes("when you had to pick a meaning or supply a missing step, you read it twice"), "the cold read's reread rule");
  assert(c6.system.includes("in one plain sentence that can be taken one way only and says what happened before why"), "say_it is one way, what happened before why");
  const { RULES } = await import("../prompts/standard.ts");
  assert(RULES.includes("Each sentence follows from the one before it") && RULES.includes("The trouble is told in absolutes (nobody reads it, no one buys, every page)") && RULES.includes("A sentence can be taken one way only"), "rule 40 carries it");
});

Deno.test("every sentence earns its place (rule 40): no truism, no setup sentence; the thing is named inside the sentence that does work (draft v29, revise v29, cold read v7)", async () => {
  const { draftPrompt: d29, EARNS_ITS_PLACE, WRITER: W29 } = await import("../prompts/draft.v29.ts");
  const { revisePrompt: r29 } = await import("../prompts/revise.v29.ts");
  const { coldReadPrompt: c7 } = await import("../prompts/cold_read.v7.ts");
  const { coldReadPrompt: c6 } = await import("../prompts/cold_read.v6.ts");
  assertEquals([d29.version, r29.version, c7.version], [29, 29, 7]);
  assert(EARNS_ITS_PLACE.includes("tells him something he did not know a second ago") && EARNS_ITS_PLACE.includes("already has ten pages on page one") && EARNS_ITS_PLACE.includes("named inside the sentence that does work with it"));
  assert(W29.includes(EARNS_ITS_PLACE) && d29.system.includes(EARNS_ITS_PLACE) && r29.system.startsWith(W29));
  assert(c7.system !== c6.system && c7.system.includes("told you nothing you did not already know and stood there only to set up the next one") && c7.system.includes("hunt for the point") && c7.system.includes("for a sentence that told you nothing, the point it was reaching for with the thing named in it"), "the cold read's reread rule");
  const { RULES } = await import("../prompts/standard.ts");
  assert(RULES.includes("Every sentence tells him something he did not know a second ago") && RULES.includes("hunt for the point of"), "rule 40 carries it");
});

Deno.test("the piece's job binds the review: editorial v28 and revise v30 carry the user's words; a sale page's reader is most aware", async () => {
  const { editorialPrompt: e28, pieceJob } = await import("../prompts/editorial.v28.ts");
  const { revisePrompt: r30, PIECE_JOB_RULE } = await import("../prompts/revise.v30.ts");
  const { COPY_CHIEF_RUBRIC } = await import("../prompts/standard.ts");
  const { awarenessFromPurpose, targetAwareness } = await import("../draft/ledger.ts");
  assertEquals([e28.version, r30.version], [28, 30]);
  assert(COPY_CHIEF_RUBRIC.includes("The piece's job, in the user's words, binds the review."));
  assert(e28.system.includes("binds the review"));
  assert(r30.system.includes(PIECE_JOB_RULE));
  const withJob = pieceJob({ purpose: "Emphasize that this is a Black Friday sale and not the normal price.", instructions: "Keep the guarantee wording." });
  assertStringIncludes(withJob, "THE PIECE'S JOB, IN THE USER'S WORDS");
  assertStringIncludes(withJob, "Purpose: Emphasize that this is a Black Friday sale");
  assertStringIncludes(withJob, "Instructions: Keep the guarantee wording.");
  assertEquals(pieceJob({ purpose: null, instructions: "  " }), "");
  assertEquals(awarenessFromPurpose("Emphasize that this is a Black Friday sale and discount"), "most_aware");
  assertEquals(awarenessFromPurpose("Keep the same plan and promise, better copy"), null);
  assertEquals(targetAwareness(null, { purpose: "A Black Friday deal for business owners" } as never).awareness, "most_aware");
  assertEquals(targetAwareness(null, { purpose: "A Black Friday deal", awareness: "problem_aware" } as never).awareness, "problem_aware", "the user's own setting wins");
});

Deno.test("the page itself announces the sale: its reader came for the deal, whatever the research guessed", async () => {
  const { awarenessFromPage, targetAwareness } = await import("../draft/ledger.ts");
  const { shortPiece } = await import("../draft/plan.ts");
  const { getFormat } = await import("../formats/index.ts");
  const page = "[Nav] Home Log In Start Free Trial\n\nBlack Friday offer for business owners\n\n# Stop Guessing What To Work On. $399 For Your First Year.\n\n[Button] Start My 7-Day Free Trial";
  assertEquals(awarenessFromPage(page), "most_aware");
  assertEquals(awarenessFromPage("# Book a demo\n\nNo sales calls, no deal pressure. We handle the problem for you."), null, "a page that merely says sales or deal is not a sale");
  assertEquals(awarenessFromPage("[Nav] Black Friday deals\n\n# Our story"), null, "a sale in the menu is the site's, not the page's");
  assertEquals(targetAwareness(null, { control_text: page } as never).source, "page");
  assertEquals(targetAwareness(null, { control_text: page, purpose: "Keep the same plan", awareness: "product_aware" } as never).awareness, "product_aware", "the user's own setting wins");
  assertEquals(shortPiece(getFormat("landing_page_short")), true);
  assertEquals(shortPiece(getFormat("sales_letter")), false);
});
