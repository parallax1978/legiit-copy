/**
 * Intake prompt, version 4: version 3's messages, with the owner's list itself (docs/04 §7.1) in the system text.
 * A claim's suggested rewrite replaces the ledger row's words when the user accepts it, and the writer quotes the
 * ledger, so a rewrite follows the list where it is written.
 */
import intakeV3 from "./intake.v3.ts";
import type { PromptModule } from "./types.ts";
import { OWNER_TELLS } from "./standard.ts";

export * from "./intake.v3.ts";

type Args = Parameters<typeof intakeV3.user>[1];

const SYSTEM = `${intakeV3.system}\n\n${OWNER_TELLS}\n\nEvery suggested_rewrite follows that list: none of its tells or words, no em dash, emoji or hashtag.`;

const intakePrompt: PromptModule<Args> = { ...intakeV3, version: 4, system: SYSTEM };

export default intakePrompt;
