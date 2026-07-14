# Storefront gotchas & the fast path

Hard-won, platform-specific shortcuts and traps. Read this **with** `browser-sourcing.md` — that
file is the general playbook; this one is the "here's what actually costs you turns" cheat-sheet.
The headline: **most storefronts in a given vertical are Shopify, and Shopify lets you qualify
dozens of candidates with zero navigation and zero screenshots.** Reach for that before anything else.

## The fast path (do this first, every time)

1. **Identify the platform from one product URL** (see detection table below).
2. **If Shopify: skip navigation entirely.** From *any* page already in the tab group (even your
   own localhost preview), a cross-origin `fetch()` of the store's JSON endpoints usually works —
   Shopify serves `products.json` / `.js` with permissive CORS. You can scan a whole store, filter
   by size/variant/stock, and grab prices+images in **one `javascript_tool` call**, no page loads.
3. **Two-pass, always:** a compact DATA pass (no images) to qualify many candidates → an images +
   screenshot pass on the ~finalists only. Keeps output small; you eyeball only what matters.
4. **Verify images the right way** (fresh `Image()` load, not `naturalWidth` after a scroll — see
   below) and **trust the rendered page for stock**, not JSON-LD.

This alone is the biggest speed/token win in the skill. A category scan that would be 20 navigations
+ 20 screenshots becomes 1–2 fetches.

## Platform detection (from a product URL)

| Signal in the URL / page | Platform | Money move |
|---|---|---|
| `/products/<handle>`, `/collections/<handle>` | **Shopify** | `.js` + `products.json` (below) |
| `/product/<slug>/<numeric-id>.html`, `demandware.static` in img src | **Salesforce Commerce (SFCC)** | JSON-LD; images are param-locked (below) |
| `cdn11.bigcommerce.com` in img src, `/products/<name>/` | **BigCommerce** | JSON-LD; swap img size segment |
| `.html` product pages, `/catalog/` search | **Magento** | JSON-LD; watch stale JSON-LD stock |
| `/product/<slug>/`, `wp-content/uploads` imgs | **WooCommerce** | JSON-LD Product; `wp-content` images hotlink fine |
| `i.etsystatic.com`, `/listing/<id>/` | **Etsy** | DataDome warm-up; `il_` size swap |
| `/dp/<ASIN>`, `m.media-amazon.com` imgs | **Amazon** | Browser-navigate + innerText read (below) |

## Shopify — the endpoints that win

```js
// ONE product, clean JSON: price(cents, cheapest variant), variants+availability, images, options, tags
const j = await fetch(location.pathname.replace(/\/$/,'')+'.js').then(r=>r.ok?r.json():null);

// A WHOLE category in one shot — every product with full variants. Cross-origin-safe from any page.
const col = await fetch('https://<store>/collections/<handle>/products.json?limit=250').then(r=>r.json());
```

- **Filter by exact size/variant stock without visiting a single product page.** This is the unlock
  for size-, color-, or spec-constrained briefs:
  ```js
  col.products
    .filter(p => /59fifty/i.test(p.title) && /fitted/i.test(p.title))         // narrow the type
    .map(p => ({ t:p.title, h:p.handle, price:p.variants[0].price,
                 size8:(p.variants.find(v=>v.title==='8')||{}).available }))    // exact-variant stock
    .filter(x => x.size8 === true);                                            // only in-stock size 8
  ```
- **Batch `.js` for several handles in one call** (loop with `await`) — 5 products, 5 fields each,
  one round-trip.
- `j.price` is **cents** and the **cheapest variant** (a $12 add-on can mask a $55 hat). Cross-check
  the `og:price:amount` / `product:price:amount` meta for the headline price.
- Options live in `j.options` (`Size`, `Color`, `Artwork`, …) — the real material/profile/blank
  choice is here, not in the title.

## Full-catalog sweeps beat on-site search (and the vendor's own search API)

A vendor's search can hide its own inventory: Ebbets' `search/suggest.json?q=alabama` returned
**zero results** while two in-stock "University of Alabama" caps sat in the catalog. Don't trust
one query — for any Shopify vendor worth mining, **sweep the whole catalog** and filter locally
with a synonym regex covering *both vocabulary registers* (fan terms AND formal/city/sponsor names):

```js
let hits=[];for(let page=1;page<=6;page++){
  const j=await fetch('/products.json?limit=250&page='+page).then(r=>r.ok?r.json():null);
  if(!j||!j.products.length)break;
  j.products.forEach(p=>{ if(/alabama|birmingham|tuscaloosa/i.test(p.title)) hits.push(/*…*/); });
  if(j.products.length<250)break;}
```

~1,400 products scan in seconds, with per-variant stock in the same payload. Run this sweep on
**every source that over-performed in another bucket** (the source-×-bucket cross-join) — it's the
cheapest discovery move in the whole pipeline and the most commonly skipped.

## Platform families & licensed-goods channels

- **A network of sibling stores shares one platform — verify N stores for the price of one.**
  Every MiLB team store is `<team>.milbstore.com`, all Shopify: seven teams' size-specific stock
  verified in one batched fetch loop. When any team/campus/franchise store appears, assume the
  whole network is sweepable with the same endpoint trick. (Campus stores are the counterexample:
  `shop.<school>.com` is usually Fanatics — 403s fetchers, JS-walled search, size buttons that
  render enabled while the cart says Out of Stock. Click a size and read the add-to-cart button's
  `disabled` state; the button grid alone lies.)
- **Sold-out in one channel is NOT a verdict for licensed goods.** The same SKU lives at the
  maker's own site, Fanatics, the team/campus store, and retailers (Lids, fittedhats.com) — one
  run found a cap dead at Fanatics and absent from the team store but fully stocked in the
  maker's own `/collections/<team>/products.json`. Triangulate the maker's collection endpoint
  before benching a finalist.
- **Per-variant sale prices:** `.js` `price` is the cheapest variant and `products.json`
  `variants[0].price` is arbitrary — on sale items these can both differ from the price of the
  buyer's size. Read `v.price` on the exact variant you'd order ($41 "cheapest" masked a $68
  size-8 in one run).

## Salesforce Commerce (Patagonia & many outdoor/apparel brands) — the image trap

- Product URL `/product/<slug>/<id>.html`; on-site search `/search/?q=<terms>`. Read **JSON-LD** for
  name/price/availability; read reviews from `body.innerText` (fit gold — e.g. a "fits larger heads"
  review is stronger evidence than any size chart).
- **Their images do NOT hotlink, and the query-stripped URL 404s even for a same-origin in-browser
  `fetch()`.** The `?sw=&sh=&sfrm=&q=&bgcolor=` params are **required** and the `dw<hash>` path
  segment is cache-keyed. So: **do not plan to reuse an SFCC image URL** on your page. Either
  local-download it, or (cleaner) re-source the image from a retailer CDN (below).
- If you *must* recover the working URL, the output guard blocks you from returning it (query
  string) — parse it to a plain object to slip past: `const u=new URL(src); const params={};
  u.searchParams.forEach((v,k)=>params[k]=v); return JSON.stringify({path:u.pathname, params});`
  then rebuild in Bash. (In practice, the retailer-CDN route is faster.)

## Image hotlinking — cheat-sheet + the fallback

Hot-linking (the source CDN loads cross-origin on your published page) works for most, fails for a few:

| CDN | Hotlinks? |
|---|---|
| `cdn.shopify.com` (all Shopify: New Era, Oddjob, Kavu, Homefield, Altru, Inside Joke…) | ✅ |
| `i.etsystatic.com` (Etsy) | ✅ |
| `cdn11.bigcommerce.com` (BigCommerce, e.g. Stormy Kromer) | ✅ |
| `content.backcountry.com` (Backcountry) | ✅ |
| `www.patagonia.com/dw/…` (SFCC/demandware) | ❌ param/referer-locked |
| scene7 / other SFCC image hosts | ⚠️ often referer-gated — test |

**Rule: test every finalist image with a fresh loader, then handle the failures two ways.**

```js
// Reliable per-URL loadability test (run in the browser). naturalWidth-after-scroll is a LIE (below).
const testImg = u => new Promise(res=>{const i=new Image();
  i.onload=()=>res(i.naturalWidth>0?'OK '+i.naturalWidth:'zero'); i.onerror=()=>res('FAIL');
  i.src=u; setTimeout(()=>res('timeout'),5000);});
```

- **Failure fix A — re-source from a friendlier retailer CDN.** Find the same product on Backcountry
  and use its clean, query-less path: `content.backcountry.com/images/items/1200/<BRAND>/<STYLE>/<COLOR>.jpg`
  (swap `/small/`→`/1200/` for hi-res). These curl **and** hotlink.
- **Failure fix B — local-download and commit under `img/`.** `build-and-ship.md` covers this. Curl
  works for the locked-CDN bytes only if you have the full working URL (params included); the retailer
  route is usually less friction.

## Verify images the RIGHT way (this wasted real turns)

`img.naturalWidth===0` checked right after `window.scrollTo(0,0)` reports **everything broken** —
`loading="lazy"` images that just scrolled out of the viewport get their decode dropped, and the
check races the reload. It gives a confident false negative across the whole page.

- **Don't** trust a bulk `naturalWidth` sweep as your image-verification gate.
- **Do** use the `testImg()` loader above per finalist URL, and **screenshot one or two cards** to
  confirm visually. Shopify/Etsy/local images that "failed" the sweep load fine on screen.

## Stock truth — the rendered page beats JSON-LD

- JSON-LD `availability` lies both ways: marketplaces report `OutOfStock` for perfectly-orderable
  made-to-order items, **and** a retailer's JSON-LD read `InStock` while the page rendered a big
  **"OUT OF STOCK"** ribbon over the product. A `.js` `available:true` can also be stale.
- **Trust what renders:** the page title ("This item is unavailable"), an on-image sold-out ribbon,
  or the size dropdown's struck-through options. When a fast text read is ambiguous, **screenshot**
  before you commit an item to a card. (This is how a dead trucker got caught before shipping.)

## Amazon — easier than its reputation

WebFetch dies on Amazon, but the **browser navigates product pages fine** (no bot wall hit in
practice for plain `/dp/<ASIN>` loads). Read with a cheap innerText scan, not the DOM maze:
`{price: body.match(/\$\d+\.\d{2}/)[0], avail: /in stock|add to cart/i.test(body), blank:
/richardson 112|yupoong|flexfit/i.test(body)}` — that last check matters because marketplace hat
sellers print the blank's model in the bullets, which tells you the real fit. Note the URL often
redirects to a different ASIN (color variant); take the resolved `/dp/<ASIN>` as canonical.
`m.media-amazon.com/images/I/…jpg` product images **hotlink fine** (grab `#landingImage`).

## Etsy specifics

- **DataDome:** navigate `etsy.com` (homepage) first, wait ~2s, *then* the `/listing/<id>/` deep-link.
- Images: `i.etsystatic.com/…/il_fullxfull.<id>_<tok>.jpg` → swap `il_fullxfull.`→`il_794xN.`
  (or `il_1588xN` for hi-res). Any `il_<size>` swaps freely.
- **`aggregateRating` in an Etsy listing's JSON-LD is the *shop's* rating, not the item's.** A shop
  with "4.8★ / 4,866 reviews" can front a brand-new listing that has zero. Attribute it as
  *"from a shop rated 4.8★ across 4,800+ reviews,"* and check the listing's own review section.

## Environment traps (not storefront, but they cost turns)

- **The output guard blocks TWO kinds of data, not one:** (1) query-string URLs / `location.href`,
  and (2) **base64 blobs** — so you cannot exfiltrate image bytes via `canvas.toDataURL`. Plan image
  handling around downloading/hotlinking, never "read the pixels out."
- **`save_to_disk` on `computer` screenshots/zoom does not land anywhere the Bash tool can read** —
  the browser MCP and the shell run in different environments. Don't use it to get an image into the
  repo; curl-download instead.
- **The Bash tool is sandboxed with no network by default.** `curl`, `npm i`, `gh`, and `git push`
  need `dangerouslyDisableSandbox: true`.
- **`cd` inside a compound Bash command doesn't reliably persist** and the shell cwd can reset between
  calls — `cd <repo> && git …` in the *same* command, or pass absolute paths.
- **In-app Browser pane: screenshots go solid black at deep scroll offsets** even while the page is
  fine (capture works near scrollY 0). Don't burn turns rescreenshotting — verify at depth with DOM
  reads (`elementFromPoint`, `img.complete && naturalWidth>0` on elements whose bounding rect is
  in-viewport), and take your eyeball screenshots at the top of the page. The image-grid trick
  composes with this: rewrite a scratch tab's body to a labeled `<img>` grid of every finalist image
  at scrollY 0 — one screenshot eyeballs all candidates AND hotlink-tests every CDN at once.
