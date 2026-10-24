/** Client-safe constants shared by server data modules and client components. No server imports here. */
export const GENERATION_STATUSES = ["queued", "running", "needs_input", "completed", "failed", "cancelled"] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];
export const EXAMPLE_STATUSES = ["draft", "curated", "retired"] as const;
export const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
export const SECTION_TYPES = ["headline", "lead", "mechanism", "bullets", "proof", "offer", "close", "order_form", "ps", "other"] as const;
export const AWARENESS_LEVELS = ["most_aware", "product_aware", "solution_aware", "problem_aware", "unaware", "unknown"] as const;
export const LEAD_TYPES = ["offer", "promise", "problem_solution", "secret", "proclamation", "story"] as const;
export const RIGHTS_STATUSES = ["public_domain", "publicly_posted_copyrighted", "licensed", "unknown"] as const;
export const SELLING_SITUATIONS = ["launch", "evergreen", "cart_close", "reactivation", "cold", "retargeting"] as const;
export const SOPHISTICATION_LEVELS = ["1", "2", "3", "4", "5", "unknown"] as const;
export const FULL_TEXT_RIGHTS = ["public_domain", "licensed"] as const;
export function allowsFullText(rights: string | null | undefined) {
  return (FULL_TEXT_RIGHTS as readonly string[]).includes(rights ?? "");
}
