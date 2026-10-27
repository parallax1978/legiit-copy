# The owner's tells and words: calibration

`docs/04-copy-standard.md` §7.1 is the owner's list. It governs where it and the human calibration disagree, so these numbers do not set thresholds: every hit counts. They show how precise each detector is and how often human direct response uses what the owner bans. Regenerate with the scripts in this folder's history (the human corpus is not committed; see `human_calibration_report.md`).

Human corpus: 899 public direct response documents, 871,553 words (email, sales pages, opt-ins, social, direct mail, upsells). Quotations and testimonials are skipped for tells 1-10 and the word lists, as in the engine.

| Detector | Human documents with a hit | Human hits per 1,000 words |
|---|---|---|
| em_dash | 50.1% | 2.953 |
| emoji | 11.7% | 0.823 |
| hashtag | 1.9% | 0.036 |
| summary_closer | 2.6% | 0.028 |
| quietly | 1.7% | 0.018 |
| three_beat_deep_third | 0.1% | 0.001 |
| self_answered_question | 17.4% | 0.297 |
| heres_the_windup | 13.3% | 0.211 |
| worth_noting | 3.2% | 0.034 |
| buzzword_pile | 8.2% | 0.139 |
| genuinely_meaningfully | 0.9% | 0.011 |
| disguise_frame | 0.6% | 0.006 |
| hard_truth | 1.2% | 0.015 |
| pressure_test | 0.0% | 0.000 |
| ai_words | 27.3% | 1.130 |
| corporate_filler | 31.7% | 0.830 |
| guru_speak | 13.6% | 0.496 |
| empty_hedge | 0.3% | 0.003 |
| formal_words | 11.8% | 0.146 |
| windup_opener | 1.0% | 0.011 |

Precision notes from the sampled hits: the windup, signpost, word-list and disguise detectors match the pattern itself; literal uses are rare ("quietly" for a quiet ride, "doubled down" at a blackjack table). The self-answered question detector skips tag questions (", okay?") and a question followed by an instruction or a parenthesis; what it still catches in human copy is the device itself ("Carbon? Bad.", "Why? Because..."), which the owner bans.

## The engine's own drafts before the tell edit

```
drafts 49; with any owner tell 36; failing on the owner's rules 20; owner hits 60
heres_the_windup: 28
   [organic_social v14] Here's the part the score hides. The keyword was never your compe…
   [organic_social v13] Here's the part the score hides. The keyword was never your compe…
   [organic_social v12] Here's the part the score hides. The keyword was never your compe…
   [organic_social v11] Here's the part the score hides. The keyword was never your compe…
   [organic_social v4] …, it skipped 6 of 12 groups . Here's how it chose.
   [organic_social v3] …, it skipped 6 of 12 groups . Here's how it chose.
quietly: 12
   [landing_page_short v4] …rite or drop it; nothing gets quietly softened .
   [landing_page_short v3] …rite or drop it; nothing gets quietly softened .
   [landing_page_short v2] …rite or drop it; nothing gets quietly softened .
   [landing_page_short v1] …rite or drop it; nothing gets quietly softened .
   [landing_page_short v8] …or drop it; the engine never quietly softens a claim behind your back . The writer wor…
   [landing_page_short v7] …or drop it; the engine never quietly softens a claim behind your back . The writer wor…
self_answered_question: 10
   [landing_page_short v4] Don't like the angle? One click on Try another angle reruns from the argument step with the last winner excluded.
   [landing_page_short v3] Don't like the angle? One click on Try another angle reruns from the argument step with the last winner excluded.
   [landing_page_short v2] Don't like the angle? One click on Try another angle reruns from the argument step with the last winner excluded.
   [landing_page_short v1] Don't like the angle? One click on Try another angle reruns from the argument step with the last winner excluded.
   [organic_social v3] Running ten client sites a month? Then this is the wrong buy.
   [organic_social v2] Running ten client sites a month? Then this is the wrong buy.
ai_words: 8
   [organic_social v3] Unlock your plan for $1. Seven days of Pro, one site pla…
   [organic_social v3] Unlock your plan for $1 from the link in the first comme…
   [organic_social v2] Unlock your plan for $1. Seven days of Pro, one site pla…
   [organic_social v2] Unlock your plan for $1 from the link in the first comme…
   [email_single v3] …pay $1 to start the research. Unlock your plan for $1. Seven days of Pro, one site pla…
   [email_single v2] ….com and the research starts. Unlock your plan for $1. Seven days of Pro, one site pla…
disguise_frame: 2
   [organic_social v12] …export by keyword difficulty feels like research . It's where bad content gets made.
   [organic_social v11] …export by keyword difficulty feels like research . It's where bad content gets made.
```
