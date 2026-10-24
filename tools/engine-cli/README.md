# engine-cli

Local harness for the copy engine. It runs the **same step functions** the `run-step` Edge Function runs
(`supabase/functions/_shared/engine/steps`), against a **real Supabase project**, with a `StepContext` built from
the database by `_shared/engine/context.ts`. Nothing here is a mock: every model call is logged to `llm_calls`,
every step attempt to `generation_steps`, every draft version to `drafts`.

```
# from the repo root
deno run -c supabase/functions/deno.json --allow-read --allow-write --allow-env --allow-net tools/engine-cli/main.ts <command> [options]
```

`deno run` discovers `deno.json` from the entrypoint's directory, and this entrypoint lives under `tools/`, so the
config (and its import map) must be named with `-c`. The `engine` task in `supabase/functions/deno.json` runs the
same file and needs the same flag to work: `"engine": "deno run -c deno.json --allow-read --allow-write --allow-env --allow-net ../../tools/engine-cli/main.ts"`.
Once that lands, `deno task -c supabase/functions/deno.json engine <command>` is the short form.

## Commands

| Command | What it does |
|---|---|
| `run --brief <file.json> --format <id> [--out dir] [--workspace id] [--auto-approve] [--skip-offer]` | Creates an offer (brief, claims, config, optional dossier / approved offer / voice) and a generation in the workspace, then runs the pipeline step by step in the order `pipeline.ts` dictates, applying effects after each step exactly as the runner does. Writes every step output to the out dir. |
| `run --generation <id> [--from <step>]` | Resumes an existing generation from a step (after a pause for offer approval, a failure, or to re-run reviews). |
| `baseline --brief <file.json> --format <id> [--out dir] [--model id]` | One plain prompt ("write a <format> for this offer") on the drafter model, no pipeline, no ledger. Writes `baseline.md` for a blind comparison against `final.md`. |
| `plan --format <id> [--items n]` | Prints the draft call plan for a format (offline, no keys needed). |
| `formats` | Lists the format specs the engine knows. |
| `eval` | TODO: runs a prompt-version set across `eval_briefs` into `eval_runs` / `eval_outputs` (plan item 1.12). Exits 2 with a message. |

## Environment

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=sk-ant-...
ENGINE_WORKSPACE_ID=<uuid>        # optional; else --workspace, else the first workspace, else one is created
ENGINE_DEFAULT_MODEL=claude-opus-5-5
ENGINE_COLD_READ_MODEL=claude-sonnet-5-5   # must differ from the drafter; the cold read step refuses to run otherwise
```

`baseline` and `plan` need no Supabase. The `engine` task already grants `--allow-read --allow-write --allow-env --allow-net`.

## Brief file

Either a bare `OfferBrief` (`schemas/brief.ts`) or an envelope:

```json
{
  "brief": { "product_name": "...", "one_line": "...", "deliverables": [], "price": {"text": "$497", "amount": 497, "currency": "USD", "plan": "one-time"},
             "terms": null, "guarantee": {"text": "...", "type": "money_back", "days": 60, "denominated": true},
             "audience": {"who": "...", "situation": null, "verbatim_sources": []}, "positioning": null,
             "proof_available": [], "competitors": [], "urls": [], "unknowns": [] },
  "claims":  [ /* ClaimRowInput[]: the ledger; every number, name, study, price, guarantee, deadline the copy may cite */ ],
  "config":  { /* OfferConfigInput: vertical, business_opportunity, notice_recipient, humor_policy, greeting, edge_tolerance, refund_window_days, first_week_experience */ },
  "dossier": { /* Dossier (schemas/research.ts). When present the research step is skipped and this becomes the active dossier */ },
  "offer":   { "chosen": { /* ChosenOffer */ }, "options_sheet": [], "reasons": "", "gap_note": "" },
  "voice":   { "name": "...", "parameters": {}, "idiom_bank": [], "dead_words": [], "exemplar_paragraphs": [], "greeting": null, "readability_band": null },
  "options": { "traffic": "cold", "segment": "Cold social", "awareness": "problem_aware", "skeptical": false, "control_text": "...", "item_count": 5, "skip_offer": false, "purpose": "..." }
}
```

- `claims` are inserted with `created_by: "user"`; claims the steps add (intake, offer) get `created_by: "system"`.
- `offer` present → inserted as an **approved** variant, so the offer step is skipped. Otherwise the offer step runs
  and the pipeline **pauses** for approval. `--auto-approve` approves the proposed variant and continues (local convenience;
  the web app owns this decision in production).
- `options.awareness` marks the awareness state as known when the dossier does not diagnose the target segment;
  without it the draft step pauses ("awareness unknown").

## What gets written to `--out`

```
00-setup.json           offer id, generation id, step order
01-research.json        each step: {step, attempt, model, summary, pause, applied, output}
02-offer.json
03-argument.json
04-draft.json
draft-v1.md / .json     every new draft version (markdown with ledger tags; the DraftOutput json)
05-cold_read.json
draft-v2.md             "lead chosen" version when three leads were drafted
06-editorial.json
07-mechanical.json
08-factual.json
09-revise.json
draft-v3.md
...                     cold read and reviews run again after a revision (at most MAX_REVISION_CYCLES)
NN-ship.json
final.md                the control draft
```

Cost per step is printed at the end from `llm_calls` and written to `generations.cost_usd`.

## The draft call plan

`plan.ts` turns a format spec into calls. Sections are drafted in `spec.draft_order`; consecutive small sections are
grouped while their band maximums sum to under 1,200 words (one section may push the total up to 15% over so a tiny
P.S. never costs its own call); a section over the limit is drafted alone. When `lead_variants === 3` the lead section
becomes one call that writes three leads of different type, and the headline is written last in its own call above all
three.

```
$ engine plan --format sales_letter
Long-form sales letter (sales_letter): 7 draft call(s)
  1. sections: offer, price, guarantee, urgency (≤1300 words)
  2. sections: close, ps (≤1350 words)
  3. sections: build_up (≤1500 words)
  4. sections: proof, problem_mechanism (≤1200 words)
  5. sections: solution_mechanism, credibility (≤620 words)
  6. leads: lead (≤1800 words, three variants)
  7. headline: headline (≤60 words)

$ engine plan --format email_single
Promotional email (email_single): 1 draft call(s)
  1. sections: cta, body, hook, signoff, subject (≤704 words)
```

Multi-item formats (sequences, ad sets, webinar packages) treat each item as a unit with its role in block `meta`;
`--items` / `options.item_count` sets the count within the spec's range.

## Notes and limits

- The pipeline loop mirrors `run-step`: `initialSteps` → run → `applyEffects` → `nextSteps`. Review steps fan out
  after the cold read; the loop revises at most `MAX_REVISION_CYCLES` times, then ships.
- A sales letter is seven Opus calls in the draft step alone. Inside an Edge Function that is more than one 400s
  invocation can hold; the CLI does not care, and the runner's job is to chain or split them (architecture doc §5
  names the long-running worker as the escape hatch).
- `eval` is not implemented. Until it is, `run` and `baseline` on the same brief produce comparable markdown for a
  manual blind read.
