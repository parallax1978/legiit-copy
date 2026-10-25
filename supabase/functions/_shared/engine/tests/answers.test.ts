import { assertEquals } from "@std/assert";
import { answersFromDossier, ledgerRowsFromDossier } from "../research/answers.ts";
import type { Dossier } from "../schemas/research.ts";

const base: Dossier = {
  verbatims: [], themes: [], competitor_table: [], logo_swap_result: "", awareness_by_segment: [], sophistication: { stage: "3", evidence: "" },
  proof_inventory: [], objection_map: [], resident_emotion: { emotion: "", evidence: "", verbatim_ids: [] }, story_inventory: [],
  speaker: { name: "Chris M. Walker", role: "founder of Legiit", stake: "runs the company", source: "https://legiit.com/about" },
  forces: { push: "", pull: "", anxiety: "", habit: "", dominant: "push" }, first_week_experience: "the first decision shows at once; the rest on day seven",
  refund_history: "no money-back refund on subscription charges; credits return when a run fails", unsourced_hypotheses: [], sources: [],
};
const QS = [
  { id: "q1", question: "Who is the named person speaking in the copy, and what is their role at Legiit?", answer: null },
  { id: "q2", question: "Is there any money-back refund on subscription charges, and what are refund and trial-cancel rates?", answer: null },
  { id: "q3", question: "What figures does the public accuracy report show?", answer: null },
  { id: "q4", question: "Who speaks for the product?", answer: "Already answered by the user" },
];

Deno.test("answersFromDossier answers the speaker and refund questions research settled, with the source, and leaves the rest", () => {
  const a = answersFromDossier(base, QS);
  assertEquals(a.map((x) => x.id), ["q1", "q2"]);
  assertEquals(a[0].answer, "From research: Chris M. Walker, founder of Legiit (runs the company). Source: https://legiit.com/about");
  assertEquals(a[1].answer, "From research: no money-back refund on subscription charges; credits return when a run fails");
  const unknown = { ...base, speaker: { name: "unknown", role: null, stake: null, source: null }, refund_history: null };
  assertEquals(answersFromDossier(unknown, QS), []);
});

Deno.test("ledgerRowsFromDossier adds a credential row for the speaker and a guarantee row for the refund terms, once", () => {
  const rows = ledgerRowsFromDossier(base, []);
  assertEquals(rows.map((r) => [r.claim_type, r.role]), [["credential", "credential"], ["guarantee", "offer_term"]]);
  assertEquals(rows[0].claim_text, "Chris M. Walker, founder of Legiit (runs the company)");
  assertEquals(rows[0].evidence.source_ref, "https://legiit.com/about");
  assertEquals(rows[1].guarantee_terms?.text, base.refund_history);
  const already = ledgerRowsFromDossier(base, [{ claim_text: "From the team led by Chris M. Walker", claim_type: "credential" }, { claim_text: "No money-back refund; credits return on failed runs", claim_type: "guarantee" }]);
  assertEquals(already, []);
});

import { verbatimClaimText, verbatimRows } from "../research/answers.ts";
import { dossierText } from "../draft/prompt_text.ts";

const V1 = { id: "V1", text: "“requires heavy editing for quality output”", source_url: "https://example.com/review", source_type: "review" as const, speaker_role: "buyer", tags: ["frustration" as const], desire_cluster: "human-voice", intensity_marker: false, duration_marker: false, date: "2026-03" };
const V2 = { ...V1, id: "V2", text: "\"sounds like everyone else's\"", source_url: null, speaker_role: null, date: null, source_type: "forum" as const };

Deno.test("verbatimRows: every verbatim becomes an audience-language row with its source, once", () => {
  const d = { ...base, verbatims: [V1, V2] };
  const rows = verbatimRows(d, []);
  assertEquals(rows.length, 2);
  assertEquals(rows[0].claim_type, "audience_language");
  assertEquals(rows[0].claim_text, "Market verbatim (review, buyer, 2026-03): “requires heavy editing for quality output”");
  assertEquals(rows[0].evidence.source_ref, "https://example.com/review");
  assertEquals(rows[0].evidence.quote, V1.text);
  assertEquals(rows[1].claim_text, "Market verbatim (forum): \"sounds like everyone else's\"");
  assertEquals(rows[1].evidence.source_ref, "research");
  // a row that already holds the words is not repeated, whatever the quotation marks
  const again = verbatimRows(d, [{ claim_text: verbatimClaimText(V1).replace(/[“”]/g, '"'), claim_type: "audience_language" }]);
  assertEquals(again.map((r) => r.claim_text), [rows[1].claim_text]);
  // and ledgerRowsFromDossier carries them with the speaker and refund rows
  assertEquals(ledgerRowsFromDossier(d, []).filter((r) => r.claim_type === "audience_language").length, 2);
});

Deno.test("dossierText: a verbatim with a ledger row shows its tag; one without shows none", () => {
  const d = { ...base, verbatims: [V1, V2] };
  const claims = [{ id: "abc12345-0000", claim_type: "audience_language", claim_text: verbatimClaimText(V1) }];
  const text = dossierText(d, { claims });
  assertEquals(text.includes("V1 [[L:abc12345-0000]] [frustration; cluster human-voice; 2026-03]"), true, text);
  assertEquals(/V2 \[frustration/.test(text), true, text);
  assertEquals(dossierText(d).includes("[[L:"), false);
});
