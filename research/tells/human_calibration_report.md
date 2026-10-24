# Human-side tell calibration report

Status: first human-side calibration of the Section 7 tell checklist in `docs/04-copy-standard.md`. Measured with the unmodified lexicon and counting functions of `research/tells/analyze.py` (loaded by `exec` of its definition block from an adapted runner kept outside the repo) over a new human direct-response corpus of 899 documents / 879,610 words assembled from publicly posted copy. The corpus itself is copyrighted and is not committed; only aggregates are in `human_calibration.json` and this report. Fetched 2026-10-24.

## 0. What the corpus is and is not

| Format | Docs | Words | What it holds |
|---|---|---|---|
| email | 359 | 303,528 | Financial e-letter issues (Stansberry Digest, DailyWealth, Health & Wealth Bulletin, Banyan Hill, Money & Markets, Bonner Private Research, Oxford Club, Manward), practitioner emails published as posts (Justin Goff, Drayton Bird, Copy Chief, Andre Chaperon), and 86 SaaS marketing/lifecycle emails (Front's Good Email Copy board) |
| sales_page | 132 | 355,386 | 49 ClickBank-retailed VSL landers and text sales letters (supplements, relationship, manifestation, DIY) fetched from the vendors' own domains, plus 83 Mindvalley long-form program pages |
| optin | 207 | 123,808 | 137 Substack publication "About / Why subscribe" pages, 66 Mindvalley free-masterclass registration pages, 4 Money & Markets free-newsletter signup pages |
| social | 145 | 67,419 | X/Twitter threads by marketing and copywriting practitioners (Hormozi, Bush, Cole, Welsh, Koe, Bloom, Dry, Cattoni, Isenberg and others) as unrolled on Threadreader |
| direct_mail_letter | 52 | 21,123 | 1960s B2B direct-mail sales letters from the Ted Nelson junk-mail collection on archive.org (OCR text, filtered for OCR quality) |
| upsell | 4 | 8,346 | ClickBank vendor OTO pages found by path guessing |

Not obtained, and why:
- Meta ads: zero documents. The Meta Ad Library UI and API need a token or a browser session (403 from this container); LinkedIn Ad Library and TikTok Creative Center also refused; adspy vendors (BigSpy, AdSpy, Foreplay, Minea, PowerAdSpy) are login-gated; swiped.co and swipefile.com hold ad images and commentary, not ad text; vendor affiliate "swipe" pages are gated. The AI meta_ad corpus therefore still has no human control. This is the largest remaining gap.
- Upsell pages: 4 after de-duplication. OTO pages are not indexed or linked publicly; path guessing on 160 ClickBank domains found 12 pages that collapsed to 4 distinct documents. The AI upsell numbers below should be read against the sales_page human column, not the upsell one.
- Agora-family promotion landers (pro.*, secure.*, orders.*) are JavaScript-rendered or robots-excluded and return an empty shell to a plain fetch; the 53 promotion links harvested from e-letter issues yielded no text. Oxford Club and Manward issue pages are paywalled. The financial long-form sales letter is therefore represented only by the e-letter issues that promote it, not by the landers themselves.
- No Milled or Really Good Emails ecommerce emails: Milled returns 403 to non-browser clients and Really Good Emails stores screenshots. Inboxflows was tried and dropped for the same reason (image-only bodies).
- Web search quota was exhausted on this turn, so discovery was limited to sitemaps, feeds and known domains; the corpus is biased toward publishers who expose sitemaps.
- There is no overlap with the four-author corpus (Halbert, Settle, Belgray, Carlton were deliberately excluded), so the two human corpora are independent checks.

Caveats on the counting: all text was HTML-stripped, so the markdown-only tells (`md_heading`, `bullet_md`, `bold_leadin_sentence`, `**Label:**`) cannot fire on human web copy by construction; the plain-text `Label:` branch of `bold_label_colon` does fire and is reported separately below. Threadreader threads were re-fetched with correct UTF-8 after a mojibake pass was found; ClickBank pages were re-fetched the same way. OCR letters carry OCR noise in CAPS and fragment counts.

## 1. What changed versus the four-author corpus (the numbers that matter)

Rates per 1,000 words. "4-author" is `results.json` `human_all` (341 docs, 653k words); "new" is this corpus pooled; AI is `results.json` `ai_all`.

1. Rule of three: 4-author 1.45, new 2.68 (email 1.61, sales_page 3.58, optin 3.59, social 1.57), AI 3.99. Human sales pages and opt-in pages run at the AI rate. Per-document p90 is 4.0 (email), 6.7 (sales_page), 10.9 (optin). The Section 7 threshold of 3 per 1,000 flags the median human sales page (p50 3.39).
2. Trailing participles: 4-author 0.22, new 0.68 (email 0.72, sales_page 0.76, optin 0.73, social 0.25), AI 0.78. The AI/human gap collapses from 3.7x to 1.1x. Per-document p75 is 0.75-1.17 and p90 1.7-2.5 in every long format. The Section 7 threshold of 0.6 flags 25-45% of human documents.
3. Hedge vocabulary: 4-author 0.41, new 0.52 (sales_page 0.60, social 0.64), AI 0.67. Not a discriminator at the pooled level; per-document p90 is 1.5-2.6. The threshold of 1 per 1,000 flags 15-25% of human long copy.
4. "actually / exactly / every single": 4-author 1.21 combined, new 1.08 combined, AI 3.65. This family holds up: the AI rate is 3.4x the new human rate and the human per-document p90 is 2.2 (sales_page) to 4.7 (optin). The threshold of 2 per 1,000 is at the human p75-p85, which is tolerable for a weight-2 tell but not for a hard gate.
5. Em dashes: 4-author 1.57, new 2.92 (email 4.77, optin 3.59, social 1.97, sales_page 1.35), AI 0.70. Human copy uses em dashes 2-7x more than the AI drafts. The "em dashes at or below 1.6 per 1,000 are not a tell" clause is far too tight: human email p50 is 2.1, p75 7.2, p90 11.9.
6. Exclamation marks: 4-author 6.10, new 1.70 (email 1.02, sales_page 2.10, social 2.65, upsell 7.31), AI 0.25. The four-author figure was Halbert- and Settle-driven; the broader corpus is a quarter of that but still 7x the AI rate. Still not a tell.
7. Ellipses: 4-author 9.74, new 5.85 (email 11.70 driven by the financial e-letters, sales_page 3.04, optin 1.29), AI 0.47. Confirms "never penalize"; the AI drafts are the outlier on the low side.
8. ALL-CAPS words: 4-author 8.50, new 11.83 (sales_page 14.27, email 6.78, OCR letters 90 from letterheads), AI 18.55. The AI rate is above both human corpora; caps is not a human-rate tell but AI caps density is itself slightly elevated.
9. Marketing vocabulary ("unlock", "elevate", "transform", "empower", "effortless", `ai_vocab`): 4-author 0.34 `ai_vocab`, new 2.05 (sales_page 3.65, optin 2.09), AI 0.03. The AI drafts in this corpus avoided these words completely; human info-product and self-development sales pages use them heavily (Mindvalley: "transform" 2.79 per 1,000). The Tier 3 vocabulary list is a genre marker, not an AI marker, in this sample.
10. "designed to / built for / crafted": 4-author 0.05, new 0.29 (sales_page 0.43, optin 0.37), AI 1.25. Still 3-4x, but human product copy uses it; Tier 1 weight 4 on every hit over-penalizes sales pages (p90 about 1 hit per 1,000 words).
11. "cancel anytime / no contracts": 4-author 0.00, new 0.11 (sales_page 0.28, 9% of human docs), AI 0.56. Subscription offers say it; it belongs to the offer block, not to Tier 1.
12. Tier 1 phrases that stayed clean: "That's why we built" (0.01), "You're not alone" (0.01), "If that sounds familiar" (0.00), "less than a cup of coffee" (0.00), "In this video / stay with me" (0.02 / 0.01), self-posed question headers (0.00), "Here's what" (0.21 vs AI 0.98), `bracket_placeholder` (one hit in 899 docs), `hey_there` (0.01), `most_people` (0.01), `youve_tried` (0.01), `nobody_tells_you` (0.00), `quick_question` (0.00). These remain hard discriminators and should keep or gain weight.
13. Anaphora (same opener 3+ times): 4-author 0.83, new 0.70, but social threads 2.74 (list-style threads). AI 1.39. Weak discriminator in long copy; must be exempt in the social format.
14. "Sound familiar", "I get it", "picture this", "here's the kicker", "game-changer": all at or near 0 in both human corpora and 0-0.08 in AI. Unmeasurable in this AI corpus; keep as Tier 3 on prior evidence only.
15. The plain-text `Label:` branch of `bold_label_colon` fires in 54% of human documents (email 42%, sales_page 92%, social 70%); the markdown `**Label:**` branch fires in 0%. "Editor's note:", "P.S.:", speaker labels and FAQ labels are ordinary human copy. The committed regex makes the Tier 0 hard reject fire on 34% of human documents (305 of 899), almost entirely from this branch.
16. Emoji: new 0.34 per 1,000 (optin 1.12, social 1.23; email 0.02; sales_page 0.19, mostly check marks), AI 4.91. Check-mark bullets appear on 3-4% of human sales and opt-in pages. The Tier 0 wording "emoji bullets in email, sales page or VSL" is right for email (0.5% of human emails) but a check-mark on a web sales page is human practice at low density.
17. Sentence-length coefficient of variation: 4-author 0.86, new 0.76 mean (email 0.65, social 0.70, optin 0.81, sales_page 0.93), AI 0.83. 78% of human emails over 300 words and 55% of threads sit under the 0.70 structural flag; so do 18% of opt-in pages and 9% of sales pages. The flag as written would mark the majority of human emails.
18. Flesch-Kincaid grade: new 6.8 mean (social 5.3, email 6.5, sales_page 7.3, optin 8.1); AI 5.6 (vsl 4.5, upsell 4.7, email 5.2, optin 8.2). AI drafts read one to two grades easier than human copy in the same formats; fragments (lines of 4 words or fewer) are 29% of human sentences versus 23% in AI.

## 2. Section 7 applied to human copy: false-positive rates

Scoring implemented from the Section 7 table as written (Tier 1 weight 4 per hit, Tier 2 weight 2 when the density threshold is crossed or the construction appears, Tier 3 weight 1 per hit, per 300 words; Tier 0 counted separately). The same scorer was run over the committed AI corpus for comparison.

| Corpus | Docs | Mean score | p50 | % review-flagged (>=6) | % hard-fail (>=10) | % with a Tier 0 hit |
|---|---|---|---|---|---|---|
| Human all | 899 | 2.97 | 1.90 | 14.4 | 4.2 | 34.0 (bold_label_colon 305, emoji 8, placeholder 1) |
| Human email | 359 | 1.93 | 1.26 | 5.6 | 2.0 | 42.3 |
| Human sales_page | 132 | 4.81 | 4.82 | 31.1 | 3.0 | 91.7 |
| Human optin | 207 | 3.58 | 2.44 | 15.5 | 8.2 | 0.0 |
| Human social | 145 | 3.54 | 2.50 | 20.7 | 6.9 | 0.0 |
| Human direct_mail_letter | 52 | 1.70 | 0.00 | 11.5 | 0.0 | 63.5 |
| AI all | 107 | 8.89 | 8.05 | 63.6 | 38.3 | 75.7 |
| AI email | 20 | 9.77 | 7.72 | 65.0 | 40.0 | 100 |
| AI meta_ad | 20 | 8.15 | 6.48 | 50.0 | 40.0 | 60.0 |
| AI optin | 20 | 7.75 | 7.16 | 65.0 | 25.0 | 15.0 |
| AI sales_page_lead | 20 | 8.58 | 7.04 | 55.0 | 30.0 | 95.0 |
| AI vsl_opener | 20 | 9.64 | 9.44 | 75.0 | 45.0 | 100 |
| AI upsell | 7 | 10.58 | 11.43 | 85.7 | 71.4 | 100 |

Read: with the Tier 0 regex fixed, the weighted score separates the corpora (human p50 1.9 vs AI p50 8.0) but the review flag at 6 catches 31% of human sales pages and 21% of human threads while missing 36% of AI drafts. Almost all human flags come from the three density tells (rule of three, trailing participle, hedge) and from Tier 3 vocabulary on self-development pages.

## 3. Threshold changes recommended for Section 7, with the numbers

Target: a review flag that fires on under 10% of human documents in each format at the current detector, and a hard fail that fires on under 2%.

1. `bold_label_colon` Tier 0: restrict to the markdown branches (`**Label:**`, `**Label**:`) and to bullet lines that begin with a bold label. Drop the plain-text `^Label: ` branch, or demote it to Tier 3 weight 1 above 3 per 1,000 words (human p90 is 2.9 in sales pages, 8.4 in threads). As committed it hard-rejects 34% of human copy and 92% of human sales pages.
2. Emoji Tier 0: keep for email (human 0.02 per 1,000, 0.5% of docs). For sales pages and opt-in pages, treat check marks (✓ ✔ ✅) as allowed up to 1 per 300 words and count other emoji only; human sales pages run 0.15 per 1,000 check marks and 0.003 other emoji.
3. Rule of three: move the Tier 2 threshold from 3 per 1,000 to a per-format level at the human p90: email 4, social 4, sales page 7, opt-in 11. Below those levels the tell carries no weight. The AI pooled rate (3.99) sits at the human sales-page median, so this tell only discriminates at the extreme.
4. Trailing participle: move the threshold from 0.6 to 2.0 per 1,000 (human p90 1.7-2.5 across long formats; AI pooled 0.78). At 0.6 it flags 25-45% of human documents and does not separate the corpora. Consider dropping it from the weighted score and keeping it as an editing note.
5. Hedges in body copy: move from 1 to 2 per 1,000 (human p90 1.5-2.6, AI 0.67) and apply it only inside claim sentences (the ledger match), as the standard already intends; as a bare vocabulary count it is not a discriminator.
6. "actually / exactly / every single": keep at 2 per 1,000 for email and sales page (human p90 3.3 / 2.2, AI 3.65) but raise to 4 for opt-in and social (human p90 4.7 / 3.9). This is the one Tier 2 density tell that still separates.
7. "rather than": the threshold of 2 per 300 words (6.7 per 1,000) is never reached by either corpus (human max 6.4, p95 under 0.9; AI 0.03). Remove it from Tier 2; it is noise.
8. Negative parallelism "It's not X. It's Y." at 1 per 1,000: human p95 is 0.0-0.14, max 2.1; AI 0.06. Keep the threshold; it fires on about 2% of human docs, almost all legitimate belief corrections.
9. Em dash clause under "Not tells": raise "at or below 1.6 per 1,000" to "at or below 12 per 1,000" (human email p90 11.9, optin p90 11.1, social p90 7.0, sales p90 3.9). The AI drafts use fewer em dashes than humans (0.70), so em dash density is not an AI tell in this sample and should carry no weight at any rate.
10. Sentence-length CV structural flag: lower from 0.70 to 0.50 for email and social (human email mean 0.65, median 0.63; 78% of long human emails are under 0.70) and keep 0.70 for sales pages and VSLs (human mean 0.93, 9% under 0.70). AI sales_page_lead and vsl_opener drafts average 0.83 and 0.73, so even at 0.70 the flag catches only the flattest VSL drafts.
11. Tier 3 marketing vocabulary: drop "transform", "unlock", "elevate", "empower", "effortless" from the AI-tell list for self-development, education and info-product offers (human sales_page 3.65 per 1,000 `ai_vocab`, 2.79 "transform"; AI 0.03). Keep them as a genre style note. Retain "game-changer", "picture this", "here's the kicker", "delve", "tapestry", "landscape", "seamless" and "cutting-edge" at weight 1 (human 0.00-0.04).
12. "designed to / built for": move from Tier 1 (weight 4 per hit) to Tier 2 weight 2 above 1 per 1,000 words (human sales p90 about 1.0; AI 1.25, 35% of AI docs). Per-hit weight 4 flags a human product page on its second mention.
13. "cancel anytime / no contracts": move from Tier 1 to the offer-block check (allowed once, with the denominated guarantee). 9% of human docs and 28% of human sales pages with a subscription say it.
14. Keep, and consider raising to Tier 0 in email and VSL where the human rate is zero: `bracket_placeholder`, `thats_why_we`, `youre_not_alone`, `if_that_sounds_like_you`, `less_than_a_cup`, `self_posed_q_header`, `quick_question`, `nobody_tells_you`, `hey_there`. Each is 0.00-0.01 per 1,000 in 879k human words.
15. Anaphora triads: exempt the social format (human 2.74 per 1,000, list threads) and keep weight 2 elsewhere only above 1.5 per 1,000 (human email 0.43, sales 0.61; AI 1.39).
16. Fragments, exclamation marks, ellipses, ALL-CAPS: confirmed "never penalize". Human rates are 7x (exclaim), 12x (ellipsis) and 1.3x (fragment rows) the AI rates; AI caps density is higher than human, so caps is if anything an AI-side signal.
17. Readability: add a soft note rather than a flag: AI drafts read 1-2 grades easier than human copy in the same format (AI email FK 5.2 vs human 6.5; AI VSL 4.5 vs human sales 7.3). Do not enforce a floor; grade is offer-dependent.

With changes 1-7 and 11-13 applied to the per-document counts in `perdoc_metrics.json` (not committed) - markdown-only Tier 0, email-only emoji, per-format rule-of-three p90, trailing participle 2.0, hedge 2.0, actually-family per format, rather-than removed, em dash ignored, designed-to and cancel-anytime demoted, marketing vocabulary dropped from Tier 3, anaphora exempt in social - the human review-flag rate falls from 14.4% to 3.7%, the hard-fail rate from 4.2% to 1.2%, and the Tier 0 rate from 34.0% to 0.6%. The AI corpus was not re-scored under the revised weights (its score is carried by Tier 1 phrases, placeholders and markdown structure, which the changes do not touch); that re-score belongs with the detector code change.

## 4. Open items

- Obtain a human Meta ad corpus (Meta Ad Library API access token, or a browser session) before any threshold is enforced on the meta_ad format; the AI meta_ad drafts carry a 50% flag rate with no human control.
- Obtain upsell pages at scale (SamCart, ClickFunnels and Agora upsell flows need purchases or partner access).
- Re-generate the AI corpus with GPT, Gemini and Jasper as `research/README.md` already requires; several Tier 3 words were absent from Claude drafts and may not be absent elsewhere.
- Rerun this report after the detector regex is changed; `analyze.py` was not modified for this calibration.

---

# Appendix: full tables (generated)

| AI drafts (results.json `ai_all`) | 107 | 35857 | Claude Haiku/Sonnet/Opus plain-brief drafts, six formats |
| Four-author human control (results.json `human_all`) | 341 | 653384 | Halbert newsletters, Settle emails, Belgray posts, Carlton posts |
| New human corpus (this run, `human_all`) | 899 | 879610 | 6 formats, see below |

| Format | Docs | Words | Sources (docs) |
|---|---|---|---|
| direct_mail_letter | 52 | 21123 | archive_tnm 52 |
| email | 359 | 303528 | goodemailcopy 86, stansberry 78, justingoff 40, draytonbird 40, copychief 30, bonner 30, banyanhill 24, moneyandmarkets 18, chaperon 7, oxfordclub 5, manward 1 |
| optin | 207 | 123808 | substack 137, mindvalley 66, moneyandmarkets 4 |
| sales_page | 132 | 355386 | mindvalley 87, clickbank_vendor 45 |
| social | 145 | 67419 | threadreader 145 |
| upsell | 4 | 8346 | clickbank_vendor 4 |

## Appendix 2. Tell rates: AI vs four-author human vs new human corpus (per 1,000 words; % of docs with a hit)

Sorted by the AI/four-author ratio reported in results.json. The last two columns are the new corpus. A tell whose new-human rate approaches or exceeds the AI rate is not a discriminator and must not carry weight.

| Tell | AI /1k | 4-author /1k | New human /1k | AI %docs | 4-author %docs | New human %docs | new-human/AI ratio |
|---|---|---|---|---|---|---|---|
| md_heading | 4.94 | 0.00 | 0.00 | 50 | 0 | 0 | 0.0 |
| self_posed_q_header | 1.00 | 0.00 | 0.00 | 7 | 0 | 0 | 0.0 |
| cancel_anytime | 0.56 | 0.00 | 0.11 | 11 | 0 | 8 | 0.2 |
| hey_there | 0.50 | 0.00 | 0.01 | 17 | 0 | 1 | 0.0 |
| bold_leadin_sentence | 2.93 | 0.01 | 0.00 | 28 | 1 | 0 | 0.0 |
| bracket_placeholder | 5.66 | 0.02 | 0.00 | 59 | 2 | 0 | 0.0 |
| youve_tried | 0.25 | 0.00 | 0.01 | 7 | 0 | 1 | 0.1 |
| in_this_video | 0.25 | 0.00 | 0.02 | 8 | 0 | 1 | 0.1 |
| youre_not | 0.20 | 0.00 | 0.02 | 7 | 0 | 1 | 0.1 |
| not_because_a_because_b | 0.14 | 0.00 | 0.00 | 5 | 0 | 0 | 0.1 |
| youre_not_alone | 0.14 | 0.00 | 0.01 | 5 | 0 | 1 | 0.2 |
| bold_label_colon | 14.06 | 0.07 | 2.57 | 88 | 14 | 55 | 0.2 |
| thats_why_we | 0.39 | 0.00 | 0.01 | 13 | 0 | 1 | 0.0 |
| with_without_contrast | 0.11 | 0.00 | 0.00 | 3 | 0 | 0 | 0.1 |
| ps | 0.33 | 0.00 | 0.05 | 11 | 0 | 5 | 0.2 |
| quick_question | 0.08 | 0.00 | 0.00 | 3 | 0 | 0 | 0.1 |
| sound_familiar | 0.08 | 0.00 | 0.00 | 3 | 0 | 0 | 0.1 |
| most_people | 0.25 | 0.00 | 0.01 | 8 | 0 | 1 | 0.1 |
| less_than_a_cup | 0.20 | 0.00 | 0.00 | 7 | 0 | 0 | 0.1 |
| say_goodbye | 0.03 | 0.00 | 0.01 | 1 | 0 | 1 | 0.7 |
| if_that_sounds_like_you | 0.03 | 0.00 | 0.00 | 1 | 0 | 0 | 0.3 |
| without_the_fluff | 0.08 | 0.00 | 0.01 | 3 | 0 | 1 | 0.2 |
| no_no_just | 0.14 | 0.00 | 0.00 | 5 | 1 | 0 | 0.1 |
| wait_opener | 0.14 | 0.00 | 0.01 | 4 | 1 | 1 | 0.2 |
| so_opener | 0.25 | 0.01 | 0.75 | 7 | 1 | 26 | 2.9 |
| thats_where_comes_in | 0.06 | 0.00 | 0.01 | 2 | 0 | 1 | 0.3 |
| designed_to | 1.25 | 0.05 | 0.29 | 35 | 7 | 16 | 0.2 |
| emoji_check | 4.91 | 0.20 | 0.34 | 33 | 4 | 7 | 0.1 |
| scroll_down | 0.20 | 0.01 | 0.14 | 6 | 2 | 12 | 0.7 |
| stick_with_me | 0.42 | 0.02 | 0.01 | 12 | 4 | 1 | 0.0 |
| bullet_md | 10.85 | 0.53 | 1.03 | 70 | 13 | 14 | 0.1 |
| stop_verbing | 0.28 | 0.01 | 0.02 | 9 | 2 | 2 | 0.1 |
| deserve_better | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.2 |
| nothing_to_lose | 0.03 | 0.00 | 0.01 | 1 | 0 | 1 | 0.5 |
| join_thousands | 0.00 | 0.00 | 0.05 | 0 | 0 | 5 | 6.5 |
| introducing | 0.00 | 0.00 | 0.06 | 0 | 0 | 4 | 7.2 |
| they_x_they_y_they_z | 0.03 | 0.00 | 0.00 | 1 | 0 | 0 | 0.3 |
| dear_friend | 0.00 | 0.00 | 0.01 | 0 | 0 | 1 | 1.9 |
| the_best_part_q | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.1 |
| we_get_it | 0.03 | 0.00 | 0.00 | 1 | 0 | 0 | 0.3 |
| nobody_tells_you | 0.11 | 0.01 | 0.00 | 4 | 1 | 0 | 0.1 |
| thats_it | 0.06 | 0.00 | 0.01 | 2 | 1 | 1 | 0.3 |
| tired_of | 0.06 | 0.00 | 0.01 | 2 | 1 | 1 | 0.3 |
| heres_the_thing | 0.06 | 0.01 | 0.02 | 2 | 1 | 1 | 0.4 |
| no_gimmicks | 0.08 | 0.01 | 0.01 | 3 | 2 | 1 | 0.2 |
| the_old_way | 0.03 | 0.00 | 0.02 | 1 | 1 | 1 | 0.7 |
| real_people_real | 0.03 | 0.00 | 0.02 | 1 | 1 | 2 | 0.8 |
| thats_why | 0.59 | 0.08 | 0.15 | 18 | 11 | 10 | 0.3 |
| ready_to_q | 0.06 | 0.01 | 0.01 | 2 | 1 | 1 | 0.3 |
| you_already | 0.25 | 0.04 | 0.02 | 8 | 6 | 2 | 0.1 |
| real_noun | 0.28 | 0.05 | 0.07 | 8 | 7 | 5 | 0.3 |
| let_that_sink | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.0 |
| spoiler | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.0 |
| peace_of_mind | 0.03 | 0.01 | 0.03 | 1 | 1 | 3 | 1.0 |
| plus_opener | 0.00 | 0.00 | 0.03 | 0 | 0 | 3 | 4.1 |
| thats_the_real | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.1 |
| ive_been_there | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.2 |
| dont_miss_out | 0.00 | 0.00 | 0.01 | 0 | 0 | 0 | 1.6 |
| fast_paced | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.0 |
| enter_product | 0.00 | 0.00 | 0.00 | 0 | 0 | 0 | 1.0 |
| triple_no | 0.06 | 0.01 | 0.01 | 2 | 2 | 1 | 0.4 |
| guarantee | 1.14 | 0.23 | 0.89 | 20 | 22 | 17 | 0.8 |
| what_if | 0.14 | 0.03 | 0.06 | 4 | 5 | 4 | 0.5 |
| heres_what | 0.98 | 0.22 | 0.21 | 33 | 28 | 15 | 0.2 |
| its_not_x_its_y | 0.06 | 0.02 | 0.04 | 2 | 3 | 3 | 0.8 |
| im_going_to_show | 0.14 | 0.04 | 0.03 | 5 | 5 | 2 | 0.2 |
| one_thing | 0.36 | 0.10 | 0.11 | 8 | 16 | 7 | 0.3 |
| no_more | 0.08 | 0.02 | 0.03 | 2 | 4 | 3 | 0.4 |
| exactly | 1.03 | 0.27 | 0.20 | 28 | 33 | 13 | 0.2 |
| trailing_participle | 0.78 | 0.22 | 0.68 | 21 | 32 | 32 | 0.9 |
| game_changer | 0.00 | 0.00 | 0.04 | 0 | 1 | 3 | 4.9 |
| heres_the_kicker | 0.00 | 0.00 | 0.00 | 0 | 1 | 0 | 1.3 |
| reclaim | 0.00 | 0.00 | 0.07 | 0 | 1 | 3 | 8.5 |
| next_level | 0.00 | 0.00 | 0.02 | 0 | 1 | 2 | 2.7 |
| heres_what_i_mean | 0.00 | 0.00 | 0.01 | 0 | 1 | 1 | 1.7 |
| imagine | 0.06 | 0.02 | 0.07 | 2 | 4 | 5 | 1.3 |
| x_not_y_clip | 0.17 | 0.06 | 0.02 | 6 | 10 | 2 | 0.2 |
| the_part_where | 0.03 | 0.01 | 0.00 | 1 | 3 | 0 | 0.3 |
| every_single | 1.03 | 0.36 | 0.55 | 27 | 39 | 27 | 0.5 |
| feel_like | 0.33 | 0.12 | 0.12 | 11 | 16 | 8 | 0.4 |
| actually | 1.59 | 0.58 | 0.33 | 38 | 52 | 19 | 0.2 |
| whether_youre | 0.06 | 0.02 | 0.08 | 2 | 4 | 5 | 1.4 |
| worth_it | 0.06 | 0.02 | 0.03 | 2 | 4 | 2 | 0.7 |
| rule_of_three | 3.99 | 1.45 | 2.68 | 70 | 76 | 60 | 0.7 |
| elevate | 0.00 | 0.00 | 0.23 | 0 | 1 | 11 | 24.0 |
| heres_the_truth | 0.03 | 0.02 | 0.03 | 1 | 3 | 3 | 1.1 |
| hi_im_name | 0.00 | 0.00 | 0.01 | 0 | 1 | 1 | 2.4 |
| empower | 0.00 | 0.00 | 0.20 | 0 | 1 | 10 | 21.2 |
| caps_word | 18.55 | 8.50 | 11.83 | 68 | 87 | 70 | 0.6 |
| i_know_because | 0.00 | 0.01 | 0.00 | 0 | 1 | 0 | 1.2 |
| stress_free | 0.00 | 0.01 | 0.04 | 0 | 1 | 3 | 4.5 |
| lets_dive | 0.00 | 0.01 | 0.01 | 0 | 1 | 1 | 2.4 |
| honestly_opener | 0.00 | 0.01 | 0.01 | 0 | 1 | 1 | 1.9 |
| fast_forward | 0.00 | 0.01 | 0.00 | 0 | 1 | 0 | 1.4 |
| first_second_finally | 0.06 | 0.04 | 0.10 | 2 | 7 | 7 | 1.7 |
| anaphora_3plus | 1.39 | 0.83 | 0.70 | 43 | 58 | 34 | 0.5 |
| hedge_copy | 0.67 | 0.41 | 0.52 | 19 | 40 | 28 | 0.8 |
| wouldnt_it_be | 0.00 | 0.01 | 0.00 | 0 | 1 | 0 | 1.3 |
| think_of_it_as | 0.00 | 0.01 | 0.01 | 0 | 2 | 1 | 2.0 |
| i_get_it | 0.00 | 0.01 | 0.01 | 0 | 2 | 1 | 1.6 |
| colon_reveal | 0.06 | 0.05 | 0.03 | 2 | 8 | 2 | 0.6 |
| seamless | 0.00 | 0.01 | 0.01 | 0 | 1 | 1 | 2.1 |
| no_brainer | 0.00 | 0.01 | 0.02 | 0 | 2 | 1 | 3.2 |
| the_result_q | 0.00 | 0.01 | 0.01 | 0 | 2 | 1 | 2.0 |
| picture_this | 0.00 | 0.01 | 0.00 | 0 | 2 | 0 | 1.0 |
| effortless | 0.00 | 0.01 | 0.10 | 0 | 2 | 5 | 11.0 |
| the_problem_isnt | 0.11 | 0.15 | 0.10 | 4 | 21 | 8 | 0.9 |
| fragment_rows | 1.92 | 2.42 | 2.96 | 38 | 71 | 57 | 1.5 |
| you_deserve | 0.00 | 0.02 | 0.03 | 0 | 1 | 2 | 4.4 |
| and_more | 0.00 | 0.02 | 0.16 | 0 | 3 | 11 | 17.5 |
| rather_than | 0.03 | 0.05 | 0.11 | 1 | 8 | 6 | 3.1 |
| what_this_means | 0.06 | 0.09 | 0.05 | 2 | 13 | 4 | 0.8 |
| more_than_just | 0.00 | 0.02 | 0.04 | 0 | 3 | 3 | 5.4 |
| short_question_frag | 0.28 | 0.47 | 0.47 | 9 | 45 | 30 | 1.6 |
| most_of_the_time | 0.00 | 0.02 | 0.01 | 0 | 4 | 1 | 2.1 |
| unlock | 0.00 | 0.02 | 0.34 | 0 | 3 | 11 | 34.5 |
| its_time_to | 0.00 | 0.02 | 0.04 | 0 | 3 | 4 | 5.4 |
| lets_be_honest | 0.00 | 0.02 | 0.01 | 0 | 4 | 1 | 1.6 |
| em_dash | 0.70 | 1.57 | 2.92 | 11 | 50 | 50 | 4.1 |
| but_heres | 0.00 | 0.04 | 0.07 | 0 | 8 | 6 | 8.0 |
| the_truth_is | 0.00 | 0.05 | 0.04 | 0 | 6 | 3 | 4.8 |
| the_catch_q | 0.03 | 0.15 | 0.08 | 1 | 20 | 6 | 2.3 |
| not_just_but | 0.00 | 0.08 | 0.17 | 0 | 13 | 10 | 17.7 |
| transform | 0.00 | 0.09 | 1.26 | 0 | 3 | 18 | 127.0 |
| ai_vocab | 0.03 | 0.34 | 2.05 | 1 | 32 | 41 | 54.3 |
| ellipsis | 0.47 | 9.74 | 5.85 | 11 | 83 | 56 | 12.1 |
| exclaim | 0.25 | 6.10 | 1.70 | 5 | 82 | 40 | 6.5 |

## Appendix 3. Per-format rates for the Section 7 density tells (new human corpus, per 1,000 words, pooled) and per-document percentiles

| Tell | direct_mail_letter | email | optin | sales_page | social | upsell | all |
|---|---|---|---|---|---|---|---|
| rule_of_three | 1.51 (p50 0.0 / p90 3.2 / p95 5.0) | 1.61 (p50 0.9 / p90 4.0 / p95 5.8) | 3.59 (p50 3.1 / p90 10.9 / p95 15.1) | 3.58 (p50 3.4 / p90 6.7 / p95 7.7) | 1.57 (p50 0.0 / p90 4.2 / p95 6.4) | 1.68 (p50 2.2 / p90 3.3 / p95 3.4) | 2.68 (p50 1.5 / p90 6.4 / p95 9.2) |
| trailing_participle | 0.09 (p50 0.0 / p90 0.0 / p95 0.0) | 0.72 (p50 0.0 / p90 1.7 / p95 2.4) | 0.73 (p50 0.0 / p90 2.5 / p95 3.8) | 0.76 (p50 0.5 / p90 2.0 / p95 2.9) | 0.25 (p50 0.0 / p90 1.3 / p95 2.3) | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.68 (p50 0.0 / p90 1.8 / p95 2.7) |
| hedge_copy | 0.09 (p50 0.0 / p90 0.0 / p95 0.0) | 0.51 (p50 0.0 / p90 1.5 / p95 2.7) | 0.30 (p50 0.0 / p90 1.0 / p95 1.4) | 0.60 (p50 0.5 / p90 1.7 / p95 3.0) | 0.64 (p50 0.0 / p90 2.6 / p95 3.6) | 0.72 (p50 0.7 / p90 0.9 / p95 1.0) | 0.52 (p50 0.0 / p90 1.5 / p95 2.9) |
| actually_exactly_every_single | 0.19 (p50 0.0 / p90 0.0 / p95 0.2) | 1.07 (p50 0.0 / p90 3.3 / p95 5.1) | 0.99 (p50 0.0 / p90 4.7 / p95 7.3) | 1.14 (p50 1.2 / p90 2.2 / p95 2.4) | 1.26 (p50 0.0 / p90 3.9 / p95 6.0) | 0.84 (p50 0.7 / p90 1.1 / p95 1.2) | 1.08 (p50 0.0 / p90 3.2 / p95 5.3) |
| rather_than | 0.14 (p50 0.0 / p90 0.0 / p95 0.4) | 0.13 (p50 0.0 / p90 0.0 / p95 0.8) | 0.04 (p50 0.0 / p90 0.0 / p95 0.0) | 0.12 (p50 0.0 / p90 0.0 / p95 0.4) | 0.03 (p50 0.0 / p90 0.0 / p95 0.0) | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.11 (p50 0.0 / p90 0.0 / p95 0.4) |
| its_not_x_its_y | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.07 (p50 0.0 / p90 0.0 / p95 0.0) | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.04 (p50 0.0 / p90 0.0 / p95 0.1) | 0.03 (p50 0.0 / p90 0.0 / p95 0.0) | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.04 (p50 0.0 / p90 0.0 / p95 0.0) |
| not_just_but | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.10 (p50 0.0 / p90 0.0 / p95 0.4) | 0.15 (p50 0.0 / p90 0.0 / p95 0.8) | 0.26 (p50 0.0 / p90 0.8 / p95 1.3) | 0.07 (p50 0.0 / p90 0.0 / p95 0.0) | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.17 (p50 0.0 / p90 0.2 / p95 0.7) |
| em_dash | 2.84 (p50 0.0 / p90 8.3 / p95 13.2) | 4.77 (p50 2.1 / p90 11.9 / p95 16.8) | 3.59 (p50 0.8 / p90 11.1 / p95 16.5) | 1.35 (p50 0.2 / p90 3.9 / p95 8.4) | 1.97 (p50 0.0 / p90 7.0 / p95 10.3) | 0.72 (p50 0.3 / p90 9.5 / p95 11.4) | 2.92 (p50 0.0 / p90 10.2 / p95 14.6) |
| anaphora_3plus | 1.28 (p50 0.0 / p90 4.5 / p95 6.5) | 0.43 (p50 0.0 / p90 1.8 / p95 2.8) | 0.43 (p50 0.0 / p90 1.4 / p95 2.5) | 0.61 (p50 0.4 / p90 1.5 / p95 2.6) | 2.74 (p50 0.7 / p90 7.1 / p95 15.9) | 0.48 (p50 0.3 / p90 0.7 / p95 0.7) | 0.70 (p50 0.0 / p90 2.6 / p95 4.5) |
| bold_label_colon | 4.54 (p50 2.7 / p90 14.1 / p95 16.0) | 1.07 (p50 0.0 / p90 3.5 / p95 5.6) | 1.74 (p50 0.0 / p90 4.8 / p95 9.3) | 2.92 (p50 2.4 / p90 7.6 / p95 9.2) | 8.41 (p50 3.5 / p90 22.6 / p95 42.4) | 1.92 (p50 2.5 / p90 2.6 / p95 2.7) | 2.57 (p50 0.9 / p90 8.0 / p95 12.9) |
| designed_to | 0.33 (p50 0.0 / p90 0.8 / p95 2.7) | 0.14 (p50 0.0 / p90 0.0 / p95 0.9) | 0.37 (p50 0.0 / p90 1.3 / p95 2.5) | 0.43 (p50 0.3 / p90 1.5 / p95 2.1) | 0.10 (p50 0.0 / p90 0.0 / p95 0.0) | 0.12 (p50 0.0 / p90 0.4 / p95 0.4) | 0.29 (p50 0.0 / p90 0.8 / p95 1.5) |
| heres_what | 0.05 (p50 0.0 / p90 0.0 / p95 0.0) | 0.14 (p50 0.0 / p90 0.0 / p95 1.3) | 0.15 (p50 0.0 / p90 0.0 / p95 1.1) | 0.20 (p50 0.0 / p90 0.5 / p95 0.5) | 0.67 (p50 0.0 / p90 2.1 / p95 3.5) | 0.24 (p50 0.2 / p90 0.4 / p95 0.4) | 0.21 (p50 0.0 / p90 0.5 / p95 1.5) |
| thats_why | 0.00 (p50 0.0 / p90 0.0 / p95 0.0) | 0.22 (p50 0.0 / p90 0.8 / p95 1.4) | 0.05 (p50 0.0 / p90 0.0 / p95 0.0) | 0.14 (p50 0.0 / p90 0.5 / p95 0.7) | 0.09 (p50 0.0 / p90 0.0 / p95 0.0) | 0.24 (p50 0.0 / p90 0.5 / p95 0.6) | 0.15 (p50 0.0 / p90 0.0 / p95 0.9) |

## Appendix 4. Style metrics per format (new human corpus; mean, median, p10-p90)

| Metric | direct_mail_letter | email | optin | sales_page | social | upsell | all | AI (results.json) |
|---|---|---|---|---|---|---|---|---|
| sent_cv | 1.11 / 1.10 (0.84-1.36) | 0.65 / 0.63 (0.50-0.84) | 0.81 / 0.79 (0.66-0.98) | 0.93 / 0.93 (0.71-1.10) | 0.70 / 0.68 (0.50-0.92) | 0.92 / 0.89 (0.75-1.12) | 0.76 / 0.73 (0.53-1.03) | 0.83 |
| sent_mean | 7.27 / 6.73 (4.63-11.10) | 12.91 / 12.64 (9.13-16.88) | 11.51 / 11.23 (8.15-14.74) | 9.80 / 9.34 (7.37-12.52) | 8.88 / 8.35 (5.57-12.75) | 10.61 / 11.29 (6.97-13.71) | 11.14 / 10.75 (7.00-15.42) | 12.21 |
| frag_rate | 0.56 / 0.58 (0.32-0.73) | 0.18 / 0.16 (0.07-0.33) | 0.32 / 0.33 (0.19-0.45) | 0.40 / 0.40 (0.23-0.56) | 0.32 / 0.31 (0.12-0.51) | 0.39 / 0.38 (0.21-0.58) | 0.29 / 0.28 (0.10-0.50) | - |
| fk_grade | 6.28 / 6.14 (4.31-8.22) | 6.46 / 6.54 (3.93-8.82) | 8.05 / 8.00 (5.66-11.00) | 7.35 / 7.30 (5.74-8.53) | 5.25 / 4.88 (3.45-7.37) | 5.88 / 5.86 (5.32-6.45) | 6.75 / 6.73 (4.08-9.25) | - |
| exclaim_per1k | 1.69 / 0.00 (0.00-8.18) | 3.12 / 0.00 (0.00-9.32) | 1.25 / 0.00 (0.00-4.42) | 2.40 / 0.00 (0.00-6.90) | 3.19 / 0.00 (0.00-8.46) | 5.98 / 6.64 (1.90-9.54) | 2.53 / 0.00 (0.00-7.25) | 0.25 |
| ellipsis_per1k | 1.12 / 0.00 (0.00-4.36) | 9.79 / 6.71 (0.00-24.37) | 0.94 / 0.00 (0.00-2.89) | 2.84 / 1.98 (0.00-5.59) | 4.39 / 2.49 (0.00-12.21) | 4.17 / 0.49 (0.11-11.19) | 5.33 / 1.40 (0.00-17.20) | 0.47 |
| caps_per1k | 89.05 / 71.60 (27.03-149.47) | 6.03 / 3.00 (0.00-16.84) | 4.89 / 2.31 (0.00-12.68) | 12.96 / 4.08 (1.28-32.45) | 7.89 / 4.08 (0.00-24.14) | 16.22 / 14.85 (11.59-21.96) | 11.93 / 3.57 (0.00-27.09) | 18.55 |
| em_dash_per1k | 2.64 / 0.00 (0.00-8.25) | 4.61 / 2.13 (0.00-11.88) | 3.83 / 0.80 (0.00-11.06) | 1.33 / 0.18 (0.00-3.90) | 2.32 / 0.00 (0.00-7.01) | 3.45 / 0.25 (0.00-9.46) | 3.46 / 0.00 (0.00-10.19) | 0.70 |
| question_per1k | 0.96 / 0.00 (0.00-2.75) | 4.28 / 2.43 (0.00-10.87) | 3.75 / 2.66 (0.00-8.91) | 3.81 / 3.47 (1.00-6.64) | 4.32 / 2.46 (0.00-12.55) | 3.55 / 3.56 (1.59-5.50) | 3.90 / 2.67 (0.00-9.43) | - |

Share of 300+ word human documents with sentence-length CV under 0.70 (the Section 7 structural flag): direct_mail_letter 0.0%, email 77.56%, optin 18.05%, sales_page 9.09%, social 55.43%, upsell 0.0%.

## Appendix 5. Section 7 scoring applied to human copy (false-positive check)

Score = Tier 1 (weight 4), Tier 2 (weight 2, density thresholds as written), Tier 3 (weight 1), summed per 300 words; review flag at 6, hard fail at 10. Tier 0 counted separately. Implemented in the runner from the Section 7 table; argumentative and tonal tells are not machine-scored.

| Format | mean score | p50 | p90 | % review-flagged (>=6) | % hard-fail (>=10) | % any Tier 0 hit | Tier 0 hits by tell |
|---|---|---|---|---|---|---|---|
| direct_mail_letter | 1.70 | 0.00 | 6.07 | 11.5 | 0.0 | 63.5 | bold_label_colon 33 |
| email | 1.93 | 1.26 | 4.60 | 5.6 | 1.9 | 42.3 | bold_label_colon 151, bracket_placeholder 1, emoji_check 2 |
| optin | 3.58 | 2.44 | 8.62 | 15.5 | 8.2 | 0.0 | - |
| sales_page | 4.81 | 4.82 | 7.34 | 31.1 | 3.0 | 91.7 | bold_label_colon 121, emoji_check 6 |
| social | 3.54 | 2.50 | 7.73 | 20.7 | 6.9 | 0.0 | - |
| upsell | 1.11 | 1.30 | 1.68 | 0.0 | 0.0 | 0.0 | - |
| all | 2.97 | 1.90 | 6.79 | 14.3 | 4.2 | 34.0 | bold_label_colon 305, bracket_placeholder 1, emoji_check 8 |

