# 鑽之韻 DIAMOND SYMPHONY Astro Website

Official website rebuild from the local CYBERBIZ backup package.

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

On this Windows environment, use `npm.cmd` if PowerShell blocks `npm.ps1`.

## Project Structure

- `src/components/`: shared UI components.
- `src/content/`: Astro Content Collections for knowledge, products, and collections.
- `src/data/`: site navigation, contact data, and featured content.
- `src/layouts/`: base page layout and SEO tags.
- `src/pages/`: static and dynamic routes.
- `src/styles/`: design tokens, global CSS, typography, utilities, and animations.
- `public/assets/`: semantic copies of selected CYBERBIZ media.

## Implemented Routes

- `/`
- `/zh-TW/`
- `/blogs/diamond-symphony-guide/`
- `/collections/diamond/`
- `/collections/proposal/`
- `/collections/color-diamond/`
- `/pages/about-us/`
- `/pages/custom-service/`
- `/pages/qna/`
- `/contact/`
- `/404.html`

## Migration Notes

The original archive contains mojibake in several text extracts. This first version keeps verifiable brand facts, routes, and media, and rewrites damaged prose into clean Traditional Chinese copy. Details are recorded in `../docs/migration/`.

## Content Management

This project does not restore CYBERBIZ cart, checkout, member, payment, logistics, coupon, point, or admin features. Product pages are maintained as jewelry showcase and inquiry pages.

### Products

Product source data lives in:

- `src/content/products/*.json`
- `data/migration/product-master.json`
- `data/legacy-content/products/*.json`

To add a product:

1. Create a new JSON file in `src/content/products/`.
2. Set a stable `legacyProductId`, `name`, `slug`, `category`, `collection`, and status fields.
3. Keep unknown fields empty. Do not invent material, stone, certificate, or specifications.
4. Add images only when the product relation is confirmed.

To modify a product name:

1. Update `name`, `englishName`, and `originalDisplayName` in the product JSON.
2. Keep `legacyProductId` unchanged.
3. Change `slug` only if a route migration is intentional, then add a redirect mapping.

To add product images:

1. Save original files under `public/assets/migrated/products/{legacyProductId}-{slug}/source/`.
2. Add image objects to the product JSON with `src`, `alt`, `role`, `originalUrl`, and `sha256` when known.
3. Update `mediaStatus` / `imageStatus`.
4. Never reuse another product image as a temporary substitute.

To add product descriptions or specifications:

1. Put original text in `description` or `specifications`.
2. Record source evidence in `rawSources` or `sourceFiles`.
3. Update `contentStatus` only after the source text is verified.

To set SEO:

1. Use `seoTitle` and `seoDescription`.
2. Use `canonicalUrl` only for verified legacy canonical references.
3. Do not generate marketing copy unless it is intentionally new content and marked as such.

To disable a product:

1. Keep the JSON file for archival traceability.
2. Add a status field such as `overallStatus: "disabled"` or a migration note.
3. Remove it from collection listings if needed, but keep old route handling.

### Pages

Legacy non-product page backups live in:

- `data/legacy-content/pages/`
- `data/legacy-content/collections/`
- `data/legacy-content/knowledge/`
- `src/content/pages/`

The archive route `/legacy-content/[...slug]/` renders these page backups. Redesigning the frontend should not delete this raw content layer.

### Collections And Knowledge

- Collections: `src/content/collections/*.json`
- Knowledge: `src/content/knowledge/*.md`

Keep product-to-collection relationships in product `collections` and collection `products` fields.

### Redirects

Redirect-like legacy routes are currently handled by:

- `src/pages/[...legacy].astro`
- product legacy URLs in `src/pages/products/[slug].astro`

When adding a redirect, record the old URL, new URL, and reason in the relevant migration document.

## Contact Data To Confirm

- LINE official account URL.
- Current address.
- Current opening hours.
- Complete product catalog.
- Production redirect policy.
