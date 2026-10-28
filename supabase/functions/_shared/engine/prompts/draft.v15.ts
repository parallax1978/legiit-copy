/**
 * Draft prompt, version 15: version 14's messages, with the hook's credential exception gone from the leads job: the
 * product's name and the speaker's credential wait for the body, and a credential goes only where rule 8 allows it
 * (never a namedrop, never in a social post or a text ad). The system text carries the standard as of this version
 * (rules 1, 4 and 38: the product introduced in one plain sentence and said as what it does for the reader, all of it
 * the promise needs, never its work sent to someone else; rule 8: no namedrop; rules 18 and 26: a time only when it
 * is a reason to act; Section 7.1 tells 18 to 21).
 */
import { draftPrompt as draftPrev, type DraftArgs } from "./draft.v14.ts";
import type { PromptModule } from "./types.ts";

export type { DraftArgs };
export { leadsJob } from "./draft.v14.ts";

const CREDENTIAL_V14 = `The product's name waits for the body, and so does the speaker's credential unless it is the surprise the hook turns on.`;
const CREDENTIAL = `The product's name and the speaker's credential wait for the body, and a credential goes only where rule 8 allows it.`;

/** Version 14's user message with the credential exception gone: the old text, when the call carries it, occurs once and is replaced. */
export function credentialJob(user: string): string {
  const n = user.split(CREDENTIAL_V14).length - 1;
  if (n > 1) throw new Error(`draft v15: the credential line occurs ${n} times`);
  return n === 1 ? user.replace(CREDENTIAL_V14, () => CREDENTIAL) : user;
}

export const draftPrompt: PromptModule<DraftArgs> = { ...draftPrev, version: 15, user: (ctx, args) => credentialJob(draftPrev.user(ctx, args)) };
