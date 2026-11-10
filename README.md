# Tomato Ricenoodles / 番茄米线

**Final visual edition: V2, November 2026.** The site includes an original geometric English visual identity and a softly ornamented Chinese visual identity.

A two-edition author website built for Cloudflare Pages + D1. This project is completely separate from DaydreamPanda/literary-archive and uses only its own new database.

## The design

- `/en/` is a constructivist English literary journal: geometric red/black/ochre SVG artwork, asymmetrical composition, spacious editorial typography, independent collections.
- `/zh/` is a softly ornamented Chinese paper-and-ink literary journal: pale landscape, blossom motifs, engraved frames, delicate type, 政论随笔、小说、诗歌、专题文集.
- Both editions share one codebase and one private writing desk, but each has its own presentation, categories, article index, and collections.
- The **only language switch is on each homepage**. Readers never switch a single article into a translated counterpart. There is no automatic translation.
- All article headings inside `?demo=1` are clearly marked **design previews**. No actual published work has been imported.

## See the design before deploying

Run a local static server at the project root and visit:

- `http://localhost:8000/en/?demo=1`
- `http://localhost:8000/zh/?demo=1`
- `http://localhost:8000/en/collections.html?demo=1`
- `http://localhost:8000/zh/collections.html?demo=1`

For example, Python 3: `python3 -m http.server 8000`.

Demo mode has only interface sample text. Without `?demo=1`, published articles are loaded from `/api/posts`. A local static server has no Cloudflare Functions or D1 and therefore will not show real data.

## Visual identity (V2)

- English design language: **constructivism** (flat geometric blocks, strong asymmetry, strong contrast, minimal detail). Hero: `assets/graphics/en-hero.svg`; collection covers: `en-*.svg`.
- Chinese design language: **soft, ornamented, expressive** (subtle paper texture, flowers, ink-wash landscape, filigree borders). Hero: `assets/graphics/zh-hero.svg`; collection covers: `zh-*.svg`.
- `assets/site.css` holds the original shared layout, while `assets/identity-v2.css` holds the new art direction and language-specific refinements.
- Both identities share the small tomato-and-noodle mark in `assets/graphics/favicon.svg`.
- Both front ends are independent even though they share administration. The language homepage switch appears **only on homepages**.

## Publishing and editing

The **single** `/admin/` private author desk serves both sites. Choose **Publish to / 发布目标站点** (`English Site` or `中文站`) and **Visibility / 发布状态** (`Private draft` or `Published`) at the bottom of the editor before saving. If a published article is moved between sites, the desk requires confirmation, and the article gets a new publish timestamp. The `/admin/` private author desk from the earlier prototype has been kept. It supports Markdown, drafts, publishing, editing, and **optional individual article cover URLs** independently by language. Select one of four categories (`essay`, `fiction`, `poetry`, `note`). To put a piece in more than one collection, enter comma-separated collection slugs in the editor, for example `on-ethics, basic-human-science`.

Collection identities, descriptions, display order, visual themes, and external Medium/Matters profile links are configured in `site-config.js` **separately for each language**. You can add an arbitrary number of collections there. Counts are calculated from published articles, not imported from screenshots. A collection can appear on the page before you have published articles in it. Article lists automatically use themed default SVG thumbnails based on language and category. To override any article image, enter an HTTPS image URL or a project asset path such as `/assets/graphics/zh-poems.svg` in its Cover image URL field.

## Deploy (new project only)

1. Create a **new repository** under your regular GitHub identity `ssimonz-sys`, e.g. `tomato-ricenoodles`. Do not add this code to the adult-fiction site.
2. Upload these files to the root of that repository.
3. Create a **new** Cloudflare D1 database, e.g. `trn-writings`.
4. Execute `schema.sql` on the empty database using the Cloudflare D1 Console.
5. Create a new Cloudflare Pages project with **GitHub integration** pointing to this repository. Framework preset: None; build command: blank; output directory: `.`.
6. In the Pages settings add a production D1 binding named exactly `DB` and select your new database. Redeploy.
7. Add an encrypted secret `ADMIN_PASSWORD` containing a strong unique password. Redeploy.
8. Open `/admin/`, log in, then create and publish an article in either language.
9. Edit `site-config.js` with your real Medium / Matters profile URLs as appropriate. Never commit a password, token, or database secret.

`wrangler.toml.example` is a template only. If using Wrangler, copy and update with your **new** D1 identifier.

**Database note:** The schema in this package is intended for a fresh D1 database. If migrating from the *earlier Tomato Ricenoodles prototype* (not the old adult novel site), you will need an explicit migration for renaming `pair_key` to `collection_slugs` and adding `poetry` to the type CHECK constraint.

## Status and limitations

- Design mockups and the local preview are ready, but this has **not** been deployed to a live Cloudflare project.
- Real article content, image covers, Medium/Matters URLs and database bindings have **not** been imported or configured.
- The bundled `assets/graphics/*.svg` are original, editable graphic assets for the two site identities and collection covers. They have no external image dependencies. The art URLs live in `site-config.js`; update or replace an SVG to change a collection cover.
- The site relies on client-side data fetching for public articles; deeper SEO, sitemap and rich previews will need additional development before a major launch.
- Reader Markdown rendering uses Marked + DOMPurify from pinned CDN versions. Without network access the reader safely displays paragraph text as a fallback.

No text or data from your older DaydreamPanda database is included. No adult content is bundled.
