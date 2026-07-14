# Browser-sourcing playbook

How to pull real, verified product data out of hostile storefronts using the `claude-in-chrome`
MCP. This is the part that takes 80% of the effort. Snippets below are written readable; when you
pass them through `browser_batch` you must JSON-escape them (`"`→`\"`, and every regex backslash
doubles: `\d`→`\\d`, `\.`→`\\.`, `\/`→`\\/`).

## 0. Load tools & confirm a browser

Chrome tools are usually deferred — load the core set in ONE `ToolSearch` call:

```
select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,
mcp__claude-in-chrome__javascript_tool,mcp__claude-in-chrome__browser_batch,
mcp__claude-in-chrome__computer,mcp__claude-in-chrome__tabs_create_mcp
```

Then `list_connected_browsers`. Empty array → **ask the user to connect the Chrome extension**;
do not silently degrade to WebFetch (it 403s product pages). Once connected, `tabs_context_mcp
{createIfEmpty:true}` to get a `tabId` you reuse for the whole session.

## 1. Get past the bot wall (DataDome etc.)

Symptom: navigate straight to a product URL and you get a blank page, a `?dd_referrer=` on the
URL, and a screenshot reading **"Access is temporarily restricted … automated activity"**.
`read_page` shows a `DataDome CAPTCHA` node.

Fix: **establish a session first.** Navigate the site's **homepage**, wait ~2s, *then* deep-link
to products. The homepage sets the clearance cookie and subsequent same-session loads pass. Pace
loads (a `wait` between them); a burst of rapid loads can re-trip detection.

Do **not** solve CAPTCHAs or spoof to evade detection (policy). If a hard human-check persists,
ask the user to clear it once in their own browser — the cookie then covers your reads.

## 2. Extract a listing (JSON-LD first)

Most marketplaces and every Shopify store embed a `Product` in `<script type="application/ld+json">`.
Read it — it has name, price, currency, availability, images, rating. Put the fields you care about
**first** and images **last** (batch output truncates ~600 chars/item and verbose image objects
will push price/specs off the end). **Strip query strings from every URL** (see the output guard).

```js
(()=>{const q=s=>document.querySelector(s);const qa=s=>[...document.querySelectorAll(s)];
const o={id:(location.pathname.match(/listing\/(\d+)/)||[])[1],
  dead:/this item is unavailable|page not found|couldn.?t find/i.test(document.title)};
let p=null;
qa('script[type="application/ld+json"]').forEach(s=>{try{const j=JSON.parse(s.textContent);
  const a=Array.isArray(j)?j:(j['@graph']||[j]);
  a.forEach(x=>{if(x&&(x['@type']==='Product'||(Array.isArray(x['@type'])&&x['@type'].includes('Product'))))p=x;});
}catch(e){}});
if(p){o.name=(p.name||'').slice(0,90);let f=p.offers;if(Array.isArray(f))f=f[0];
  if(f){o.price=f.price||f.lowPrice;o.cur=f.priceCurrency;o.avail=(f.availability||'').split('/').pop();}
  if(p.aggregateRating){o.rating=p.aggregateRating.ratingValue;o.reviews=p.aggregateRating.reviewCount;}
  o.brand=p.brand&&p.brand.name;
  o.ldimg=[].concat(p.image||[]).map(x=>typeof x==='string'?x:(x&&(x.contentURL||x.url))).filter(Boolean)
    .map(u=>u.split('?')[0]).map(u=>u.startsWith('//')?'https:'+u:u).slice(0,5);}
o.shop=(qa('a[href*="/shop/"]').find(a=>a.textContent.trim()&&a.textContent.trim().length<40)||{}).textContent?.trim()||o.brand;
o.buyable=!!qa('button').find(b=>/add to cart|buy it now/i.test(b.textContent));
// variant dropdowns hold the REAL profile/material/size — capture them:
o.sel=qa('select').map(s=>({l:(s.getAttribute('aria-label')||s.name||'').slice(0,30),
  o:[...s.options].map(x=>x.textContent.trim()).filter(t=>t&&!/^select|^----|reason|policies/i.test(t)).slice(0,16)}))
  .filter(s=>s.o.length&&!/country|quantity|report/i.test(s.l));
const b=(document.body.innerText||'').toLowerCase();
const g=re=>{const m=b.match(re);return m?[...new Set(m.map(x=>x.trim()))].slice(0,5):[];};
// tune these keyword scans to the product domain:
o.kw=g(/\b(pbt|abs|dye[- ]?sub\w*|double[- ]?shot|dsa|xda|moa|mda|kat|sa profile|cherry profile)\b/gi);
return JSON.stringify(o);})()
```

Adapt the `id` regex, shop selector, and `kw` scans to the site/domain. The `sel` (variant
dropdowns) is critical: the real material/size/profile is often only there, and a set that "looks
wrong" in the title may offer the right variant.

## 3. Shopify shortcut

Any Shopify store exposes clean JSON at `/products/<handle>.js` (same-origin). Best source of
images + price + stock:

```js
const j = await fetch(location.pathname.replace(/\/$/,'')+'.js').then(r=>r.ok?r.json():null);
const strip=s=>{s=(s||'').split('?')[0];return s.startsWith('//')?'https:'+s:s;};
JSON.stringify(j?{title:j.title, price:(j.price/100).toFixed(2), available:j.available,
  vendor:j.vendor, imgs:(j.images||[]).map(strip).slice(0,6), tags:(j.tags||[]).slice(0,10)}:{err:'404'});
```

`j.price` is in **cents** and is the *cheapest variant* (a small add-on kit can make it look
`$12` when the main product is `$55` — cross-check the `product:price:amount` / `og:price:amount`
meta for the headline price). Use top-level `await` (not an async IIFE — the tool returns the
promise unwrapped only for a trailing awaited expression).

**Scan a whole category in one fetch.** `/collections/<handle>/products.json?limit=250` returns
every product *with full variants*. Filter client-side by title/tag/variant/size/availability to
qualify dozens of candidates without a single navigation — e.g. `col.products.filter(...).map(p =>
({t:p.title, size8:(p.variants.find(v=>v.title==='8')||{}).available}))`. And these Shopify JSON
endpoints usually serve **permissive CORS**, so the `fetch` works cross-origin from *any* page
already in the tab (even your own localhost preview). This is the fast path — see
`storefront-gotchas.md`.

## 4. On-site search (get live candidates directly)

The most reliable discovery: query the store's **own search** — it only returns active listings.
`navigate` to `/search?q=<terms>`, but result cards **lazy-load** (titles show "Loading"). Scroll
to hydrate, then scrape. Scroll via JS (no screenshot spam):

```js
for(let i=0;i<10;i++){window.scrollBy(0,1400);await new Promise(r=>setTimeout(r,160));}
window.scrollTo(0,0);
(()=>{const seen=new Set();const out=[];
[...document.querySelectorAll('a[href*="/listing/"]')].forEach(a=>{
  const m=(a.getAttribute('href')||'').match(/listing\/(\d+)/);if(!m)return;const id=m[1];
  if(seen.has(id))return;seen.add(id);const c=a.closest('li')||a.parentElement||a;
  let t=(a.getAttribute('title')||'').trim();
  if(!t||/loading/i.test(t))t=(c.querySelector('img')?.getAttribute('alt')||'').trim();
  const ct=(c.textContent||'').replace(/\s+/g,' ');
  const pr=(c.querySelector('.currency-value')||{}).textContent||'';
  const sm=ct.match(/By ([A-Za-z0-9_]+)/);const rm=ct.match(/([0-5]\.\d)\s*\((\d[\d.,k]*)\)/);
  out.push({id,t:t.slice(0,140),pr:pr.trim().slice(0,12),shop:sm?sm[1]:'',rat:rm?rm[1]:''});});
return JSON.stringify({n:out.length,cards:out.slice(0,18)});})()
```

Rebuild canonical URLs from the id (`https://www.etsy.com/listing/<id>/`) — never emit the raw
href (it carries tracking params → triggers the guard). Etsy search results ≈ relevance-ordered,
so the top ~6 per query are the ones that matter.

## 5. The output guard

The extension **blocks any script result containing cookie/query-string data** — you get literally
`[BLOCKED: Cookie/query string data]`. Triggers: returning `location.href`, or image/link URLs with
`?...=`. Rules: **strip `?…` from every URL**, don't return `location.href`, rebuild canonical
URLs. After that the same script returns fine.

## 6. Dead-listing & stock detection

- **Definitive dead:** `document.title` is the "This item is unavailable" / "Page not found" page.
  Trust the **title**, not JSON-LD `availability` (marketplaces report `OutOfStock` for
  perfectly-orderable made-to-order items). A dead page also serves generic "you might also like"
  thumbnails — don't mistake those for product images.
- **Prefer newer IDs.** Marketplace listing IDs are ~chronological; a batch of old `1.x-billion`
  Etsy IDs will be mostly dead while `4.x-billion` ones survive. Sort your queue accordingly.

## 7. Images

Hot-link the source CDN (loads cross-origin; verify in the built page). Size tokens are swappable:

- **Etsy** `i.etsystatic.com/…/il_fullxfull.<id>_<tok>.jpg` → swap `il_fullxfull.`→`il_794xN.` (or
  `il_1588xN` for hi-res). Any `il_<size>` swaps freely. Product-schema `image[]` are the real
  photos; a page-wide `img` scan also grabs logos/recommendations — dedupe/prefer schema images.
- **Shopify** `cdn.shopify.com/…?v=123` → strip `?v=` (or append `?width=800` for a lighter card).

**Always verify images load** in the finished page (`img.complete && img.naturalWidth>0`) and drop
/replace any that break. When a listing's featured image is a generic template render, open a
specific gallery image URL in the tab and screenshot to confirm it's the actual product before
using it.

## 8. Throughput & judgment

- **`browser_batch`** chains `navigate → wait → javascript_exec` for several listings in one
  round-trip (e.g. 6 listings × 3 steps = 18 items). Huge speed-up. Keep a `wait` (~2s) between
  loads so you don't re-trip bot detection, and watch for a block appearing mid-batch (re-warm via
  the homepage if so).
- **Two-pass extraction:** a compact DATA pass (no images) to qualify many candidates, then an
  images+screenshot pass only on the finalists — keeps output small and lets you eyeball the ~20
  that matter.
- **Screenshots are for aesthetic judgment.** You cannot tell "genuinely on-theme" vs
  "generic/gamer/cute" from text. Screenshot every ambiguous finalist and actually look.
