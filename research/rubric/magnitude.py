import re, sys, collections
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from voc import AG1, FOOL, CLICKUP
URG = re.compile(r"\b(now|finally|every (single )?day|everyday|daily|can'?t|cannot|need|lost|wasted|miss(ed|ing)?|urgent|immediately|crash|before|deadline|struggl|sick|pain|ache|nightmare|disrupt|bombed|never recovered|shocked|impossible|without crashing|go without|scattered|locked out|stopped working)\b", re.I)
STAY = re.compile(r"\b(years?|months?|since \d{4}|still|again|always|for a while|long time|routine|every morning|every day|constantly|ongoing|used to|past \d+|\d+ years?)\b", re.I)
def band(x, cuts):  # returns 0-3 given thresholds
    return sum(x >= c for c in cuts)
def analyse(name, rows, exclude=("svc","billing","support")):
    n = len(rows)
    print(f"\n=== {name}: n={n} verbatims ===")
    clusters = collections.defaultdict(list)
    for r in rows: clusters[r[3]].append(r)
    print(f"{'desire':12}{'k':>4}{'prev%':>7}{'urg%':>6}{'stay%':>7}{'yrs':>4} | U S P  mag")
    out = {}
    for d, rs in sorted(clusters.items(), key=lambda kv: -len(kv[1])):
        k = len(rs); prev = 100*k/n
        urg = 100*sum(bool(URG.search(r[2])) for r in rs)/k
        stay = 100*sum(bool(STAY.search(r[2])) for r in rs)/k
        yrs = len({r[1][:4] for r in rs})
        U = band(urg,(10,25,50)); S = max(band(stay,(10,30,50)), band(yrs,(2,3,4))); P = band(prev,(5,15,30))
        flag = "" if d not in exclude else "  (service complaint, not a buying desire)"
        print(f"{d:12}{k:4}{prev:7.0f}{urg:6.0f}{stay:7.0f}{yrs:4} | {U} {S} {P}  {U+S+P}{flag}")
        out[d]=(U,S,P)
    return out
for nm, rows in (("AG1 (Trustpilot)",AG1),("Motley Fool (Trustpilot)",FOOL),("ClickUp (Trustpilot)",CLICKUP)):
    analyse(nm, rows)
