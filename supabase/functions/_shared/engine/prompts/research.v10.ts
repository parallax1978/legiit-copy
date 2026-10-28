/**
 * Research prompt, version 10: version 9's messages, with the hunt for a stake against the speaker's own interest gone
 * (it brought back a namedrop and an argument about his own business, rule 8); the speaker's own record is still
 * looked for. The system text carries the standard as of this version (rules 1, 4, 8, 18 and 38; Section 3 without
 * the credential exception; Section 7.1 tells 18 to 21).
 */
import researchV9 from "./research.v9.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./research.v9.ts";

type Args = Parameters<typeof researchV9.user>[1];

const SYSTEM = amend(researchV9.system, [
  [
    `Look for the speaker's own record (what he built, sold, counted or decided, with numbers and dates) and any stake he holds against his own interest (a seller telling buyers what not to buy), and put that stake in speaker.stake with its source. Nothing composed.`,
    `Look for the speaker's own record (what he built, sold, counted or decided, with numbers and dates). Nothing composed.`,
  ],
]);

const researchPrompt: PromptModule<Args> = { ...researchV9, version: 10, system: SYSTEM };

export default researchPrompt;
