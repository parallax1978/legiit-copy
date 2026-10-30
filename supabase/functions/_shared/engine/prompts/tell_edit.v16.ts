/**
 * Tell edit prompt, version 16: version 15's messages with the word table as the plain-language research left it
 * (plain_words.ts: the formal words and the inflated phrases of the public lists added, everyday words and the trade's
 * own terms left out). The table is compiled into the system text, so a changed table is a new version.
 */
import { tellEditPrompt as tellEditPrev, type TellEditArgs } from "./tell_edit.v15.ts";
import type { PromptModule } from "./types.ts";

export type { TellEditArgs };
export { cadenceNote } from "./tell_edit.v11.ts";

export const tellEditPrompt: PromptModule<TellEditArgs> = { ...tellEditPrev, version: 16 };
