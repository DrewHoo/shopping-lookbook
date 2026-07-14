# The discovery workflow (parallel fan-out for phase 2)

Discovery — building the candidate URL pool — parallelizes beautifully and is where most of the
wall-clock hides if you do it serially. A `Workflow` with a handful of specialist searchers plus a
synthesis pass turns ~15 minutes of sequential searching into one fan-out. This is the recommended
shape for phase 2 of the pipeline. **Sourcing/verification (phase 3) stays serial and yours** — a
single browser is a shared resource; parallel agents would collide in it.

## Shape

```
phase 'Discover'  →  parallel([ one searcher per bucket, + a spec/sizing-authority agent,
                                 + a YouTube/roundup-mining agent ])
phase 'Synthesize' → one agent: dedupe vs an EXISTING list, rank by a confidence dimension, flag gaps
```

Each searcher uses **WebSearch + WebFetch only** (no browser — they gather URLs and facts; you
verify in the browser after). Give every searcher a shared **hard-rules block** verbatim, its own
bucket focus, and a **structured schema** so results come back as validated objects you can merge
without parsing.

## What made the prompts good (steal these)

- **One shared `COMMON` constraints block, pasted into every searcher.** The buyer's hard rules
  (size, material, brand exclusions, price ceiling, style) stated once, identically, so no searcher
  drifts. Restate the *why* ("one-size has never fit this buyer") — it changes what they rank.
- **Force structured output.** A JSON schema with fields like `{bucket, title, brand, url, source,
  price, sizing_type, size_range, style, color, why, fit_notes, concerns}`. Make the constraint a
  *field*: e.g. `sizing_type: TRUE-FITTED | BRAND-SIZED | STRETCH-FIT | ONE-SIZE` forces each agent
  to classify against the rule instead of hand-waving.
- **Tell them WebFetch 403s product pages.** So they harvest URLs from search results, roundup
  articles, and **YouTube video descriptions** (creator-vetted, jump to the real product page) rather
  than trying to read the storefront. Description/article text is enough — no browser needed.
- **One dedicated "authority" agent for the spec that gates everything.** A sizing/spec agent whose
  only job is to nail the exact requirement from authoritative sources (size charts, dimension specs)
  and return a *reach matrix* ("brand X tops at 62cm; brand Y reaches 64cm"). Its facts let the
  synthesis rank honestly and stop you assuming a spec.
- **Name specific brands/sources to investigate.** "Check Adidas sizing specifically; the buyer would
  accept it if sized right" beats "find outdoor caps." Steer, don't wander.

## The synthesis pass

- **Pass it an `EXISTING` list** of what's already on the page (or already found), so it returns only
  *new* candidates and dedupes against both that and itself.
- **Rank by the confidence dimension**, not vibes: e.g. TRUE-FITTED that clearly covers the spec
  first, STRETCH/adjacent next, ONE-SIZE last. Ask for ~4–6 per bucket (verify-able in one browser pass).
- **Ask for honest gaps in `notes`:** which buckets are thin and why, which candidates most need live
  verification (stock + exact spec), and any reframe/"outside-the-box" idea. This is where the
  "sized-novelty barely exists → custom-embroidery-on-a-blank is the real answer" kind of insight surfaces.

## Trust-but-verify the fan-out

Sub-agents research from the open web and **can be wrong on the exact spec** — one run concluded a
brand was "out" from a general size chart, while a 30-second look at the brand's own site showed a
*fitted* line that reached the size. **Your first-hand browser reads override the workflow's
web-sourced claims.** Treat the pool as leads to verify, not verdicts.

## Skeleton

```js
export const meta = { name:'lookbook-discovery', description:'...', phases:[{title:'Discover'},{title:'Synthesize'}] };
const SCHEMA = { type:'object', additionalProperties:false, required:['candidates','facts','notes'], properties:{
  candidates:{ type:'array', items:{ type:'object', additionalProperties:false,
    required:['bucket','title','brand','url','source','why','concerns'],
    properties:{ /* + the constraint-as-a-field, e.g. sizing_type, plus fit_notes/size_range */ } } },
  facts:{ type:'array', items:{ type:'object', required:['claim','source'], properties:{ claim:{type:'string'}, source:{type:'string'} } } },
  notes:{ type:'string' } } };

phase('Discover');
const COMMON = `THE BUYER + HARD RULES (verbatim, pasted into every searcher): ...`;
const TASKS = [ /* {label, prompt} per bucket, + a spec-authority agent, + a youtube-mining agent */ ];
const results = (await parallel(TASKS.map(t => () => agent(t.prompt, {label:t.label, phase:'Discover', schema:SCHEMA})))).filter(Boolean);

phase('Synthesize');
const EXISTING = `ALREADY ON THE PAGE (find NEW ones): ...`;
const synth = await agent(`Curate NEW additions. ${EXISTING} Dedupe, rank by <confidence dimension>, ~4-6/bucket, flag gaps.
RAW:${JSON.stringify(results.flatMap(r=>r.candidates)).slice(0,90000)} FACTS:${JSON.stringify(results.flatMap(r=>r.facts)).slice(0,12000)}`, {schema:SCHEMA});
return { synth };
```

Then take `synth.candidates` into the browser and run the phase-3 verify pass (Shopify fast-path from
`storefront-gotchas.md`) on each.

## Lighter variant: plain Agent fan-out

For a mid-session expansion (1–3 new angles, not a full re-discovery), skip the Workflow and launch
2–3 `general-purpose` agents in parallel with the same prompt discipline — shared constraints block,
named sources, honest-fit fields — and "your final message should be ONLY the JSON" + a fixed field
list in place of a schema. Same quality, less ceremony, and you keep sourcing in the browser while
they run. The verify rule is identical: their output is leads, not verdicts — every candidate still
gets the live browser pass before it earns a card (this catches sold-out variants and vendor size
charts that contradict the agent's read).
