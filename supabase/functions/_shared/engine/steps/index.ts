import type { StepName } from "../config.ts";
import type { StepFn } from "./types.ts";
import { intakeStep } from "./intake.ts";
import { researchStep } from "./research.ts";
import { offerStep } from "./offer.ts";
import { argumentStep } from "./argument.ts";
import { draftStep } from "./draft.ts";
import { tellEditStep } from "./tell_edit.ts";
import { cold_readStep } from "./cold_read.ts";
import { editorialStep } from "./editorial.ts";
import { mechanicalStep } from "./mechanical.ts";
import { factualStep } from "./factual.ts";
import { reviseStep } from "./revise.ts";
import { shipStep } from "./ship.ts";

export const STEPS: Record<StepName, StepFn> = {
  intake: intakeStep,
  research: researchStep,
  offer: offerStep,
  argument: argumentStep,
  draft: draftStep,
  tell_edit: tellEditStep,
  cold_read: cold_readStep,
  editorial: editorialStep,
  mechanical: mechanicalStep,
  factual: factualStep,
  revise: reviseStep,
  ship: shipStep,
};
export type { StepContext, StepFn, StepResult, StepEffects } from "./types.ts";
