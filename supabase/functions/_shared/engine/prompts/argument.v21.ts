/**
 * Argument prompt, version 21: version 20's messages, and the candidates call also returns the product introduced in
 * one plain sentence with its name (twenty words or fewer, as a friend would say it to the reader; software is a tool
 * or an app, a service is people doing the work). The drafter reads it when the user left the setup's product sentence
 * blank, so a user who fills nothing in still gets the product said plainly, and the one_line the intake wrote from
 * the seller's own labels stays out of the copy. The system text carries the standard as of this version.
 */
import argumentV20 from "./argument.v20.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./argument.v20.ts";

type Args = Parameters<typeof argumentV20.user>[1];

export const PRODUCT_SENTENCE_RULE = `- The candidates call also returns product_sentence, once for the run: the product introduced in one plain sentence with its name, twenty words or fewer, as a friend would say it to the reader across a table: what it is (software is a tool or an app, never "a service"; a service is people doing the work for him) and what it does for him, all of it the promise needs (what it finds, decides and makes for him), from the rows the seller and the user stated; no label from its screens, no step of its process, no score, no term of his trade's tools. When <setup> gives a product sentence, product_sentence is that sentence as given.`;

const SYSTEM = amend(argumentV20.system, [
  [`- Each candidate carries: id (A01, A02, ...);`, `${PRODUCT_SENTENCE_RULE}\n- Each candidate carries: id (A01, A02, ...);`],
]);

const RETURN_V20 = `Return cluster_vocabulary_used and candidates.`;
const RETURN_V21 = `Return cluster_vocabulary_used, product_sentence and candidates.`;

/** Version 20's candidates task with product_sentence in the return line: the old line, when the call carries it, occurs once and is replaced. */
export function productSentenceJob(user: string): string {
  const n = user.split(RETURN_V20).length - 1;
  if (n > 1) throw new Error(`argument v21: the return line occurs ${n} times`);
  return n === 1 ? user.replace(RETURN_V20, () => RETURN_V21) : user;
}

const argumentPrompt: PromptModule<Args> = { ...argumentV20, version: 21, system: SYSTEM, user: (ctx, args) => productSentenceJob(argumentV20.user(ctx, args)) };

export default argumentPrompt;
