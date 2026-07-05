# claude-skills

Version-tracked [Claude Code](https://claude.com/claude-code) skills.

Each top-level directory is a skill — a `SKILL.md` (with YAML frontmatter: `name`, `description`)
plus an optional `references/` folder of deep-dive docs. Skills are **symlinked** into
`~/.claude/skills/`, so the live skill Claude Code loads and the copy tracked here are the same
files. Edit in either place; commit here.

## Skills

### shopping-lookbook
Curate real, in-stock products into a themed visual "lookbook" web page: browse live listings,
verify each one, and ship a self-contained GitHub Pages site with prices, specs, and buy buttons.

- `SKILL.md` — the pipeline (clarify → discover → source/verify → curate → build/ship), curation
  discipline, and a **Think outside the box** section (reframe binary constraints, expand to
  adjacent communities, grade against the user's real hardware, build a compatibility *lens*).
- `references/browser-sourcing.md` — driving the Chrome extension, DataDome warm-up, JSON-LD +
  Shopify `.js` extraction, on-site search scraping, image handling.
- `references/build-and-ship.md` — the self-contained page template, the compatibility-lens
  recipe, OG image generation, GitHub Pages deploy, and the public-repo guardrail.

## Linking a skill into Claude Code

```sh
ln -s "$PWD/shopping-lookbook" ~/.claude/skills/shopping-lookbook
```

New machine / fresh clone: clone this repo, then symlink each skill directory into
`~/.claude/skills/`.
