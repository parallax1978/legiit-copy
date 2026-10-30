/**
 * Where a fact comes from (docs/04 8.1). The owner's product site embeds a sample plan and links a shared report (the
 * product's own output for one example customer); the intake read them as the product and wrote "checks your backlink
 * strength" as a feature, the terms page's data providers as proof, and "from the team behind" as "founder". Now a
 * source the app can classify carries its provenance into the prompt, every row records where its fact came from, a
 * selling row written from a sample is dropped and reported, the terms are never proof, and every later step sees
 * the provenance on the row.
 */
import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { classifySource, droppedNote, enforceProvenance, makeIntakeStep, prepareSources, proofWithoutTerms, sourceOf, type RawSource } from "../steps/intake.ts";
import { type IntakeSource, provenanceNote, renderClaims } from "../prompts/intake.v1.ts";
import intakePrompt from "../prompts/intake.v15.ts";
import argumentPrompt from "../prompts/argument.v19.ts";
import researchPrompt from "../prompts/research.v11.ts";
import { draftPrompt } from "../prompts/draft.v17.ts";
import { factualPrompt } from "../prompts/factual.v14.ts";
import { editorialPrompt } from "../prompts/editorial.v18.ts";
import { CLAIMS_AND_FACTUAL_REVIEW } from "../prompts/standard.ts";
import { ledgerText } from "../draft/prompt_text.ts";
import { ClaimRowInput, IntakeOutput, OfferSetup } from "../schemas/brief.ts";
import type { ClaimRow, StepContext } from "../steps/types.ts";
import type { callModel } from "../llm.ts";
import { getFormat } from "../formats/index.ts";

type Call = typeof callModel;
interface Recorded {
  user: string;
  purpose: string;
}

/** A model that answers from a function of the call's purpose, recording what it was asked. */
function fakeCall(responder: (rec: Recorded) => unknown): { call: Call; calls: Recorded[] } {
  const calls: Recorded[] = [];
  const call = (async (opts: Parameters<Call>[0]) => {
    const rec: Recorded = { user: typeof opts.user === "string" ? opts.user : JSON.stringify(opts.user), purpose: opts.log.purpose };
    calls.push(rec);
    const output = await responder(rec);
    return { output, text: JSON.stringify(output), model: "fake-model", usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0, web_searches: 0 }, costUsd: 0, latencyMs: 1, stopReason: "end_turn", requestId: null, sources: [] };
  }) as unknown as Call;
  return { call, calls };
}

function fakeCtx(): StepContext {
  return {
    db: {} as StepContext["db"],
    generation: { id: "gen-1", workspace_id: "ws-1", options: {}, format: "organic_social" } as unknown as StepContext["generation"],
    offer: { id: "offer-1", name: "Legiit Keywords", brief: {}, audience: null, price: null, guarantee: null, positioning: null } as unknown as StepContext["offer"],
    brief: null,
    claims: [],
    config: null,
    questions: [],
    variant: null,
    dossier: null,
    voice: null,
    format: getFormat("organic_social"),
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
  } as unknown as StepContext;
}

const src = (id: string, url: string | null, title: string | null, kind = "url", provenance: IntakeSource["provenance"] = null): IntakeSource => ({ id, kind, url, title, text: "x", truncated: false, provenance });
const row = (p: Partial<ClaimRowInput> & { claim_text: string; source_ref?: string | null; provenance?: ClaimRowInput["evidence"]["provenance"] }): ClaimRowInput =>
  ClaimRowInput.parse({ claim_text: p.claim_text, claim_type: p.claim_type ?? "feature", role: p.role ?? "feature", status: "unverified", evidence: { source_ref: p.source_ref ?? null, provenance: p.provenance ?? null } });

Deno.test("classifySource: a shared, sample or demo page is the product's output; terms are terms; typed text is the user's; the rest is the model's call", () => {
  assertEquals(classifySource({ kind: "url", url: "https://legiitkeywords.com/share/be4bd92178bf2aed5460bfd8fa55d0da", title: "Shared report · Legiit Keywords" }), "sample_output");
  assertEquals(classifySource({ kind: "url", url: "https://example.com/pricing", title: "Shared report" }), "sample_output");
  assertEquals(classifySource({ kind: "url", url: "https://example.com/demo", title: null }), "sample_output");
  assertEquals(classifySource({ kind: "url", url: "https://example.com/examples/acme-plan", title: null }), "sample_output");
  assertEquals(classifySource({ kind: "url", url: "https://legiitkeywords.com/terms", title: "Terms of Service · Legiit Keywords" }), "terms");
  assertEquals(classifySource({ kind: "url", url: "https://example.com/privacy-policy", title: null }), "terms");
  assertEquals(classifySource({ kind: "text", url: null, title: null }), "user");
  assertEquals(classifySource({ kind: "url", url: "https://legiitkeywords.com", title: "Legiit Keywords home" }), null);
  assertEquals(classifySource({ kind: "url", url: "https://legiitkeywords.com/help/credits-and-billing/what-do-things-cost", title: "What do things cost?" }), null);
  assertEquals(classifySource({ kind: "url", url: "https://example.com/reports", title: "Reports" }), null, "a feature page named reports is the seller's");
  assertEquals(classifySource({ kind: "file", url: null, title: "deck.pdf" }), null);
  // the classification rides into the prompt on the source tag
  const raw: RawSource[] = [
    { id: "s1", kind: "url", url: "https://legiitkeywords.com", title: "Home", extracted_text: "the product" },
    { id: "s2", kind: "url", url: "https://legiitkeywords.com/share/abc", title: "Shared report", extracted_text: "one run" },
  ];
  const { sources } = prepareSources(raw);
  assertEquals(sources.map((s) => s.provenance), [null, "sample_output"]);
});

Deno.test("sourceOf: a row cites its source by id or by URL; the user's answers are the user's", () => {
  const sources = [src("s1", "https://www.Example.com/", "Home"), src("s2", "https://example.com/share/abc", "Shared report")];
  assertEquals(sourceOf("s2", sources)?.toString(), sources[1].toString());
  assertEquals((sourceOf("https://example.com", sources) as IntakeSource).id, "s1");
  assertEquals((sourceOf("https://example.com/share/abc#top", sources) as IntakeSource).id, "s2");
  assertEquals(sourceOf("user_setup", sources), "user");
  assertEquals(sourceOf("https://elsewhere.com", sources), null);
  assertEquals(sourceOf(null, sources), null);
});

Deno.test("enforceProvenance: a selling row from a sample is dropped and reported; a case row keeps its provenance; terms never sell; the seller's rows stand", () => {
  const sources = [
    src("home", "https://legiitkeywords.com", "Legiit Keywords home"),
    src("share", "https://legiitkeywords.com/share/abc", "Shared report · Legiit Keywords", "url", "sample_output"),
    src("terms", "https://legiitkeywords.com/terms", "Terms of Service", "url", "terms"),
  ];
  const claims = [
    row({ claim_text: "Every decision links to the ranking pages it read and the backlink check behind it", role: "feature", claim_type: "feature", source_ref: "https://legiitkeywords.com/share/abc" }),
    row({ claim_text: "This checks whether you can win on backlinks; Ahrefs leaves it to you", role: "proof", claim_type: "comparative", source_ref: "share" }),
    row({ claim_text: "In the sample plan for Pull Shot Coffee, one run judged 12 keyword groups and skipped six", role: "proof", claim_type: "statistic", source_ref: "share" }),
    row({ claim_text: "Search volumes and rankings come from DataForSEO", role: "mechanism", claim_type: "mechanism", source_ref: "https://legiitkeywords.com/terms" }),
    row({ claim_text: "Credits are charged when a run starts and come back if it fails", role: "offer_term", claim_type: "price_discount", source_ref: "terms" }),
    row({ claim_text: "Write any page with one click", role: "feature", claim_type: "feature", source_ref: "home", provenance: "seller" }),
    row({ claim_text: "A plan reads about twenty pages of your site", role: "mechanism", claim_type: "mechanism", source_ref: "https://legiitkeywords.com" }),
    row({ claim_text: "The product writes the pages", role: "feature", claim_type: "feature", source_ref: "user_setup" }),
    // the model's own label stands where the app could not classify the source: an example embedded in the sales page
    row({ claim_text: "The tool checks backlink strength against the domains ranking", role: "mechanism", claim_type: "mechanism", source_ref: "home", provenance: "sample_output" }),
  ];
  const { claims: kept, dropped } = enforceProvenance(claims, sources);
  assertEquals(dropped.map((d) => d.text.slice(0, 30)), ["Every decision links to the ra", "This checks whether you can wi", "The tool checks backlink stren"]);
  assertEquals(dropped[0].source, "Shared report · Legiit Keywords");
  assertEquals(dropped[2].source, "Legiit Keywords home");
  assertEquals(kept.map((c) => [c.claim_text.slice(0, 20), c.role, c.evidence.provenance]), [
    ["In the sample plan f", "proof", "sample_output"],
    ["Search volumes and r", "other", "terms"],
    ["Credits are charged ", "offer_term", "terms"],
    ["Write any page with ", "feature", "seller"],
    ["A plan reads about t", "mechanism", null],
    ["The product writes t", "feature", "user"],
  ]);
  assertStringIncludes(droppedNote(dropped[0]), `Not recorded as a product fact, because it comes from an example of the product's output (Shared report · Legiit Keywords): "Every decision links`);
  // the brief's proof never cites the terms
  const proof = [{ claim: "Named data sources behind every decision", evidence: "DataForSEO, Firecrawl", source: "https://legiitkeywords.com/terms" }, { claim: "A public sample plan", evidence: "the plan for Pull Shot Coffee", source: "https://legiitkeywords.com/share/abc" }];
  assertEquals(proofWithoutTerms(proof, sources).map((p) => p.claim), ["A public sample plan"]);
});

Deno.test("intake step: the guard runs on the ledger, the dropped rows reach the brief's unknowns and the summary, the source tag carries provenance", async () => {
  const sources: RawSource[] = [
    { id: "s1", kind: "url", url: "https://legiitkeywords.com", title: "Home", extracted_text: "Write any page with one click." },
    { id: "s2", kind: "url", url: "https://legiitkeywords.com/share/abc", title: "Shared report", extracted_text: "Pull Shot Coffee: zero backlinks." },
    { id: "s3", kind: "url", url: "https://legiitkeywords.com/terms", title: "Terms of Service", extracted_text: "Backlink data from DataForSEO." },
  ];
  const brief = {
    product_name: "Legiit Keywords", one_line: "x", deliverables: ["a plan", "written pages"], price: { text: "$1", amount: 1, currency: "USD", plan: "monthly" }, terms: null,
    guarantee: { text: null, type: null, days: null, denominated: false }, audience: { who: "site owners", situation: null, verbatim_sources: [] }, positioning: null,
    proof_available: [{ claim: "Named data sources", evidence: "DataForSEO", source: "https://legiitkeywords.com/terms" }, { claim: "A public plan", evidence: "Pull Shot Coffee", source: "s2" }],
    competitors: [], urls: [], unknowns: ["the refund rate"], speaker: null, lead_offer: null,
  };
  const config = { vertical: "seo", business_opportunity: false, notice_recipient: false, humor_policy: { allowed: false, notes: null }, greeting: null, edge_tolerance: null, refund_window_days: null, first_week_experience: null };
  const ledger = {
    claims: [
      row({ claim_text: "Checks whether you can win on backlink strength", role: "mechanism", claim_type: "mechanism", source_ref: "s2" }),
      row({ claim_text: "In the sample plan for Pull Shot Coffee, 6 of 12 groups came back skip", role: "proof", claim_type: "statistic", source_ref: "s2" }),
      row({ claim_text: "Write any page with one click", role: "feature", claim_type: "feature", source_ref: "s1", provenance: "seller" }),
    ],
  };
  const { call, calls } = fakeCall((rec) => (rec.purpose === "intake.ledger" ? ledger : { brief, config, questions: [], claims: [] }));
  const res = await makeIntakeStep({ call, loadSources: () => Promise.resolve(sources) })(fakeCtx());
  const out = IntakeOutput.parse(res.output);
  assertStringIncludes(calls[0].user, '<source id="s2" kind="url" url="https://legiitkeywords.com/share/abc" title="Shared report" provenance="sample_output"');
  assertStringIncludes(calls[0].user, '<source id="s3" kind="url" url="https://legiitkeywords.com/terms" title="Terms of Service" provenance="terms"');
  assert(!calls[0].user.includes('title="Home" provenance='));
  assertEquals(out.claims.map((c) => [c.claim_text.slice(0, 14), c.evidence.provenance]), [["In the sample ", "sample_output"], ["Write any page", "seller"]]);
  assertEquals(out.brief.proof_available.map((p) => p.claim), ["A public plan"]);
  assertEquals(out.brief.unknowns, ["the refund rate", droppedNote({ text: "Checks whether you can win on backlink strength", source: "Shared report" })]);
  assertStringIncludes(res.summary, "2 ledger rows (0 flagged; 1 from sample output not recorded as product facts)");
});

Deno.test("every later step sees where a row's fact came from", () => {
  const base = { id: "c-1", offer_id: "o", workspace_id: "w", claim_text: "In the sample plan for Pull Shot Coffee, 6 of 12 groups came back skip", claim_type: "statistic", role: "proof", evidence_grade: null, precision: null, typical_result: null, earnings_context: null, material_connection: false, guarantee_terms: null, former_price: null, scarcity: null, deadline: null, trial_terms: null, story_claim: true, establishment_signal: false, status: "unverified", flag: null, user_decision: null, created_by: "system", created_at: "", updated_at: "" };
  const sample = { ...base, evidence: { source_ref: "s2", provenance: "sample_output", quote: "6 skipped" } } as unknown as ClaimRow;
  const terms = { ...base, id: "c-2", claim_text: "Data from DataForSEO", role: "other", evidence: { source_ref: "s3", provenance: "terms" } } as unknown as ClaimRow;
  const plain = { ...base, id: "c-3", evidence: { source_ref: "s1" } } as unknown as ClaimRow;
  const note = "provenance: an example of the product's output (one run's facts: cite it as what that run showed for its subject, never as what the product does, checks or uses)";
  // the research, offer and argument prompts (renderClaims) and the draft, review and revise prompts (ledgerText)
  const a = renderClaims([sample, terms, plain]);
  assertStringIncludes(a, `[[L:c-1]] type=statistic role=proof grade=- status=unverified\n  claim: In the sample plan for Pull Shot Coffee, 6 of 12 groups came back skip\n  ${note}`);
  assertStringIncludes(a, "provenance: the terms (a condition or a data provider, never a selling fact)");
  const b = ledgerText([sample, terms, plain]);
  assertStringIncludes(b, `  ${note}`);
  assertStringIncludes(b, "  provenance: the terms");
  assertEquals(provenanceNote({ source_ref: "s1" }), null);
  assertEquals(provenanceNote(null), null);
  assertEquals(provenanceNote({ provenance: "user" }), "provenance: the user's own words");
  assertEquals((b.match(/provenance:/g) ?? []).length, 2);
});

Deno.test("prompts: the intake reads each source for what it is, the argument and research never build on a sample, the standard says where a fact comes from", () => {
  assertEquals([intakePrompt.version, argumentPrompt.version, researchPrompt.version, draftPrompt.version, factualPrompt.version, editorialPrompt.version], [15, 19, 11, 17, 14, 18]);
  for (const t of [
    "Where a fact comes from (Section 8.1)",
    "A <source> tag that carries provenance= is already decided by the app; decide the rest yourself.",
    "Every row's evidence.provenance says which it came from: seller, sample_output, terms, third_party or user.",
    "What the example did, showed, checked, read or used is never written as what the product does",
    "is a technical input: at most one row, role other, never a mechanism row, never a feature to sell, never in proof_available",
    `A credential row quotes the source's own words ("From the team behind Legiit"), never upgraded to a founder`,
    "everything it makes for the buyer, in one sentence, no adjectives: read the deliverables first",
    "proof of the product, never a data provider, a technical input or a clause of the terms",
  ]) assertStringIncludes(intakePrompt.system, t);
  assertStringIncludes(argumentPrompt.system, "is never the source of a candidate's mechanism or promise, which come from rows the seller or the user stated (provenance seller or user); a row from the terms is never a carrier.");
  assertStringIncludes(researchPrompt.system, "is one demonstration item, evidence_type demonstration, naming its subject and what it shows; nothing in it is recorded as the product's mechanism");
  // the standard reaches every step that writes or reviews
  assertStringIncludes(CLAIMS_AND_FACTUAL_REVIEW, "Where a fact comes from. Every ledger row records the kind of source it came from");
  assertStringIncludes(CLAIMS_AND_FACTUAL_REVIEW, "and so is a statement of what the product does, checks or uses that the ledger holds only from an example of the product's output");
  const steps = [["draft", draftPrompt.system], ["factual", factualPrompt.system], ["editorial", editorialPrompt.system], ["intake", intakePrompt.system], ["argument", argumentPrompt.system], ["research", researchPrompt.system]] as const;
  const carry = steps.filter(([, system]) => system.includes("### 8.1 Claims taxonomy")).map(([name]) => name);
  assert(carry.includes("intake") && carry.includes("factual") && carry.includes("research"), carry.join(","));
  for (const [name, system] of steps) if (carry.includes(name)) assertStringIncludes(system, "Where a fact comes from. Every ledger row records the kind of source it came from", name);
  assert(!/[–—]/.test(intakePrompt.system.slice(0, intakePrompt.system.indexOf("---"))));
  // the user's setup answers: the product in a sentence wins, and what is not the product never enters
  const setup = OfferSetup.parse({ product_sentence: "A keyword tool that finds the pages a site can rank for and writes them", leave_out: "The Pull Shot Coffee plan is an example of the output" });
  assertEquals([setup.product_sentence?.slice(0, 14), setup.leave_out?.slice(0, 18)], ["A keyword tool", "The Pull Shot Coff"]);
  const ctx = fakeCtx();
  (ctx.offer as { setup?: unknown }).setup = setup;
  const user = intakePrompt.user(ctx, { phase: "brief", sources: [], truncatedCount: 0 });
  assertStringIncludes(user, "What the product is and does for the buyer, in the user's words: A keyword tool that finds the pages a site can rank for and writes them");
  assertStringIncludes(user, "Not the product (the user says these are examples of its output, old features or things to leave out; never a row, never in the brief): The Pull Shot Coffee plan is an example of the output");
  assertStringIncludes(user, "the product sentence, when given, is brief.one_line");
  const ledgerUser = intakePrompt.user(ctx, { phase: "ledger", sources: [], truncatedCount: 0 });
  assertStringIncludes(ledgerUser, 'evidence.provenance "user"');
  assertStringIncludes(ledgerUser, "nothing the user said is not the product becomes a row");
});
