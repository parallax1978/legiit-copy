import { z } from "zod";

/** One line edit from the tell editor (docs/04 §7.1). */
export const TellEditEdit = z.object({
  ref: z.string().describe("the reference shown in square brackets before the text, e.g. \"body-3\" or \"bullets-2::1\""),
  before: z.string().describe("the exact span to replace, copied character for character from that text with its ledger tags: the shortest span that holds the tell, usually a phrase or a sentence"),
  after: z.string().describe("the replacement; keeps every ledger tag, number, name, date, quote and link from before exactly; an empty string only to delete a windup that carries nothing"),
  tell: z.string().describe("the tell or word it removes, in a few words, e.g. \"em dash\", \"Here's the windup\", \"unlock\""),
});
export type TellEditEdit = z.infer<typeof TellEditEdit>;

/** One line the editor found on its read of the whole piece, before it edits (tell edit v6). */
export const TellEditAuditItem = z.object({
  ref: z.string().describe("the reference of the text that holds the line"),
  line: z.string().describe("the line, copied from that text"),
  // the native grammar does not hold a model to the enum: an off-list label is read as "other", never a failed reply
  kind: z.enum(["quote_card", "said_again", "windup", "survey_wording", "ledger_wording", "tool_tour", "other"]).catch("other"),
  keep: z.boolean().describe("true only when the line carries a fact the piece needs and a plainer sentence would lose it; every line with keep false gets an edit"),
});
export type TellEditAuditItem = z.infer<typeof TellEditAuditItem>;

/** One point a short piece makes, with every line that makes it (tell edit v8): a point made twice keeps one line. */
export const TellEditPoint = z.object({
  point: z.string().describe("the point, in a few words"),
  lines: z.array(z.object({ ref: z.string(), line: z.string().describe("the line, copied from that text") })),
});
export type TellEditPoint = z.infer<typeof TellEditPoint>;

/** What one tell edit call returns: the point map and the audit first, then the edits that answer them. */
export const TellEditCall = z.object({
  // a short piece's points, each with the lines that make it; empty for a long piece
  points: z.array(TellEditPoint).default([]),
  // the native structured output marks it required; the default keeps a reply without one (an older version) valid
  audit: z.array(TellEditAuditItem).default([]),
  edits: z.array(TellEditEdit),
  what_changed: z.array(z.string()).describe("three to six short plain lines naming the main tells or words removed; empty when the copy was already clean"),
  already_clean: z.boolean(),
});
export type TellEditCall = z.infer<typeof TellEditCall>;

const Applied = TellEditEdit.extend({ by: z.enum(["editor", "backstop"]) });
const Rejected = TellEditEdit.extend({ reason: z.string() });

/** The step's output: what changed, what the guards refused, and the owner's tells before and after. */
export const TellEditOutput = z.object({
  what_changed: z.array(z.string()),
  edits: z.array(Applied),
  rejected: z.array(Rejected),
  owner_tells_before: z.number(),
  owner_tells_after: z.number(),
  already_clean: z.boolean(),
  new_version: z.boolean(),
  /** the editor's audit lines, and those it listed but left unedited after its retry */
  audit: z.array(TellEditAuditItem).optional(),
  audit_left: z.array(TellEditAuditItem).optional(),
});
export type TellEditOutput = z.infer<typeof TellEditOutput>;

/** Saved after every group of a long piece so a later invocation resumes where this one stopped. */
export const TellEditPartial = z.object({
  kind: z.literal("tell_edit_partial"),
  draft_version: z.number(),
  unit_refs: z.array(z.string()),
  texts: z.array(z.string()),
  groups_done: z.array(z.number()),
  what_changed: z.array(z.string()),
  edits: z.array(Applied),
  rejected: z.array(Rejected),
  already_clean: z.boolean(),
  audit: z.array(TellEditAuditItem).optional(),
  audit_left: z.array(TellEditAuditItem).optional(),
});
export type TellEditPartial = z.infer<typeof TellEditPartial>;
