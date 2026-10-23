# Research artifacts

Data and scripts produced during the copywriting research pass (see `docs/03-copy-research.md`). Everything here is calibration input, not product code.

| Path | What it is | Provenance and limits |
|---|---|---|
| `critique_pairs_v0.json` | 36 before/after critique pairs: a copy chief's named defect, the fix, the principle, test results where documented, and the AI-failure thesis each maps to | Collected from published critiques and split tests (Copyhackers, Copy Chief, CRE, NextAfter, swiped.co annotations and others). `quote_status` says whether wording is verbatim. Seed for the `critiques` table. |
| `rubric/voc.py` | Tagged voice-of-customer verbatims for three real offers (AG1, Motley Fool, ClickUp) from public Trustpilot reviews | Post-purchase sources only; the research doc notes that pre-purchase sources must be added before the minimum-count rule is trusted. |
| `rubric/magnitude.py` | Computes Schwartz's desire dimensions (urgency, staying power, scope) per desire cluster from tagged verbatims, banded 0-3 | Thresholds are working hypotheses. Run: `python3 research/rubric/magnitude.py`. |
| `rubric/agree.py` | Scores twenty candidate arguments per offer on the anchored C1-C14 rubric with gates and tie-breaks; prints two-pass agreement | Gate is desire magnitude >= 4 of 9 (reconciled to the documented value). Agreement figures come from one model in two passes and are an upper bound. |
| `rubric/candidates.md` | The sixty candidate arguments used in the rubric run | |
| `tells/gen_ai_corpus.py` | Generates plain-brief drafts with the `claude` CLI across Haiku, Sonnet and Opus for six formats and twenty offers | "What a marketer gets when they type the obvious request." No style steering. |
| `tells/ai_corpus/` | The 107 drafts that were generated and measured | Claude-only. Re-generate with GPT, Gemini and Jasper before trusting any threshold. |
| `tells/analyze.py`, `tells/ngrams.py` | Counts the tell patterns per document and per 1,000 words in the AI corpus and a human DR corpus | The human corpus (157 Halbert newsletters, 68 Settle emails, 95 Belgray posts, 21 Carlton posts) is not committed: copyrighted. Point `analyze.py` at a local copy to reproduce. |
| `tells/results.json`, `tells/analysis_report.txt`, `tells/ngram_report.txt` | Aggregate results of that comparison; the source of the tier weights in `docs/04-copy-standard.md` Section 7 | Must be recalibrated on the assembled human control corpus (plan item 1.0) before thresholds are enforced in production. |

Not committed, by design: downloaded swipe files, books, PDFs, transcripts and the human newsletter corpus used during research. They are copyrighted and stay out of the repository; the teaching library will be built from material the project has the right to use (see `docs/03-copy-research.md` Section 12).
