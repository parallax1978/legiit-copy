/**
 * Offer prompt, version 13: version 12's messages. The system text carries the standard as of this version (Section 3's
 * hooks and the masters' opening moves; rules 2, 7 and 11 say the reader's state plainly as his situation, never in a
 * hook as an account of what he did; Section 6's Gate B and DO NOT TOUCH; Section 7.1 tells 14 to 17).
 */
import offerV12 from "./offer.v12.ts";
import type { PromptModule } from "./types.ts";

export * from "./offer.v12.ts";

type Args = Parameters<typeof offerV12.user>[1];

const offerPrompt: PromptModule<Args> = { ...offerV12, version: 13 };

export default offerPrompt;
