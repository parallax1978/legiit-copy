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
