import type { StepFn } from "./types.ts";

export const cold_readStep: StepFn = (_ctx) => {
  throw new Error("step 'cold_read' not implemented yet");
};
