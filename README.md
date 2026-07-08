# shopping-lookbook

A [Claude Code](https://claude.com/claude-code) skill. Curate real, in-stock products into a themed
visual **"lookbook"** web page: browse live listings, verify each one, and ship a self-contained
GitHub Pages site with prices, specs, and buy buttons. Use it to turn a vibe — or a pile of
Etsy/Shopify listings — into a shareable gallery of buyable items: keycaps, gear, furniture, fashion,
plants, decor, and so on.

See [`SKILL.md`](SKILL.md) for the pipeline (clarify → discover → source/verify → curate →
build/ship), the curation discipline, and the **Think outside the box** section. Deep-dives live in
[`references/`](references/):

- [`references/browser-sourcing.md`](references/browser-sourcing.md) — driving the Chrome extension,
  DataDome warm-up, JSON-LD + Shopify `.js` extraction, on-site search scraping, image handling.
- [`references/build-and-ship.md`](references/build-and-ship.md) — the self-contained page template,
  the compatibility-lens recipe, OG image generation, GitHub Pages deploy, and the public-repo
  guardrail.

See [https://drewhoover.com/keycap-lookbook/](https://drewhoover.com/keycap-lookbook/) for an example lookbook (original repo here [https://github.com/DrewHoo/keycap-lookbook](https://github.com/DrewHoo/keycap-lookbook))

## Install

Clone into your Claude Code skills directory:

```sh
git clone git@github.com:DrewHoo/shopping-lookbook.git ~/.claude/skills/shopping-lookbook
```
