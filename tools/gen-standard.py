#!/usr/bin/env python3
"""Regenerate supabase/functions/_shared/engine/prompts/standard.ts from docs/04-copy-standard.md."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
md = (root / 'docs/04-copy-standard.md').read_text()
parts = re.split(r'^## (\d+)\. (.+)$', md, flags=re.M)
names = {'1':'RULES','2':'ARGUMENT_SELECTION','3':'LEAD_SELECTION','4':'PROOF_PLACEMENT','5':'OFFER_PRESENTATION','6':'COPY_CHIEF_RUBRIC','7':'AI_TELL_CHECKLIST','8':'CLAIMS_AND_FACTUAL_REVIEW','9':'FORMAT_SPECS','10':'VOICE_CAPTURE'}
out = ['/** AUTO-GENERATED from docs/04-copy-standard.md by tools/gen-standard.py. Do not edit by hand; edit the doc and regenerate. */', '']
keys = {}
for i in range(1, len(parts), 3):
    num, title, body = parts[i], parts[i+1].strip(), parts[i+2].strip()
    name = names.get(num, 'SECTION_' + num)
    body = body.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    out.append(f'export const {name} = `## {num}. {title}\n\n{body}`;\n')
    keys[name] = title
out.append('export const STANDARD = { ' + ', '.join(keys) + ' } as const;')
out.append('export const STANDARD_TITLES: Record<string, string> = ' + json.dumps(keys, indent=2) + ';')
(root / 'supabase/functions/_shared/engine/prompts/standard.ts').write_text('\n'.join(out) + '\n')
print('wrote standard.ts with', len(keys), 'sections')
