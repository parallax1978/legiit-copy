#!/usr/bin/env python3
"""Bottom-up n-gram discovery: which 1-4 grams are over-represented in AI drafts vs human DR controls.
Reuses extraction from analyze.py. Ranks by smoothed doc-frequency ratio with a minimum AI doc count."""
import os, re, sys, math
from collections import Counter, defaultdict
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location("an", os.path.join(os.path.dirname(__file__), "analyze_lib.py"))

AI_DIR, HUMAN_ROOT = sys.argv[1], sys.argv[2]
exec(open(os.path.join(os.path.dirname(__file__), 'analyze.py')).read().split('# ---------- lexicon ----------')[0].replace("AI_DIR, HUMAN_ROOT, OUT = sys.argv[1], sys.argv[2], sys.argv[3]", ""))

def toks(t):
    t = t.lower().replace('’', "'")
    return re.findall(r"[a-z][a-z']+", t)

def grams(tk, n):
    return set(' '.join(tk[i:i+n]) for i in range(len(tk)-n+1))

ai_docs, hu_docs = [], []
for f in sorted(os.listdir(AI_DIR)):
    if f.endswith('.txt'): ai_docs.append(toks(extract_ai(os.path.join(AI_DIR, f))))
for src in sorted(os.listdir(HUMAN_ROOT)):
    d = os.path.join(HUMAN_ROOT, src)
    if not os.path.isdir(d): continue
    for f in sorted(os.listdir(d)):
        t = extract_human(os.path.join(d, f), src)
        if len(t.split()) >= 150: hu_docs.append(toks(t))

NA, NH = len(ai_docs), len(hu_docs)
print(f"AI docs {NA}, human docs {NH}")
for n in (1, 2, 3, 4):
    ca, ch = Counter(), Counter()
    for d in ai_docs: ca.update(grams(d, n))
    for d in hu_docs: ch.update(grams(d, n))
    rows = []
    for g, a in ca.items():
        if a < 8: continue
        if n == 1 and (len(g) < 4 or g in "that this with your from have will what when they them than then there these those their been more just like into about which could would should make made".split()): continue
        h = ch.get(g, 0)
        ratio = ((a+0.5)/NA) / ((h+0.5)/NH)
        rows.append((ratio, a, h, g))
    rows.sort(reverse=True)
    print(f"\n=== {n}-grams over-represented in AI (min 6 AI docs); ratio = AI docfreq / human docfreq")
    for ratio, a, h, g in rows[:40]:
        print(f"{ratio:7.1f}  AI {a:3d}/{NA}  HU {h:3d}/{NH}  {g}")
    # also under-represented: present in many human docs, rare in AI
    rows2 = []
    for g, h in ch.items():
        if h < 0.25*NH: continue
        a = ca.get(g, 0)
        ratio = ((a+0.5)/NA) / ((h+0.5)/NH)
        rows2.append((ratio, a, h, g))
    rows2.sort()
    print(f"\n--- {n}-grams common in HUMAN DR (>=25% docs) but rare in AI")
    for ratio, a, h, g in rows2[:25]:
        print(f"{ratio:7.2f}  AI {a:3d}/{NA}  HU {h:3d}/{NH}  {g}")
