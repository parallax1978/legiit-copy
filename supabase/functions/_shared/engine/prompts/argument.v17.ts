/**
 * Argument prompt, version 17: version 16's messages. A ledger row from an example of the product's output is one
 * run's result: it can be the proof asset (the demonstration the reader can open) and is never the source of a
 * candidate's mechanism or promise, which come from rows the seller or the user stated. The system text carries the
 * standard as of this version (8.1's where a fact comes from; 8.3's fabrication guard).
 */
import argumentV16 from "./argument.v16.ts";
import { amend, type PromptModule } from "./types.ts";

export * from "./argument.v16.ts";

type Args = Parameters<typeof argumentV16.user>[1];

const SYSTEM = amend(argumentV16.system, [
  [
    `- Numbers, names, studies and quotes come only from <claims> and <dossier>.`,
    `- Numbers, names, studies and quotes come only from <claims> and <dossier>. A row whose provenance is an example of the product's output is one run's result: it can be the proof asset (the demonstration the reader can open) and is never the source of a candidate's mechanism or promise, which come from rows the seller or the user stated (provenance seller or user); a row from the terms is never a carrier.`,
  ],
]);

const argumentPrompt: PromptModule<Args> = { ...argumentV16, version: 17, system: SYSTEM };

export default argumentPrompt;
