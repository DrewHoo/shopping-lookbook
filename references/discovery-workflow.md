# The discovery workflow (parallel fan-out for phase 2)

Discovery — building the candidate URL pool — parallelizes beautifully and is where most of the
wall-clock hides if you do it serially. A `Workflow` with a handful of specialist searchers plus a
synthesis pass turns ~15 minutes of sequential searching into one fan-out. This is the recommended
shape for phase 2 of the pipeline. **Sourcing/verification (phase 3) stays serial and yours** — a
single browser is a shared resource; parallel agents would collide in it.

## From one exemplar to a genre (induction ladder)

A brief often defines a bucket by a single exemplar — "hats like the Solvem Probler hat." Before
you can expand terms you have to induce what category that item *is*, and searching the
exemplar's surface features is the failure mode ("latin text hats" finds nothing the user wants).

**1. Decompose the mechanism, not the surface.** Ask: *what makes this item what it is, if you
strip away its specific content?* Solvem Probler = a joke (spoonerism/wordplay) presented
completely deadpan on an otherwise normal, well-made cap — fake authority played straight. The
Latin-ish words are surface; "deadpan joke played straight" is the mechanism. The mechanism is
the genre.

**2. Climb the abstraction ladder** and write down a rung-by-rung definition:
- **L0 — the item itself**: this product, this maker's other products.
- **L1 — same mechanism, new content**: other wordplay/mock-Latin hats.
- **L2 — sibling mechanisms, same effect**: fictional companies (Weyland-Yutani, Aperture),
  fake institutions, defunct absurd teams (Sioux City Ghosts), anti-slogans ("SPORTS").
- **L3 — the umbrella vibe**: irreverent/deadpan novelty. Terms up here get noisy — everything
  from L3 must pass the substitution test below.

**The payoff concentrates at L2.** L0/L1 mostly re-find what the user already showed you; L3 is
where "Mississippi" lives. The genuinely new veins come from sibling mechanisms — in one run,
both headline finds (minor-league absurdist teams on true fitteds; a sized fictional-company
cap) were L2 rungs. Spend your search budget there.

**The regulation-gear reframe (when a hard spec fights the vibe).** If the brief's hard rule
(a size, a material, a certification) keeps failing against the vibe's usual products, ask:
*where is this vibe worn professionally or officially?* Regulation gear meets specs by
definition — novelty products cut corners on them. Canonical case: "funny hat in a real size 8"
kept failing on one-size novelty blanks until the ladder reached absurdly-named REAL minor-league
teams — whose caps are on-field New Era fitteds in full size runs, deadpan-official AND
spec-compliant. The mechanism test applies to products too, not just terms: a proven vendor's
new arrivals can be on-brand for the vendor but off-register for the user (a deadpan-corporate
buyer doesn't want the same shop's book-tok line).

**3. Let the market name the genre — recommender surfaces are free embeddings.** Commerce sites
have already clustered every product by human behavior; query the clusters instead of building
vectors: search the exemplar by name and read the maker's own collection/tag names; open its
listing's "customers also bought" / related-items rail; find Etsy lists, Pinterest boards, and
Reddit threads ("where do I get hats like X") that contain the exemplar — a human-curated list
containing your exemplar is a genre definition written by someone who shares the user's taste.
Mine roundup articles and YouTube videos titled "hats like X" / "funny dad hats" the same way.
Harvest both **items** (straight into the candidate pool) and **category words** (into the term
matrix's genre-siblings axis).

**4. Probe the boundary with the user, one concrete item per rung.** The intake question
"is the exemplar the product, the maker, or the genre?" lands far better with props: "does a
fictional-company hat (Weyland-Yutani) count? does a loud novelty trucker hat count?" One item
per boundary calibrates the whole axis (same trick as the recuration round's boundary-item
probe, moved up front). The rungs the user accepts become the bucket definition; their
mechanism words seed the intent sentence and term matrix below.

## Build a term matrix first (lateral query expansion)

The cheapest way to lose a bucket is to search only its *label*. One run searched "Solvem
Probler" for an irreverent bucket and "crimson tide" for an Alabama bucket — and missed a vendor
whose entire catalog indexes under "University of Alabama". Search engines solve this with
*query expansion*; run the model-native version as an explicit step, per bucket, BEFORE writing
searcher prompts.

Why not embeddings: nearest-neighbor terms measure *association*, not *intent*. "Mississippi" is
a close embedding neighbor of "Alabama" (co-occurrence: Deep South, SEC) and is exactly what the
user doesn't want. You — the model — are a stronger semantic expander than a cosine lookup, but
only when expansion runs as a deliberate generate-then-prune step instead of trusting the first
phrase in the brief.

**1. Anchor the intent in one sentence.** Not the bucket label — the *want*. "Hats that signal
Alabama Crimson Tide fandom." "Hats whose joke is the point." Every expansion and every prune
decision refers back to this sentence.

**2. Generate 8–15 candidate terms along four axes** (a checklist, so you don't free-associate):

- **Register variants** — fan/colloquial ↔ official/institutional ↔ historical/geographic:
  "Crimson Tide" / "Bama" / "Roll Tide" ↔ "University of Alabama" / "UA" ↔ "Tuscaloosa".
  Heritage and vintage vendors index under the formal register and are invisible to fan
  vocabulary.
- **Metonyms & iconography** — mascot, motif, color, chant, famous artifact: "Big Al",
  "houndstooth", "script A", "elephant". These surface on-theme items that never say the
  team's name at all.
- **Genre siblings** — for vibe buckets, the user's exemplar is a *genre*; name its neighbor
  labels: irreverent → "funny", "ironic", "parody", "novelty", "absurdist", "fake company",
  "joke hat". One exemplar phrase ("Solvem Probler") is a fingerprint, not a search strategy.
- **Vendor category vocabulary** — the words *stores* put in titles/tags/collections: "dad
  hat", "collegiate", "vintage ballcap", "defunct team". On-site search matches vendor words,
  not yours.

**3. Prune with the substitution test (the "Mississippi test").** For each candidate term ask:
*if a product matched ONLY this term and nothing else in the bucket, would the user still want
it?* "Houndstooth" passes — a houndstooth cap with no Alabama text is still on-intent.
"Mississippi" fails. "SEC" fails (surfaces Auburn). "College football" fails. Drop every term
that fails, no matter how *related* it feels — this gate is what turns recall expansion into
precision-safe expansion.

**4. Feed vendor vocabulary back after first contact.** When a search hits, read the winning
products' own titles/tags/collection handles (free in Shopify `products.json`) and add new terms
to the matrix — this catches registers you couldn't have guessed ("Question Marks" as a team
name). Remember a vendor's own search API often can't find its inventory (Ebbets returns zero
results for "alabama"); the term matrix crossed with a full catalog sweep is what actually
covers a source.

The output is a small **bucket × terms matrix**. Paste each bucket's term list into its
searcher's prompt with the instruction "run every term, not just the bucket name" — and keep
the matrix around: the recuration round extends it rather than starting over.

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

- **Hand each searcher its bucket's term list from the matrix** (see above), with an explicit
  "search every term, not just the bucket name." A searcher given only a bucket label reverts to
  searching the label.
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
