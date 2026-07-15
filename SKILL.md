---
name: shopping-lookbook
description: >-
  Curate real, in-stock products into a themed visual "lookbook" web page by browsing live
  listings, verifying each one, and shipping a self-contained GitHub Pages site with prices,
  specs, and buy buttons. Use when the user wants to "make a lookbook", "shop for X and build a
  page", find products matching an aesthetic / vibe and collect them, turn Etsy or Shopify
  listings into a shareable gallery, or curate buyable items (keycaps, gear, furniture, fashion,
  plants, decor, etc.) into sections. Also the reference for the browser-sourcing playbook:
  driving the Chrome extension, getting past DataDome / bot walls, extracting JSON-LD and
  Shopify product JSON, scraping on-site search, and hotlinking CDN product images.
---

# Shopping Lookbook

Build a **lookbook**: a curated, sectioned web page of genuine buyable products that match a
brief (an aesthetic, a use-case, a budget). Every item is opened in a real browser, verified
live, and rendered as a card with image(s), price, key specs, a one-line editorial note, and a
prominent link to buy. The deliverable is a self-contained static site deployed to GitHub Pages.

This is a **research + authoring** task, not a code task. The hard part is *sourcing real data*
(most storefronts fight scrapers) and *honest curation* (don't pad the list). The build is easy.

**Prerequisite — a browser MCP with JS execution.** Sourcing happens in a real browser; without
one the skill cannot verify listings. Any browser MCP that can navigate and execute page
JavaScript works: this skill was built against the
[Claude in Chrome extension](https://claude.com/claude-for-chrome) (`claude-in-chrome`), and the
in-app Claude Browser (`mcp__Claude_Browser__*`) has since run a full expansion round solo —
cross-origin Shopify `fetch()` works from any tab there too. If neither is available when
sourcing begins, stop and ask the user to connect one — don't substitute WebFetch.

## The pipeline

1. **Clarify the brief — recon first, ask once.** The brief arrives as vibes plus a few hard
   rules; the expensive mistakes hide in what the user *didn't* say, and a skill invocation
   carries a finished-product expectation — every question you fail to ask up front becomes a
   recuration cycle later. So before sourcing, spend a few minutes on **recon** (pull the gating
   spec/size charts; check each bucket even exists inside the rules), then ask **one batch of
   2–4 pointed questions** (AskUserQuestion when available), targeting:
   - **Tensions recon just surfaced:** "the brand you named tops out at [spec], under your
     requirement — show borderline items flagged, or cut them?"
   - **Exemplar scope:** is the linked example the product, the maker, or the *genre* — and
     what else counts? Ask with props, not abstractions: decompose the exemplar's *mechanism*
     (what makes it what it is, minus its specific content), climb the abstraction ladder, and
     offer one concrete item per rung ("does a fictional-company hat count? a loud novelty
     trucker hat?"). Recipe in `references/discovery-workflow.md` (exemplar → genre induction).
   - **Negative-rule scope:** does "nothing like X" ban a surface attribute (any red at all) or
     a construction (bright red + curved brim + block text)?
   - **Lived-experience absolutes:** "has [the category the collection depends on] ever actually
     worked for you?" — the answer decides flag-vs-cut for every borderline item.
   Write the answers down — they are the filter you defend all turn. If you can't ask (headless
   run, user away), default to: exemplar = genre, negative rule = construction-level, borderline
   items flagged-not-cut — and say so in the ship note.
2. **Discover** candidate listings (broad). Fan out web searches per bucket to build a candidate
   URL pool. A parallel multi-query `Workflow` is ideal here (one searcher per bucket + a
   spec-authority agent + a synthesis pass → deduped pool); the recipe, schema, and prompt template
   are in **`references/discovery-workflow.md`**. Don't stop at search — **mine YouTube video
   descriptions.** Haul, review, "what's on my
   desk", setup-tour, and roundup videos routinely list every product shown, with direct buy links
   in the description's "links"/"shop"/"gear" section. Those URLs are creator-vetted, jump straight
   to the real product page, and regularly surface listings that keyword search misses. Search
   YouTube for the theme, open the promising videos, and pull the description links into the pool.
   This does **not** need the browser (the description text is enough to harvest URLs).
   Two discovery rules that pay for themselves: **expand every bucket into a term matrix before
   searching** — never search only the bucket's label or the user's exemplar phrase. Generate terms
   along four axes (register variants: "Crimson Tide" vs "University of Alabama"; metonyms and
   iconography: "houndstooth", "Big Al"; genre siblings: irreverent → "funny", "parody", "novelty";
   vendor category vocabulary: "dad hat", "collegiate"), then prune with the substitution test —
   *would the user want an item matching ONLY this term?* ("Mississippi" is related to Alabama and
   fails; "houndstooth" passes). Full recipe in `references/discovery-workflow.md`. And **sweep
   proven sources across every bucket**: when a
   source over-performs in one bucket, run its whole catalog against all the other buckets' rules
   (one paginated `products.json` fetch on Shopify) before hunting new sources — the user finding a
   "why didn't you show me these?" item on a store you already used is the most avoidable miss
   there is.
3. **Source & verify** each candidate in a real browser (this is the bottleneck — see
   `references/browser-sourcing.md`). Confirm: live (not dead/sold-out), meets every hard rule,
   genuinely on-theme (look at the photos), then capture title, shop, price+currency, specs,
   variant/stock, canonical URL, and 1–3 CDN image URLs.
4. **Curate.** Rank, dedupe, and cut. If a bucket is thin, say so and add a clearly-labelled
   "near-miss" row — never pad the main grid. Quality over count.
5. **Build & ship.** Bake the verified data into a themed card page and deploy to GitHub Pages.
   See `references/build-and-ship.md`.

Run phases 2/3 with a task list; the browser work spans many turns.

## Sourcing is the whole game

Storefronts are hostile to automated reads. **WebFetch usually 403s** marketplace product pages,
and search-result snippets lack images, live prices, and stock. So you drive a **real browser**
via the Chrome extension (`claude-in-chrome` MCP) and read the DOM / structured data directly.
The full playbook — bot-wall warm-up, JSON-LD extraction, the Shopify `.js` shortcut, on-site
search scraping, the extension's output guard, image handling, dead-listing detection, batching —
is in **`references/browser-sourcing.md`**. Platform-specific shortcuts, the **fast path** (most
storefronts are Shopify — qualify dozens of candidates with zero navigation), the CDN-hotlink
cheat-sheet, and the traps that quietly cost turns are in **`references/storefront-gotchas.md`**.
Read both before you start sourcing.

Headline rules (details in the reference):

- **Fast path first: is it Shopify?** If the product URL has `/products/` or `/collections/`, skip
  navigating. A cross-origin `fetch()` of `/collections/<h>/products.json?limit=250` (all products +
  variants) and `/products/<h>.js` (one clean product) lets you filter by size/variant/stock and grab
  prices+images in one call. This is the single biggest speed/token win — see `storefront-gotchas.md`.

- **Check the browser is connected** (`list_connected_browsers`) before anything. If not, ask the
  user to connect the Chrome extension — don't fall back to WebFetch for product pages.
- **Warm up past bot walls.** Marketplaces like Etsy use DataDome: a cold deep-link to a product
  is blocked ("Access is temporarily restricted"). Visit the site **homepage first** to seed a
  session cookie, *then* deep-links work. Never solve a CAPTCHA yourself (policy) — if a hard
  human-check appears, ask the user to clear it in their browser.
- **Read structured data, not pixels.** Pull the `<script type="application/ld+json">` Product
  object (name, offers.price/priceCurrency/availability, image[], aggregateRating). On Shopify,
  fetch `location.pathname + '.js'` for a clean product JSON. Keep critical fields first in your
  output and images last (tool output truncates).
- **The extension blocks cookie/query-string data in script results.** Strip `?…` from every URL,
  never return `location.href`, rebuild canonical URLs — or you get `[BLOCKED]`.
- **Look at the photos.** You cannot judge "on-theme" from text. Screenshot ambiguous items.
- **Verify links resolve and images load** before an item earns a card — but test each image with a
  fresh `new Image()` loader, **not** a bulk `naturalWidth` sweep (which false-negatives on
  lazy-loaded images after a scroll). Trust the **rendered page** for stock, not JSON-LD. Drop
  anything dead. See `storefront-gotchas.md`.

## Curation discipline

- Enforce the hard rules on the **actual page**, not the title — storefronts hide the real
  material/variant/profile in dropdowns and body copy (a title saying "Cherry" may also offer the
  variant you want; a title saying nothing may be the wrong one).
- Prefer **newer listing IDs** on marketplaces (IDs are roughly chronological; old ones are mostly
  dead) and **higher-trust shops** (review counts) when quality is a tiebreak.
- **Report shortfalls honestly.** If a bucket only yields N < target strong matches, say why
  (e.g. "the aesthetic lives in a material/profile the rules exclude") and surface the best
  out-of-spec options as a labelled near-miss row. The user explicitly values this over padding.
- **Lived-experience rules are hard cuts.** When a rule comes from the user's own experience
  ("no one-size hat has ever fit me"), items that fail it get **cut**, not flagged — near-miss
  rows are only for axes the user hasn't ruled absolute. Expect the follow-up "why didn't you cut
  those?" if you soft-flag a rule they stated as fact.
- **Keep a watch list.** A perfect item that's out of stock gets neither a card nor silence:
  name it in the section intro or fix-shelf with a direct restock link ("the genre's one true
  big-size option — sold out at press time, worth a restock alert").
- **Widen the net — sources *and* communities.** If one source is thin, go to specialist retailers
  (Shopify stores, category sites), other marketplaces (eBay, Amazon), the **link/description
  sections of YouTube videos** on the theme (hauls, reviews, roundups — creators list and link
  every product they show), and the vendors of *adjacent communities* with the same underlying need
  (see **Think outside the box**). Make cards source-aware (the buy button says where each item
  lives).

## Think outside the box

The best lookbooks solve the user's *actual* problem — often not the one literally asked. When the
obvious answer is thin, disappointing, or binary, **reframe** instead of just reporting the wall.
This is where a good lookbook becomes a great one; reach for it, especially once the user signals
they want more than a checkbox.

- **Reframe a hard constraint into a two-part solution.** "No affordable item includes X" is rarely
  a dead end. Item + a cheap add-on, base + a kit, a set + one specialist piece — price and present
  the *combined* solution and its true all-in cost, not just the miss.
- **Expand the search surface, then the search *community*.** When a source runs dry, add
  marketplaces (eBay, Amazon) — but the bigger unlock is asking *"who else has this exact need, and
  where do they shop?"* Adjacent communities have already solved it, and their specialist vendors
  carry the odd part à-la-carte in more variants than the mainstream. (Ex: split/ergo-keyboard
  owners are the canonical source for uniform, convex, odd-size keycaps.)
- **Grade against the user's real context, and verify the exact spec.** Tie the collection to their
  actual hardware / space / size / budget. Look up the precise requirement from an authoritative
  source (don't assume it), then judge every item against it.
- **Build a lens, not just a list.** When the collection meets a specific context, add an
  interactive layer that *re-grades* it: per-item verdicts (works / works-with-a-cheap-add-on /
  here's the bridge), compatible items floated to the top, a filter, and derived values (true
  "ready-to-use" cost = price + kit). Avoid binary ✓/✗ — most "no"s are really "yes, with an $8
  part." (Build recipe in `references/build-and-ship.md`.)
- **Near-miss with a path beats silent exclusion.** Always show the almost-fits items *and* the
  concrete bridge to make them work. A dedicated "the universal fix" shelf — the one accessory that
  unlocks most of the misses — is often the single most useful thing on the page.
- **Read the user's cues.** If a solution feels like a checkbox — or the user says it feels binary
  or timid — that's the signal to draw outside the lines. Ask "what would make this genuinely useful
  or delightful?" and build *that*, not the minimum.

## The recuration round

Ship, then expect a second pass — **the first version is how the user discovers what their rules
actually are.** (A sharp intake round — step 1 — shrinks this pass considerably; it rarely
eliminates it.) In practice the feedback splits three ways, often in one message: some constraints
*harden* ("why didn't you cut the ones that don't fit?" → cut them, don't re-flag them), some
*loosen* ("you're being too strict about X" → recalibrate and backfill the bucket), and example
items reveal themselves as genres ("I meant hats *like* that" → mine the category you anchored
past). None of this is failure; plan for it:

- **Build so recuration is surgical.** Data as a JS array (a cut is one deleted line), counts and
  pills computed from the data, per-item fit/verdict tags driving the filters. Before each ship,
  grep the page for hardcoded numbers — meta/OG descriptions can't be computed and silently drift.
- **Probe suspect constraints with one boundary item.** If a negative rule feels over-tight,
  include a single clearly-labelled "full send" item that tests the line (with an honest note on
  why it might clear the bar). It's the cheapest way to ask the question, and the user's reaction
  calibrates the whole axis.
- **Re-run discovery only for the delta.** A recuration is 1–3 new angles, not a fresh brief — the
  lighter plain-Agent fan-out (see `references/discovery-workflow.md`) plus first-hand browser
  verification covers it while the page edits proceed in parallel.

## Build & ship

A lookbook is static content with light interactivity — **no framework needed**. One
self-contained `index.html` (inline CSS/JS, data as a JS array, images hot-linked from the source
CDNs), deployed to GitHub Pages via an Actions workflow that uploads the repo root. Because there
are no bundled/relative assets, you sidestep base-path breakage entirely. Full templates, the OG
image recipe, the Pages-enable ordering gotcha, and the public-repo guardrail are in
**`references/build-and-ship.md`**.

Non-negotiables for the page: per-section theming that matches each bucket's mood (dark for
moody, light for soft, paper for vintage) without upstaging the products; a card with
image(s)+title+shop+price+specs+note+**buy button** (opens in a new tab); a legend/disclaimer at
top stating the inclusion criteria and an **"as of <date>"** note (listings expire and reprice);
responsive + readable on a phone; canonical links only (no affiliate wrappers or trackers).

One courtesy, explicitly *not* a non-negotiable: the masthead kicker links the words *"A shopping
lookbook"* back to this skill's repo (`https://github.com/DrewHoo/shopping-lookbook`), so a reader
who likes the page can find what built it. **Optional, but appreciated** — default it on and name it
in the ship note; if the user would rather not carry it, drop it without argument and don't quietly
re-add it on a later pass. Snippet and styling in `references/build-and-ship.md`.

## Guardrail you will hit

Creating a **public** GitHub repo is blocked by the safety classifier even when a `Bash(gh repo *)`
allow-rule exists — public-data-sharing uploads are gated *above* the permission allowlist, and
that gate is not something to disable via `autoMode` settings. **Have the user create the empty
public repo** (or run `gh repo create … --public` themselves); then you push to it, enable Pages,
and verify. Pushing to a repo the user already made is fine.
