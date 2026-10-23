#!/usr/bin/env python3
"""Generate a plain-brief AI draft corpus with the claude CLI (haiku/sonnet/opus rotation).
No style steering in the briefs: this is what a marketer gets when they type the obvious request."""
import os, subprocess, sys, json, concurrent.futures as cf

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)

OFFERS = [
 ("meal-prep delivery service for busy parents, $89/week", "a free 'Dinner Decided' weekly meal planner PDF", "a $19/month add-on of kid-friendly snack boxes"),
 ("an online course that teaches freelance copywriting, $497", "a free swipe file of 12 proven sales emails", "a $297 'done-for-you client acquisition' templates pack"),
 ("CRM software for real estate agents, $49/month", "a free 'open house follow-up' email sequence", "a $29/month automated texting add-on"),
 ("a probiotic supplement for bloating, $39 per bottle", "a free 5-day gut-reset meal guide", "a 3-bottle bundle at 20% off"),
 ("a local HVAC company's $89 fall furnace tune-up", "a free 'winter energy bill checklist'", "a $199/year priority maintenance plan"),
 ("AI bookkeeping software for Shopify store owners, $99/month", "a free 'Shopify tax deductions' cheat sheet", "a $49 one-time 'books cleanup' service"),
 ("a golf swing training aid, $149", "a free 10-minute slice-fix video", "a $79 putting mat"),
 ("calming chews for anxious dogs, $29", "a free 'thunderstorm survival' guide for dog owners", "a subscribe-and-save 3-month supply"),
 ("a free live webinar on starting an Amazon FBA business", "the webinar registration itself", "a $997 FBA launch course offered at the end"),
 ("a coaching program that helps dentists add $20,000/month in high-ticket cases, by application", "a free case study PDF", "a $5,000 'implant marketing' intensive"),
 ("a retinol serum for women over 40, $68", "a free 'skin after 40' routine guide", "a $45 companion eye cream at 30% off"),
 ("a productivity app for adults with ADHD, $12/month", "a free 'ADHD-friendly weekly planner' template", "an annual plan at 2 months free"),
 ("a membership delivering weekly stock trading alerts, $97/month", "a free 'top 3 setups this week' report", "an upgrade to the $297/month options room"),
 ("an ebook on keto for people over 50, $27", "a free 7-day keto starter grocery list", "a $47 video cookbook"),
 ("an SEO agency for law firms, free strategy call", "a free 'law firm SEO audit' checklist", "a $1,500 Google Business Profile optimization"),
 ("a free lead magnet: 7 email subject line templates", "the templates themselves", "a $37 mini-course on email open rates"),
 ("an electric standing desk, $399", "a free 'desk ergonomics' guide", "a $129 monitor arm bundle"),
 ("a summer coding camp for kids ages 9-14, $899", "a free 'is my kid ready to code' quiz", "a $199 take-home robotics kit"),
 ("a mortgage refinance broker offering a free rate quote", "a free 'refinance break-even calculator'", "a $0 'rate-watch' alert service"),
 ("a wedding photography package, $3,500", "a free 'wedding day timeline' template", "a $900 engagement session add-on"),
]

FORMATS = {
 "sales_page_lead": "Write the headline and the first 300 words (the lead) of a sales page for {offer}.",
 "email": "Write a promotional email to my email list selling {offer}. Include a subject line.",
 "meta_ad": "Write a Facebook/Instagram ad for {offer}.",
 "optin": "Write an opt-in page for {magnet}: headline, subheadline, 3 to 5 bullets, and button text.",
 "upsell": "Write a one-time-offer upsell page shown right after someone buys {offer}. The upsell is {upsell}.",
 "vsl_opener": "Write the first two minutes of a video sales letter script for {offer}.",
}
MODELS = ["haiku", "sonnet", "opus"]

jobs = []
for i, (offer, magnet, upsell) in enumerate(OFFERS):
    model = MODELS[i % 3]
    for fmt, tpl in FORMATS.items():
        prompt = tpl.format(offer=offer, magnet=magnet, upsell=upsell)
        jobs.append((f"{model}_{fmt}_{i:02d}", model, prompt))

def run(job):
    name, model, prompt = job
    path = os.path.join(OUT, name + ".txt")
    if os.path.exists(path) and os.path.getsize(path) > 200:
        return name, "skip"
    try:
        r = subprocess.run(["claude", "-p", prompt, "--model", model, "--output-format", "text"],
                           capture_output=True, text=True, timeout=300)
        txt = r.stdout.strip()
        if len(txt) < 100:
            return name, "short:" + (r.stderr[:200] if r.stderr else txt[:100])
        with open(path, "w") as f:
            f.write("PROMPT: " + prompt + "\n\n" + txt)
        return name, "ok"
    except Exception as e:
        return name, "err:" + str(e)[:200]

with cf.ThreadPoolExecutor(max_workers=6) as ex:
    for name, status in ex.map(run, jobs):
        print(name, status, flush=True)
