# Typography Guidelines

## Rules For New Sections

1. Define the section strength first: Emphasis, Standard, or Supporting.
2. Select typography by role, not by HTML tag.
3. Keep one page-level H1 per page.
4. Use semantic HTML heading order for SEO and accessibility.
5. Do not make card titles visually equal to section titles.
6. Do not make section titles visually equal to page titles unless the section is the page hero.
7. Use `.type-*` classes or typography tokens instead of creating new component-level font sizes.
8. Product names use Card Title; prices use Body Secondary.
9. Breadcrumbs, counts, dates, product IDs, and small helper text use Caption or Label.
10. CTA text uses Button, even when it is an anchor.
11. Use Editorial Serif for page/hero/section storytelling roles; use Functional Sans for body, product, commerce, and navigation roles.
12. Do not convert product cards, filters, category cards, buttons, or prices to serif just because they appear inside an editorial section.

## Migration Order

1. Fix `ProductGrid` title role so embedded product grids do not create H1.
2. Normalize product card title and price roles across homepage and catalog.
3. Add a visible Page Title to the knowledge archive.
4. Reduce KnowledgeArticleCard visual weight to Card Title.
5. Lower FAQ category and sidebar headings to Group Title.
6. Review mobile wrapping for mixed Chinese/English product names.

## Do Not

- Do not bind all visual roles directly to `h1`, `h2`, or `h3`.
- Do not add arbitrary `font-size` values inside components.
- Do not use negative letter spacing.
- Do not use `!important` for typography migration.
- Do not change all pages in one pass.
- Do not copy article-page pixel values directly into homepage components; map article typography to semantic tokens first.

## Section Template

Use this shape when documenting or adding a new section:

```text
Page:
Section name:
Section strength:
Eyebrow role:
Main title role:
Lead role:
Internal heading roles:
Group roles:
Card roles:
Body roles:
CTA roles:
HTML heading plan:
Mobile wrapping notes:
```
