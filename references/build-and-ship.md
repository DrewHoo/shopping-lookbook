# Build & ship the lookbook

The page is the easy part. Keep it a **single self-contained `index.html`** — inline CSS/JS, data
as a JS array, images hot-linked from source CDNs. No framework, no bundler, no build step. That
also means no relative asset paths, so GitHub Pages base-path breakage can't happen.

## Page skeleton

```html
<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>…</title><meta name="description" content="…">
  <link rel="icon" href="data:image/svg+xml,%3Csvg…%3E">   <!-- inline emoji/SVG favicon, no file -->
  <!-- OG/Twitter tags → og.png (see below) -->
  <!-- personal-site chrome (optional): back-bar + comments -->
  <script src="https://drewhoover.com/embed/back-bar.js" async></script>
  <script src="https://drewhoover.com/embed/giscus.js" async></script>
  <style> /* per-section theming lives here */ </style>
</head><body>
  <header class="masthead">…title, one-line sub, count pills, jump nav…</header>
  <div class="legend">…inclusion criteria + "prices as of <DATE>; listings expire" disclaimer…</div>
  <section id="bucketA">…intro paragraph…<div class="grid" data-bucket="A"></div>
     <div class="nearmiss" data-nearmiss="A">…labelled out-of-spec row…</div></section>
  <!-- repeat per bucket, each with its own mood theme -->
  <footer>…shops worth watching + non-commercial disclaimer + date…</footer>
  <div id="comments"></div>
  <div class="lb" id="lb"><span class="x">&times;</span><img id="lbimg"></div>
  <script>
    const SETS = [ /* {bucket,title,shop,price,profile/specs,note,imgs:[…],  and for non-primary
                       sources: via:"KeyCapUS", url:"…", shopUrl:"…"} */ ];
    const NEARMISS = [ /* {bucket,title,why,url,img} */ ];
    // render: build cards into each .grid; source-aware CTA:
    //   const via = s.via || '<PrimarySource>';  const url = s.url || buildUrl(s.id);
    //   ctaLabel = via==='<PrimarySource>' ? 'View on <PrimarySource>' : 'View at '+via;
    // thumbnails swap the main img; clicking main opens the lightbox (#lb).
    // count pills + per-section counts are computed from SETS so they never drift.
    // hide any filter chip whose tier count is 0 (a recuration can empty a tier).
    // NOT computable: meta/OG description counts — grep the <head> for stale numbers each ship.
  </script>
</body></html>
```

Card contents (non-negotiable): image(s) with thumbnail strip + click-to-zoom lightbox, title,
shop (linked), price+currency, a few spec chips, a 1–2 sentence editorial **why-it-fits** note,
and a prominent **buy button** (`target="_blank" rel="noopener"`, canonical URL, no trackers).
Store `imgs` as the highest-res CDN URL and down-swap for display (`il_fullxfull`→`il_794xN`);
keep the full-res one for the lightbox.

**Theming:** give each bucket a mood that matches its content — dark/neon for moody, light for
soft/pastel, off-white/paper for vintage — via a per-section CSS scope (`#bucketA .card{…}`). The
products are the star; don't let chrome upstage them. Responsive grid
(`repeat(auto-fill,minmax(300px,1fr))`), single column on phones, no horizontal scroll.

## Optional: a compatibility "lens" (turn the gallery into a tool)

When the collection is being shopped against a specific context the user cares about — a particular
device, room size, dietary rule, budget — add a data-driven **lens**. It's the highest-leverage
upgrade you can make and it keeps the honest "near-miss with a path" curation, just interactive.

Tag each item in the data with its verdict (e.g. `fit: "native" | "with-kit" | "no"`, plus a short
`fitNote`), then layer on:

- **A control panel** — an on/off toggle + filter chips ("All / Ready / Needs an add-on"), plus a
  one-line explainer and (nice touch) a tiny SVG diagram of the requirement. Wire the toggle/filters
  to **`<body>` classes** and drive everything from CSS — no re-render needed.
- **Per-card grading** — a corner ribbon + a one-line verdict, colour-coded by state. Compute a
  **derived value** in the card (e.g. `price + kit ≈ $X ready-to-use`) so the true cost is visible.
- **Sort compatible items to the top** of each section (stable sort by a `rank` map), and show live
  counts (`N ready · M need a kit`) computed from the data.
- **A "universal fix" shelf** — a small section listing the one accessory (or few) that unlocks the
  "with-kit" items, with match guidance ("light kit for pastel sets, black for dark ones").

Implementation is a few CSS rules keyed off `body.lens` / `body.lens-ready` + a `data-fit` attribute
per card, plus a render tweak and counts from the array. Default the lens **on** when you built the
page *for* this user's context; keep the toggle so a general visitor can switch it off. Local images
(host under `img/` and commit) are fine to mix with hot-linked CDN ones when a source (Amazon/eBay)
won't reliably hot-link.

## OG share image (sharp, generated locally)

Generate a 1200×630 `og.png` once with a local `sharp` script and **commit the PNG** — this keeps
CI a dependency-free static upload (no `sharp`/`lightningcss` Linux-binary headaches). Compose an
SVG (gradient title + a few representative swatches/thumbnails per bucket) and rasterize:

```js
import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">…</svg>`;
await sharp(Buffer.from(svg)).png().toFile(process.argv[2] || 'og.png');
```

Run it from a scratch dir (`npm i sharp`) writing into the repo; verify by opening the PNG.

## Deploy to GitHub Pages (static, Actions)

`.github/workflows/deploy.yml` — upload the repo root, no build:

```yaml
name: Deploy to GitHub Pages
on: { push: { branches: ['main'] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: 'pages', cancel-in-progress: false }
jobs:
  deploy:
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: '.' }
      - id: deployment
        uses: actions/deploy-pages@v4
```

### The ordering gotcha (will bite you once)

The **first push fires the workflow before Pages is enabled**, so `configure-pages` fails with
*"Get Pages site failed … Not Found."* Enable Pages right after the first push, then rerun:

```bash
gh api -X POST repos/<OWNER>/<REPO>/pages -f build_type=workflow   # PUT if it already exists
gh run rerun <failed-run-id>        # or just push again
```

Then verify for real:

```bash
curl -s -o /dev/null -w '%{http_code}' https://<owner-site>/<repo>/     # expect 200
curl -s https://<owner-site>/<repo>/ | grep -c '<a distinctive live string>'   # confirm latest content, not a stale cache
curl -s -o /dev/null -w '%{http_code}' https://<owner-site>/<repo>/og.png       # 200
```

For sibling sites under `drewhoover.com`: any public repo under the `DrewHoo` user auto-serves at
`drewhoover.com/<repo>/` — no per-project DNS. Repo name = URL path.

## The publishing guardrail (important)

You **cannot** create the public repo yourself: the auto-mode safety classifier blocks
`gh repo create --public` as a public-data-sharing upload, and it sits **above** the permission
allowlist — a `Bash(gh repo *)` allow-rule does *not* clear it, and you must not disable the
`autoMode` classifier to get around it. **Ask the user to create the empty public repo** (github.com/new,
no README) or run `gh repo create … --public` in their own interactive terminal. Once the repo
exists, `git remote add origin … && git push -u origin main` is fine, and you finish the rest
(enable Pages, rerun, verify).

## Local preview before shipping

Serve the folder (`python3 -m http.server`) and drive it with the preview MCP: confirm card count
and per-bucket counts, that every card image loads (`naturalWidth>0`, zero broken), and that
source-aware buy buttons point at the right URLs. Fix, then push.
