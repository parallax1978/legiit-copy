#!/usr/bin/env python3
"""Measure tell frequencies in an AI draft corpus vs a human DR control corpus.
Usage: analyze.py <ai_dir> <human_root> <out_json>
Outputs per-corpus rates per 1,000 words, % of docs containing, and AI/human ratios."""
import os, re, sys, json, math, html, statistics as st
from collections import defaultdict

AI_DIR, HUMAN_ROOT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

# ---------- text extraction ----------
def strip_html(h):
    h = re.sub(r'(?is)<(script|style|noscript|nav|header|footer|form|aside).*?</\1>', ' ', h)
    h = re.sub(r'(?i)<br\s*/?>', '\n', h)
    h = re.sub(r'(?i)</(p|div|li|h[1-6]|tr|blockquote)>', '\n\n', h)
    h = re.sub(r'<[^>]+>', ' ', h)
    h = html.unescape(h)
    h = re.sub(r'[ \t\r\f\v]+', ' ', h)
    h = re.sub(r'\n\s*\n+', '\n\n', h)
    return h.strip()

def extract_human(path, src):
    h = open(path, encoding='utf-8', errors='ignore').read()
    if src in ('settle', 'carlton', 'belgray'):
        m = re.search(r'(?is)<div[^>]+class="[^"]*(entry-content|post-content|post_content|article-content|single-content|the-content|td-post-content|post-entry)[^"]*"[^>]*>(.*)', h)
        if m:
            h = m.group(2)
            cut = re.search(r'(?is)(<div[^>]+class="[^"]*(comments|entry-footer|post-footer|sharedaddy|related|post-navigation|nav-links|postLinkBlogPage|widget|sidebar)|<footer|id="comments")', h)
            if cut: h = h[:cut.start()]
        else:
            m = re.search(r'(?is)<article[^>]*>(.*?)</article>', h)
            if m: h = m.group(1)
            else:
                i = h.find('entry-title')
                if i > 0:
                    h = h[i:]
                    cut = re.search(r'(?is)(id="comments"|class="comments|<footer|class="post_nav|class="prev_next|widget_thrive|class="textwidget|class="widget|sidebar)', h)
                    if cut: h = h[:cut.start()]
    t = strip_html(h)
    if src == 'halbert':
        # drop boilerplate nav lines (short lines of nav words)
        lines = [l for l in t.split('\n') if not re.match(r'^\s*(Home|Archives|Newsletter|Contact|Order|Subscribe|Back to|Copyright|All Rights)', l) and 'newsletter archive' not in l.lower() and 'announcement list' not in l.lower() and 'The Gary Halbert Letter' not in l]
        t = '\n'.join(lines)
    return t

RESIDUE_RE = re.compile(r'(?im)^(?:-{3,}\s*\n)?\s*(?:\*\*|#+\s*)?(?:Notes?|A few notes|Quick notes|Before you (?:send|publish|run|launch)|Notes before you|Production notes|Implementation notes|Compliance notes?|Things to (?:swap|replace|customize)|What to customize|Next steps|Optional|Want me to|If you (?:share|tell me|want|send))\b.*')
def extract_ai(path, keep_residue=False):
    t = open(path, encoding='utf-8', errors='ignore').read()
    t = re.sub(r'^PROMPT:.*?\n\n', '', t, count=1, flags=re.S)
    if not keep_residue:
        m = RESIDUE_RE.search(t)
        if m and m.start() > len(t)*0.4:
            t = t[:m.start()]
    return t

# ---------- lexicon ----------
# name -> regex (case-insensitive unless noted). Keep patterns literal enough to audit.
LEX = {
 # pivots / product entries
 "thats_where_comes_in": r"\b(that'?s|that’s|this is|which is) where [^.?!\n]{1,50}\bcomes? in\b",
 "enter_product": r"(?:^|\n|[.!?] )Enter [A-Z][^.?!\n]{0,40}[.:—–-]",
 "introducing": r"(?:^|\n|[.!?] )(?:Introducing|Meet) [A-Z][^.?!\n]{0,40}",
 "thats_why_we": r"\b(that'?s|that’s) why (we|I) (created|built|made|designed|developed|put together)\b",
 # empathy beats
 "sound_familiar": r"\bsound familiar\?",
 "i_get_it": r"\bI get it\b[.,]?",
 "ive_been_there": r"\b(I'?ve|I’ve|we'?ve|we’ve) (all )?been there\b",
 "youre_not_alone": r"\byou'?re not alone\b|\byou’re not alone\b",
 "we_get_it": r"\bwe get it\b",
 "if_that_sounds_like_you": r"\bif (that|this) sounds (like you|familiar)\b|\bsound like you\?",
 "tired_of": r"(?:^|\n|[.!?] )(?:Tired of|Sick of|Struggling (?:with|to)|Frustrated (?:by|with)|Overwhelmed by)\b",
 # staging openers
 "picture_this": r"\bpicture this\b",
 "imagine": r"(?:^|\n|[.!?] )Imagine\b",
 "what_if": r"(?:^|\n|[.!?] )What if\b",
 "heres_the_thing": r"\bhere'?s the thing\b|\bhere’s the thing\b",
 "heres_the_kicker": r"\bhere'?s the kicker\b|\bhere’s the kicker\b",
 "heres_what_i_mean": r"\bhere'?s what I mean\b|\bhere’s what I mean\b",
 "heres_the_truth": r"\bhere'?s the (truth|deal|catch|reality|problem|good news)\b|\bhere’s the (truth|deal|catch|reality|problem|good news)\b",
 "the_truth_is": r"\b(the )?truth is[,:]|\bthe reality is[,:]|\bthe bottom line[,:]?\b|\bat the end of the day\b",
 "lets_be_honest": r"\blet'?s (be honest|face it|be real)\b|\blet’s (be honest|face it|be real)\b",
 "think_of_it_as": r"\bthink of it (as|like)\b",
 "fast_forward": r"\bfast[- ]forward\b",
 "spoiler": r"\bspoiler( alert)?\b",
 "lets_dive": r"\blet'?s dive\b|\blet’s dive\b|\bdive in\b",
 "stick_with_me": r"\b(stick with me|stay with me|stick around|keep (watching|reading))\b",
 # fragment questions / answers
 "the_result_q": r"\bthe result\?",
 "the_best_part_q": r"\bthe best part\?|\bbest part\?",
 "the_catch_q": r"\bthe catch\?|\bwhy\?(\s|$)|\bthe problem\?|\bthe difference\?|\bthe cost\?|\bthe secret\?",
 "short_question_frag": r"(?:^|\n|[.!?] )[A-Z][a-z']+(?: [a-z']+){0,3}\?",   # <=4-word question
 # inflation / marketing words
 "game_changer": r"\bgame[- ]chang(er|ing)\b",
 "no_brainer": r"\bno[- ]brainer\b",
 "without_the_fluff": r"\b(without|no|zero|minus) (the )?fluff\b|\bno[- ]fluff\b",
 "no_gimmicks": r"\bno (gimmicks|hype|BS|b\.s\.|catch)\b|\bno hidden fees\b",
 "effortless": r"\beffortless(ly)?\b",
 "seamless": r"\bseamless(ly)?\b",
 "unlock": r"\bunlock(s|ed|ing)?\b",
 "elevate": r"\belevat(e|es|ed|ing)\b",
 "transform": r"\btransform(s|ed|ing|ation)?\b",
 "empower": r"\bempower(s|ed|ing|ment)?\b",
 "reclaim": r"\breclaim(s|ed|ing)?\b",
 "peace_of_mind": r"\bpeace of mind\b",
 "next_level": r"\bnext level\b",
 "designed_to": r"\b(designed|built|crafted|engineered|tailored|curated) (to|for|specifically)\b",
 "say_goodbye": r"\bsay (goodbye|hello) to\b",
 "you_deserve": r"\byou deserve\b",
 "its_time_to": r"\bit'?s time to\b|\bit’s time to\b",
 "ready_to_q": r"(?:^|\n|[.!?] )Ready to\b",
 "join_thousands": r"\bjoin (the )?(thousands|hundreds|\d[\d,]+\+?) (of )?\b|\btrusted by\b",
 "fast_paced": r"\bfast[- ]paced\b",
 "whether_youre": r"\bwhether you'?re\b|\bwhether you’re\b",
 "dont_miss_out": r"\bdon'?t miss (out|this)\b|\bdon’t miss (out|this)\b",
 "more_than_just": r"\bmore than just\b|\bisn'?t just\b|\bisn’t just\b",
 "real_people_real": r"\breal (people|results|stories)\b",
 "stress_free": r"\b(stress|hassle|worry|guilt)[- ]free\b",
 "deserve_better": r"\bdeserve better\b",
 # structure / signposting
 "so_opener": r"(?:^|\n)So,? ",
 "plus_opener": r"(?:^|\n)Plus,",
 "honestly_opener": r"(?:^|\n|[.!?] )(Honestly|Truthfully|Frankly)[,?]",
 "first_second_finally": r"(?:^|\n|[.!?] )(First|Second|Third|Finally|Lastly),",
 "in_this_video": r"\bin (this|the next) (video|few minutes|\d+ minutes)\b",
 "im_going_to_show": r"\bI'?m (going to|about to) (show|share|reveal|walk you through)\b|\bI’m (going to|about to) (show|share|reveal|walk)\b",
 "hi_im_name": r"(?:^|\n|[.!?] )(Hi|Hey|Hello),? I'?m [A-Z]|(?:^|\n|[.!?] )My name is [A-Z]",
 "ps": r"(?:^|\n)(?:\*\*)?P\.?S\.?(?:\*\*)?[:.\s]",
 "heres_what": r"\bhere'?s (what|how|exactly what|what you|what happens|what you get|what'?s included)\b|\bhere’s (what|how|exactly)\b",
 "thats_why": r"\bthat'?s why\b|\bthat’s why\b|\bwhich is why\b",
 "actually": r"\bactually\b",
 "real_noun": r"\breal (food|results|people|life|money|clients|customers|families|parents|dogs|users|students|data|numbers|answers|help|value|difference|change|progress|meals|cases|examples|work|skills|strategies|homes|homeowners|agents|dentists|golfers|traders)\b",
 "stop_verbing": r"(?:^|\n|[.!?] )Stop [a-z]+ing\b",
 "most_people": r"(?:^|\n|[.!?] )Most (people|[a-z]+s) (don'?t|never|struggle|think|assume|spend|waste|fail|try|believe)\b",
 "exactly": r"\bexactly\b",
 "no_more": r"\bno more\b",
 "every_single": r"\bevery (single|time|day|week|morning|night)\b",
 "feel_like": r"\bfeels? like\b",
 "worth_it": r"\bworth (it|every)\b",
 "youre_not": r"\byou'?re not (alone|lazy|broken|bad|failing|the problem|crazy|imagining)\b|\byou’re not (alone|lazy|broken|bad|failing)\b",
 "the_problem_isnt": r"\bthe (problem|issue|answer|difference|secret|truth|reason|goal|point) (isn'?t|isn’t|is|was)\b",
 "what_this_means": r"\bwhat (this|that) means\b|\bwhich means\b|\btranslation:",
 "one_thing": r"\b(one|the only) thing\b",
 "nothing_to_lose": r"\bnothing to lose\b|\bzero risk\b",
 "wouldnt_it_be": r"\bwouldn'?t it be\b|\bwouldn’t it be\b",
 "thats_it": r"(?:^|\n|[.!?] )That'?s (it|all|the whole thing|the offer|the deal)\.|That’s (it|all)\.",
 "but_heres": r"\bbut here'?s\b|\bbut here’s\b|\band here'?s\b|\band here’s\b",
 "the_part_where": r"\bthe part (where|that|nobody|no one)\b",
 "you_already": r"\byou already (know|have|do|did|own)\b",
 "most_of_the_time": r"\bmost of the time\b|\bmore often than not\b",
 "i_know_because": r"\bI know[,.]? because\b|\bI know this because\b|\bI know how that feels\b",
 "not_because_a_because_b": r"\b(don'?t|don’t|doesn'?t|doesn’t|didn'?t|didn’t|isn'?t|isn’t|aren'?t|aren’t|never|not) [^.?!\n]{1,60}? because [^.?!\n]{1,60}\. (They|It|You|We|He|She) [^.?!\n]{1,40} because\b",
 "quick_question": r"(?:^|\n|[.!?] )(Quick|Honest|Simple|Real) (question|answer|truth|talk)[:?]",
 "nobody_tells_you": r"\b(nobody|no one|most people|most [a-z]+s) (tells? you|talks? about|mentions?|wants? to admit|will tell you|won'?t tell you|don'?t know|never tell you)\b",
 "less_than_a_cup": r"\bless than (a|one|the cost of|the price of) (cup|coffee|latte|lunch|dinner|pizza|tank|netflix|month|day|single)\b",
 "wait_opener": r"(?:^|\n)(?:#+\s*|\*\*)?(Wait|Hold on|Before you go|One more thing|One last (thing|step))[!.:,]",
 "with_without_contrast": r"\*\*(With|Without|Before|After|Old way|New way|Most [a-z]+|Them|Us)[^*\n]{0,30}:\*\*",
 "self_posed_q_header": r"(?:^|\n)#+\s*[^\n]{3,80}\?\s*(?:\n|$)|(?:^|\n)\*\*[^*\n]{3,80}\?\*\*",
 "bold_leadin_sentence": r"(?:^|\n)\s*[-*•✔✅]?\s*\*\*[A-Z][^*\n]{3,60}[.!]\*\*\s+[A-Z]",
 "triple_no": r"\bno [a-z -]{2,25}, no [a-z -]{2,25},? (and |or )?(no [a-z -]{2,25}|cancel anytime)\b",
 "cancel_anytime": r"\bcancel anytime\b|\bno (long-term )?contracts?\b|\bno setup fees?\b",
 "they_x_they_y_they_z": r"(?:^|\n|[.!?] )They [^.?!\n]{2,40}\. They [^.?!\n]{2,40}\. They [^.?!\n]{2,40}\.",
 "hedge_copy": r"\b(can help|may help|designed to support|helps? support|supports? (a |your )?(healthy|normal)|many (people|customers|users|parents|owners|agents) (say|report|find|notice)|results (may )?vary|individual results|typically|often)\b",
 "bracket_placeholder": r"\[(Product|Company|Your|Course|Brand|Name|First|NUMBER|X|\$X|STRAIN|Insert|Link|Date|Price)[^\]]{0,30}\]",
 "scroll_down": r"\bscroll down\b|\bkeep scrolling\b|\bsee (exactly )?what'?s inside\b|\bclick (the )?(button )?below\b|\btap (the )?(button )?below\b",
 "youve_tried": r"\byou'?ve (probably |already )?tried\b|\byou’ve (probably |already )?tried\b",
 "the_old_way": r"\bthe (old|hard|usual|traditional|normal) way\b",
 "colon_reveal": r"\b(the answer|the reason|the result|the difference|the secret|the catch|the truth|the problem|the good news|the bad news|the short version|the fix|the bottom line)[:?]",
 "dear_friend": r"(?:^|\n)Dear (Friend|Reader|[A-Z][a-z]+),",
 "hey_there": r"(?:^|\n)(Hey|Hi) (there|friend|\[?first ?name\]?|\{\{?first ?name)",
 # negative parallelism family
 "not_just_but": r"\bnot (just|only|merely|simply|about)\b[^.?!\n]{1,70}?\b(but|it'?s|it’s|—|–)\b",
 "its_not_x_its_y": r"\b(it'?s|it’s|this is|that'?s|that’s|this isn'?t|this isn’t|it isn'?t|it isn’t) not (just |only |about )?[^.?!\n]{1,60}[.;—–-]\s*(It'?s|It’s|This is|That'?s|That’s)\b",
 "no_no_just": r"\bNo [^.?!\n]{1,30}\.\s*No [^.?!\n]{1,30}\.(\s*No [^.?!\n]{1,30}\.)?\s*(Just|Only)\b",
 "x_not_y_clip": r"\b[A-Z][^.?!\n]{1,50}\. Not [^.?!\n]{1,40}\.",
 "rather_than": r"\brather than\b",
 # closers
 "let_that_sink": r"\blet that sink in\b",
 "thats_the_real": r"\bthat'?s the (real|whole|entire) (point|win|difference|secret)\b|\bthat’s the (real|whole|entire)",
 "and_more": r"\.\.\.\s*and (so much )?more\b|\band (so much )?more[!.]",
 # AI vocab (wiki/kobak era words) - figurative
 "ai_vocab": r"\b(delve|delves|delving|tapestry|testament|underscore[sd]?|underscoring|showcas(e|es|ing)|pivotal|crucial|intricate|meticulous(ly)?|landscape|foster(s|ing)?|enhance[sd]?|enhancing|leverage[sd]?|leveraging|elevat(e|es|ing)|robust|seamless(ly)?|streamline[sd]?|holistic|empower(s|ed|ing)?|unlock(s|ed|ing)?|journey|realm|navigate|navigating|harness|embark|cutting[- ]edge|state[- ]of[- ]the[- ]art|game[- ]changer|revolutioniz(e|ing)|transformative|innovative|comprehensive|in today'?s|in today’s|ever[- ]evolving|vibrant|bustling)\b",
 # formatting / emoji
 "emoji_check": r"[✅✔️☑️🚀✨💡🔥👉⚡🎯💪🙌❌⏰📈💰🎉👇⭐🧠]",
 "bold_label_colon": r"\*\*[^*\n]{1,45}:\*\*|\*\*[^*\n]{1,45}\*\*\s*:|(?:^|\n)[A-Z][A-Za-z' ]{2,40}:\s",
 "md_heading": r"(?:^|\n)#{1,4} ",
 "bullet_md": r"(?:^|\n)\s*[-*•] ",
 "em_dash": r"—|(?<=\S) -- (?=\S)|(?<=\S) – (?=\S)",
 "exclaim": r"!",
 "ellipsis": r"\.\.\.|…",
 "caps_word": r"\b[A-Z]{3,}\b",
 "guarantee": r"\bguarantee[sd]?\b|\bmoney[- ]back\b|\brisk[- ]free\b",
}
STOP_ING = set("thing during morning evening something nothing anything everything bring king ring sing wing spring string ceiling feeling building meeting wedding marketing advertising writing nothing shopping training".split())

def sentences(t):
    t2 = re.sub(r'\s*\n\s*\n\s*', ' \n\n ', t)
    parts = re.split(r'(?<=[.!?])\s+|\n\n', t2)
    return [p.strip() for p in parts if len(p.strip().split()) >= 1]

def constructions(t, words):
    c = {}
    # trailing participial clause: ", Xing ..." near sentence end
    n = 0
    for m in re.finditer(r',\s+([a-z]{5,}ing)\b[^.?!\n]{0,80}[.?!]', t):
        w = m.group(1)
        if w not in STOP_ING: n += 1
    c['trailing_participle'] = n
    # rule of three: "a, b, and c" or "a, b and c" (short items)
    c['rule_of_three'] = len(re.findall(r'(?<![,\w])[^,.;:\n()]{2,28}, [^,.;:\n()]{2,28},? and [^,.;:\n()]{2,28}[.?!\n]', t))
    # fragment rows: 3+ consecutive sentences/lines of <=4 words
    sents = sentences(t)
    runs = 0; run = 0
    for s in sents:
        if 1 <= len(s.split()) <= 4 and not s.endswith(':'):
            run += 1
            if run == 3: runs += 1
        else: run = 0
    c['fragment_rows'] = runs
    # repeated sentence openers (same first word 3+ in a row)
    rep = 0; prev = None; k = 0
    for s in sents:
        fw = s.split()[0].lower().strip('"“*')
        if fw == prev: k += 1
        else: k = 1; prev = fw
        if k == 3: rep += 1
    c['anaphora_3plus'] = rep
    return c

def cadence(t):
    sents = [s for s in sentences(t) if len(s.split()) >= 1]
    lens = [len(s.split()) for s in sents]
    paras = [p for p in re.split(r'\n\s*\n', t) if p.strip()]
    plen = [len(p.split()) for p in paras]
    d = {}
    if len(lens) >= 3:
        d['sent_mean'] = st.mean(lens); d['sent_sd'] = st.pstdev(lens); d['sent_cv'] = d['sent_sd']/d['sent_mean']
        d['pct_sent_le5'] = sum(1 for l in lens if l <= 5)/len(lens)
        d['pct_sent_ge25'] = sum(1 for l in lens if l >= 25)/len(lens)
    if len(plen) >= 3:
        d['para_mean'] = st.mean(plen); d['para_cv'] = st.pstdev(plen)/st.mean(plen)
        d['pct_para_1sent'] = sum(1 for p in paras if len(sentences(p)) == 1)/len(paras)
    return d

def analyze(t):
    words = len(re.findall(r"[A-Za-z0-9'’]+", t))
    hits = {k: len(re.findall(v, t, flags=re.I if not k in ('enter_product','introducing','caps_word','hi_im_name','x_not_y_clip','no_no_just','bold_label_colon','ps','dear_friend','short_question_frag','ready_to_q','tired_of','first_second_finally','honestly_opener','so_opener','plus_opener') else 0)) for k, v in LEX.items()}
    hits.update(constructions(t, words))
    return words, hits, cadence(t)

# ---------- load corpora ----------
docs = []  # (group, subgroup, name, words, hits, cad)
RES_N = 0
for f in sorted(os.listdir(AI_DIR)):
    if not f.endswith('.txt'): continue
    raw = extract_ai(os.path.join(AI_DIR, f), keep_residue=True)
    if RESIDUE_RE.search(raw) or re.search(r'placeholder|swap in|let me know|want me to|if you (share|tell me|send)', raw, re.I): RES_N += 1
    model, rest = f.split('_', 1)
    fmt = re.sub(r'_\d+\.txt$', '', rest)
    t = extract_ai(os.path.join(AI_DIR, f))
    w, h, c = analyze(t)
    docs.append(('ai', fmt, f, w, h, c, model))
for src in sorted(os.listdir(HUMAN_ROOT)):
    d = os.path.join(HUMAN_ROOT, src)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        t = extract_human(os.path.join(d, f), src)
        if len(t.split()) < 150: continue
        w, h, c = analyze(t)
        docs.append(('human', src, f, w, h, c, src))

def agg(sel):
    W = sum(d[3] for d in sel); n = len(sel)
    out = {'docs': n, 'words': W, 'rate': {}, 'docpct': {}, 'cad': {}}
    keys = set().union(*[d[4].keys() for d in sel])
    for k in keys:
        tot = sum(d[4].get(k, 0) for d in sel)
        out['rate'][k] = 1000.0*tot/W if W else 0
        out['docpct'][k] = 100.0*sum(1 for d in sel if d[4].get(k, 0) > 0)/n if n else 0
    ckeys = set().union(*[d[5].keys() for d in sel])
    for k in ckeys:
        vals = [d[5][k] for d in sel if k in d[5]]
        out['cad'][k] = st.mean(vals) if vals else None
    return out

res = {'ai_all': agg([d for d in docs if d[0]=='ai']), 'human_all': agg([d for d in docs if d[0]=='human'])}
for fmt in sorted(set(d[1] for d in docs if d[0]=='ai')):
    res['ai_'+fmt] = agg([d for d in docs if d[0]=='ai' and d[1]==fmt])
for m in ('haiku','sonnet','opus'):
    res['ai_model_'+m] = agg([d for d in docs if d[0]=='ai' and d[6]==m])
for src in sorted(set(d[1] for d in docs if d[0]=='human')):
    res['human_'+src] = agg([d for d in docs if d[0]=='human' and d[1]==src])

# ratios with smoothing (add 0.5 hits to each side)
A, H = res['ai_all'], res['human_all']
ratios = {}
for k in A['rate']:
    a = (A['rate'][k]*A['words']/1000 + 0.5)/(A['words']/1000)
    h = (H['rate'][k]*H['words']/1000 + 0.5)/(H['words']/1000)
    ratios[k] = a/h
res['ratio_ai_over_human'] = ratios
json.dump(res, open(OUT, 'w'), indent=1)

# ---------- print report ----------
print(f"AI docs={A['docs']} words={A['words']} | HUMAN docs={H['docs']} words={H['words']} | AI docs with assistant residue: {RES_N}")
for src in sorted(set(d[1] for d in docs if d[0]=='human')):
    r = res['human_'+src]; print(f"  human/{src}: docs={r['docs']} words={r['words']}")
print("\n%-26s %9s %9s %8s %8s %8s" % ("tell", "AI/1kw", "HUM/1kw", "ratio", "AI%docs", "HUM%docs"))
for k, r in sorted(ratios.items(), key=lambda x: -x[1]):
    print("%-26s %9.2f %9.2f %8.1f %8.0f %8.0f" % (k, A['rate'][k], H['rate'][k], r, A['docpct'][k], H['docpct'][k]))
print("\nCADENCE (means):")
for k in sorted(A['cad']):
    print("  %-16s AI=%.2f  HUMAN=%.2f" % (k, A['cad'][k] or 0, H['cad'].get(k) or 0))
print("\nPER-FORMAT AI rates per 1k words (top tells):")
fmts = [k for k in res if k.startswith('ai_') and not k.startswith('ai_model') and k != 'ai_all']
top = [k for k, _ in sorted(ratios.items(), key=lambda x: -x[1])[:30]]
print("%-26s" % "tell" + "".join("%12s" % f[3:][:11] for f in fmts))
for k in top:
    print("%-26s" % k + "".join("%12.2f" % res[f]['rate'][k] for f in fmts))
print("\nPER-MODEL (rate/1k): tell haiku sonnet opus")
for k in top[:20]:
    print("%-26s" % k + "".join("%9.2f" % res['ai_model_'+m]['rate'][k] for m in ('haiku','sonnet','opus')))
print("\nPER-SOURCE HUMAN (rate/1k):", [s for s in sorted(set(d[1] for d in docs if d[0]=='human'))])
for k in top[:30]:
    print("%-26s" % k + "".join("%9.2f" % res['human_'+s]['rate'][k] for s in sorted(set(d[1] for d in docs if d[0]=='human'))))
