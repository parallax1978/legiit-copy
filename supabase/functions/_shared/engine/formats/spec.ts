import type { FormatId } from "../schemas/common.ts";

export interface SectionSpec {
  id: string;
  name: string;
  job: string;                 // what this section must do for the sale
  band_words: [number, number]; // starting values; the control overrides them
  must: string[];
  must_not: string[];
  optional?: boolean;
  block_types?: string[];      // allowed block types
}

export interface FormatSpec {
  id: FormatId;
  name: string;
  family: "page" | "email" | "video" | "ad" | "social" | "commerce" | "message" | "audio";
  description: string;
  length_band_words: [number, number];
  sections: SectionSpec[];
  draft_order: string[];       // section ids in the order they are written (offer block and close first, headline last)
  lead_variants: number;       // 3 for long formats, 0 where there is no lead
  skim_path_block_types: string[];
  hard_gates: string[];        // machine-checkable rules (e.g. "sms.chars<=240")
  cadence_floor_cv: number;    // flag when sentence-length CV is below this in 300+ words
  allow_emoji_bullets: boolean;
  allow_markdown_headings: boolean;
  allow_caps: boolean;
  platform_limits?: Record<string, number>; // e.g. {primary_text_chars: 150}
  standard_section: string;    // the paragraph in docs/04-copy-standard.md §9 this spec encodes
  multi_item?: { item_name: string; min: number; max: number; item_roles?: string[] }; // sequences, ad sets
}
