# The owner's tells and words: calibration

`docs/04-copy-standard.md` §7.1 is the owner's list. It governs where it and the human calibration disagree, so these numbers do not set thresholds: every hit counts. They show how precise each detector is and how often human direct response uses what the owner bans. Regenerate with the scripts in this folder's history (the human corpus is not committed; see `human_calibration_report.md`).

Human corpus: 899 public direct response documents, 871,553 words (email, sales pages, opt-ins, social, direct mail, upsells). Quotations and testimonials are skipped for tells 1-10 and the word lists, as in the engine.

| Detector | Human documents with a hit | Human hits per 1,000 words |
|---|---|---|
| em_dash | 64.5% | 4.093 |
| emoji | 11.1% | 0.516 |
| hashtag | 2.1% | 0.038 |
| summary_closer | 3.1% | 0.037 |
| quietly | 1.7% | 0.018 |
| three_beat_deep_third | 0.3% | 0.006 |
| self_answered_question | 41.4% | 0.881 |
| heres_the_windup | 17.7% | 0.281 |
| label_windup | 0.8% | 0.009 |
| worth_noting | 3.6% | 0.039 |
| buzzword_pile | 5.1% | 0.054 |
| genuinely_meaningfully | 0.9% | 0.011 |
| disguise_frame | 0.6% | 0.006 |
| hard_truth | 1.2% | 0.014 |
| pressure_test | 0.0% | 0.000 |
| ai_words | 28.3% | 1.181 |
| corporate_filler | 32.1% | 0.847 |
| guru_speak | 13.9% | 0.545 |
| empty_hedge | 2.1% | 0.023 |
| formal_words | 12.6% | 0.163 |
| empty_teaser | 2.0% | 0.022 |
| windup_opener | 1.3% | 0.015 |

Precision notes from the sampled hits: the windup, signpost, word-list and disguise detectors match the pattern itself; literal uses are skipped where the code can tell (a machine that runs quietly, a cardiac or load stress test, kids in costumes, a porcelain veneer, a delivery line such as "Here's the link:"). The self-answered question detector skips tag questions (", okay?"), a question to the reader followed by an instruction, the buyer's own questions ("Can I cancel?"), FAQ, objection and Q&A sections, and list items; it pairs a question paragraph with the next paragraph, so what it catches in human copy is the device itself ("Carbon? Bad.", "Why? Because...", "His mission? To train..."), which the owner bans. The em dash count includes a spaced hyphen between words used as a dash ("It works - fast."), the typed stand-in for one; ranges ("9 - 5") are not counted. The stack is counted per piece: an email of a sequence, a webinar asset, the whole of a single piece.

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

## Round 2: repeated_phrase and step-count windups (2026-10-27)

repeated_phrase (a run of five words or more, two content words, said again in another sentence; word stems, so
"leaves the decision to you" repeats "leave the decision to you"; quotes, CTAs, prices, guarantees and disclosures
skipped), counted per piece, before the one free repeat:

| Family (human corpus) | Docs | 0 repeats | 1 | 2 | 3+ |
|---|---|---|---|---|---|
| social | 145 | 67% | 19% | 7% | 8% |
| email | 359 | 57% | 16% | 10% | 18% |
| sales page | 132 | 98% of pages have one (the promise is repeated on purpose) | | | |

The check runs on posts, ads, emails and messages only, and the first repeat in a piece is free: 14% of human posts
then count one or more. The fresh test post (ffc9ed71, v9) had four, all of them lines the judges named.

label_windup gained the step-count forms ("It takes seven steps, and...", "seven steps, in this order:", "Three
reasons to switch:"); "Setup takes three steps." and "It takes three steps to set up." are facts and pass. Human
social posts with a count windup: 8%.

## Round 3: never_reveal, colon reveals, "What ... is" openers, count_windup (2026-10-27)

Human corpus, share of documents with a hit:

| Pattern | social (145) | email (359) | sales page (132) |
|---|---|---|---|
| never_reveal ("X was never going to", "The price was never the problem"; first-person stories skipped) | 0.0% | 0.0% | 0.8% |
| colon reveal ("leaves the decision with you: whether...") | 0.0% | 0.0% | 0.0% |
| "What ... is" opener ("What comes back is", "What matters is") | 0.7% | 0.6% | 0.8% |

The step and reason counts moved out of label_windup into count_windup, which counts in short pieces only
(organic social, TikTok/Reels, Meta ad, Google RSA, single, sequence and cold email, SMS): a webinar's three
secrets, a VSL's plan and a listicle's numbered reasons are the structure those formats ask for. Its colon must be
a label's (not a clock's, a ratio's or a link's), and a digit count only counts after a determiner or at a sentence
start. The round-2 post (8253478d, v9) now scores 3 owner tells and fails the first-comment length gate (63 words).

## Round 4: aphorism_reframe, bare_credential, slogan_couplet (2026-10-27)

None of the 895 human posts, emails, sales pages, opt-ins and letters has any of the three:
"every skip is a page you don't pay a writer for" (a reframe written as an aphorism), "I'm Legiit's founder." as a
paragraph of its own, and a "settles neither" line answered by "settles both" within a few lines of one piece. The
round-3 post (9e7df31c, v9) has all three and now fails the stack; its two lines lifted from ledger rows ("links to the
ranking pages it read and the backlink check behind it", "two thousand keywords with scores, a difficulty number to
interpret") are handed to the tell edit as ledger_wording findings (seven or more words in a row from a row).
