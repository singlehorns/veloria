# 4℃ BRIDAL Homepage Typography Audit

Source: https://4-bridal.jp/
Audited: 2026-07-19
Profile ID: `4c-bridal-japanese-luxury`

## 1. Overall Typography Impression

4℃ BRIDAL uses a very restrained Japanese luxury typography system. The visual identity is quiet, centered, and serif-led. Hierarchy is built through:

- a high-contrast serif pairing rather than heavy weights
- generous letter spacing on English section labels
- measured line-height
- calm black, white, and deep blue text roles
- large section spacing
- centered section headers on editorial/category blocks
- compact typography in navigation and utility areas

The reference is useful for DS as a typography rhythm model, not as a direct visual copy target.

## 2. Font Family Relationship

Observed primary families:

| Role | Observed family | Notes |
| --- | --- | --- |
| Japanese body / campaign / navigation | `"Zen Old Mincho", serif` | Main emotional voice. Used even for body and navigation. |
| English section label / copyright | `"EB Garamond", serif` | Large section titles and English microcopy. |
| Slider dot hidden labels | `Arial` at `0px` | Used only for invisible control text. Not a typography model. |

DS should not replace all Functional Sans usage with serif. Instead, use this profile to make DS serif headings more refined and to improve spacing rhythm.

## 3. Typography Scale

Representative computed styles:

| Reference role | Desktop sample | Mobile sample | Computed behavior |
| --- | --- | --- | --- |
| Section Title large | `46px / 69px`, weight `500`, tracking `3.68px`, `EB Garamond` | Not fully reduced in all observed sections, but layout narrows around it | Large English label acts as section title. Japanese subtitle is appended in the same heading text. |
| Compact dark-panel title | `15px / 22.5px`, weight `500`, tracking `1.2px`, white, `EB Garamond` | Similar compact treatment | Used for SERVICE / CONCIERGE / COLUMN overlay sections. |
| Store/CTA block heading | `24px / 28.8px`, weight `500`, tracking `0.64px`, `Zen Old Mincho` | Same family, narrower wrap | Supporting large heading below editorial sections. |
| Campaign title | Desktop `20px / 30px`, weight `500`, tracking `1.6px`, `Zen Old Mincho` | Mobile `16px / 24px`, tracking `1.28px` | Clear responsive reduction. |
| Campaign/body description | `13px / 20.8px`, weight `500`, tracking `0.64px`, `Zen Old Mincho` | Same size on mobile | Small but readable due to line-height. |
| Navigation headline | `16px / 24px`, weight `500`, tracking `0.64px`, centered | Same on mobile | Quiet brand statement above header. |
| Header nav item | Desktop around `13px / 19.5px`, weight `600` | Tablet/mobile around `12px / 18px` | Small but firm navigation. |
| Footer links | `13px-14px`, weight `600-700` | Similar | Utility links are compact, not decorative. |

## 4. Role Mapping

| Reference role | Selector sample | Semantic purpose | DS target role |
| --- | --- | --- | --- |
| Reference Logo H1 | `h1.logo` | Brand identity / SEO anchor | DS hidden H1 / Brand Display, not visible body text |
| Reference Section Label/Title | `h3.lv3.en` | Main editorial section title | DS Section Title |
| Reference Solid Section Label | `h3.lv3.en.solid` | Overlay/service section title | DS Heading Secondary or Group Title |
| Reference Campaign Title | `p.ttl` | Card/campaign title | DS Card Title or Heading Secondary |
| Reference Campaign Date | `.text._s` | Date/caption | DS Caption |
| Reference Campaign Description | `.text._ss` | Supporting body | DS Body Secondary |
| Reference Navigation | `header a`, `.header-top-info` | Main navigation and brand utility | DS Navigation / Label |
| Reference Footer CTA | `footer a` | Reservation/shop CTA | DS Button / Footer Link |

## 5. Section Mapping

Observed homepage section structure:

- Hero/campaign carousel
- Brand search
- Category search
- Information
- Service
- Concierge
- Column
- Shop list / online shop CTA
- Footer utility links

Typography pattern:

- Editorial/category sections use a large centered English serif heading with Japanese label appended.
- Utility/service sections use smaller white overlay headings.
- Campaign and information cards use compact serif text, with title, date, and description tightly grouped.

## 6. Spacing Rhythm

Observed relationships:

- Section title large: `margin-bottom: 40px` in large category blocks.
- Campaign title to date: around `10px`.
- Date to description: close/stacked relationship.
- Footer utility titles: `margin-bottom` around `12px-15px`.
- Section blocks rely on large section-to-section distance rather than oversized text.

DS translation:

- Keep section header to content spacing around a controlled `36px-52px`.
- Keep card image to title rhythm compact.
- Avoid increasing card titles to solve hierarchy; use spacing and grouping instead.

## 7. Responsive Difference

Observed viewport behavior:

| Viewport | Notes |
| --- | --- |
| 1440x1000 | Large centered section title at `46px`; campaign cards around `302px` content width. |
| 1280x900 | Same typography scale, narrower card width around `253px`. |
| 1024x900 | Same title/body scale, much narrower card width around `175px`; wrapping increases. |
| 768x1024 | Navigation reduces some items to `12px`; card width around `137px`. |
| 390x844 | Campaign title reduces from `20px` to `16px`; date reduces from `15px` to `14px`. |
| 375x812 | Similar to 390; tight mobile widths rely on preserved line-height. |

## 8. Interaction Typography

Observed:

- Slider control text is visually hidden at `0px`.
- Links preserve calm weight; hover behavior appears to be more about image or underline movement than large text changes.
- CTA text uses compact sizes and stronger weight, often with blue accent.

DS recommendation:

- Keep text hover subtle: underline, opacity, or slight color shift.
- Product/image hover should not resize text or layout.
- Focus states must remain visible and should not depend on color alone.

## 9. DS Reusable Takeaways

- Use restrained serif headings with measured letter spacing.
- Let section spacing and content width create hierarchy.
- Keep body and product browsing legible, not overly decorative.
- Reduce mobile title size more intentionally than desktop.
- Use compact labels and captions with consistent line-height.

## 10. Not To Copy

Do not copy:

- 4℃ BRIDAL logo treatment
- Japanese campaign copy
- campaign dates/promotions
- imagery or layout assets
- exact blue branding role
- all-serif navigation/body behavior as a blanket DS rule
