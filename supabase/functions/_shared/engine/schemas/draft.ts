import { z } from "zod";
import { FormatId, LeadType } from "./common.ts";

export const BlockType = z.enum([
  "headline",
  "deck",
  "preheadline",
  "crosshead",
  "paragraph",
  "bullets",
  "numbered",
  "cta",
  "button",
  "ps",
  "testimonial",
  "price",
  "guarantee",
  "recap",
  "subject",
  "preview",
  "greeting",
  "signoff",
  "caption",
  "beat",
  "slide",
  "hook",
  "label",
  "disclosure",
  "field",
]);

export const Block = z.object({
  id: z.string(),
  type: BlockType,
  text: z.string().describe("the copy; ledger refs inline as [[L:<claim-id>]]"),
  items: z.array(z.string()).nullable().describe("for bullets / numbered"),
  meta: z.record(z.string(), z.string()).nullable().describe("e.g. {speaker, timestamp, platform_field}"),
});
export type Block = z.infer<typeof Block>;

export const Section = z.object({ section_id: z.string(), title: z.string().nullable(), blocks: z.array(Block) });
export type Section = z.infer<typeof Section>;

export const LeadVariant = z.object({ id: z.string(), lead_type: LeadType, reader_hypothesis: z.string(), blocks: z.array(Block) });

export const DraftOutput = z.object({
  format: FormatId,
  sections: z.array(Section),
  leads: z.array(LeadVariant).nullable().describe("three leads of different type for long formats; null otherwise"),
  chosen_lead_id: z.string().nullable(),
  skim_path: z.array(z.string()).describe("headline, deck, crossheads, bold lines, captions, P.S., order form lines, in order"),
  ledger_refs_used: z.array(z.string()),
  needs_source: z.array(z.string()).describe("claims written with [[NEEDS SOURCE]] because the ledger is silent"),
  word_count: z.number(),
});
export type DraftOutput = z.infer<typeof DraftOutput>;

/** A single section's draft (used when long formats are drafted section by section). */
export const SectionDraft = z.object({ section: Section, ledger_refs_used: z.array(z.string()), needs_source: z.array(z.string()) });
