# 4℃ BRIDAL To Diamond Symphony Typography Mapping

Source profile: `4c-bridal-japanese-luxury`
Target site: DIAMOND SYMPHONY Astro

## Role Translation

| 4℃ reference role | 4℃ computed style summary | DS scope | DS role | DS token/class | Adaptation |
| --- | --- | --- | --- | --- | --- |
| Logo H1 | `Zen Old Mincho`, 24px, centered, logo element | Page/Hero | Hidden H1 / Brand Display | `.home-hero-title`, `.type-brand-display` | Preserve DS hidden H1 and visible logo. Do not use logo style for content headings. |
| Large section heading `h3.lv3.en` | `EB Garamond`, 46px, 69px line-height, 3.68px tracking | Section | Section Title | `.type-section-title` | Use DS Editorial Serif, but keep current DS scale slightly smaller than 4℃ to fit Chinese/English mixed labels. |
| Overlay section heading `h3.lv3.en.solid` | 15px, 22.5px line-height, white, 1.2px tracking | Group/Section | Heading Secondary / Group Title | `.type-heading-secondary`, `.type-group-title` | Good reference for dark/featured panels. |
| Campaign title `p.ttl` | Desktop 20px, mobile 16px, 1.28-1.6px tracking | Card/Group | Card Title / Heading Secondary | `.type-card-title`, `.type-heading-secondary` | DS product names should stay sans; editorial campaign cards may use serif. |
| Campaign date `.text._s` | 15px desktop, 14px mobile, 22.5/21 line-height | Component/Card | Caption | `.type-caption` | Use for date/category metadata, not main body. |
| Campaign description `.text._ss` | 13px, 20.8px line-height, tracking 0.64px | Card | Body Secondary | `.type-body-secondary` | DS can use a slightly larger body for Traditional Chinese readability. |
| Header nav | 12-13px item, 16px top statement | Component | Navigation / Label | `.type-navigation`, `.type-label` | DS header can keep sans for clarity while borrowing tighter tracking and calmer weight. |
| Footer utility title | 13-14px, weight 600-700 | Component/Footer | Footer Group Title / Footer Link | `.type-group-title`, `.type-caption` | Keep compact; do not enlarge footer headings. |
| CTA link | 14px, weight 600, blue accent | Component | Button | `.type-button` | DS keeps black/brand tone; use focus/hover clarity. |

## DS Token Recommendations

These are recommended ranges, not direct replacements:

| DS token | Current direction | 4℃ reference influence |
| --- | --- | --- |
| `--type-section-title-size` | `clamp(1.625rem, 2.35vw, 2.5rem)` | Keep below 4℃ 46px; DS Chinese section titles should sit around 30-40px desktop. |
| `--type-editorial-statement-size` | `clamp(1.375rem, 1.75vw, 1.75rem)` | Can be slightly more formal, but should not compete with Hero. |
| `--type-card-title-size` | `clamp(1.0625rem, 1.05vw, 1.3125rem)` | Keep product titles readable and functional. Editorial card titles may use serif. |
| `--type-caption-size` | `clamp(0.75rem, 0.25vw + 0.7rem, 0.8125rem)` | 4℃ uses 14-15px dates; DS caption can stay smaller unless it is a date row. |
| `--type-navigation-size` | `clamp(0.8125rem, 0.28vw + 0.75rem, 0.9375rem)` | Good match; keep restrained. |
| `--type-track-serif` | `0.03em` | 4℃ large section title is about 0.08em; DS can use selective larger tracking in English labels. |
| `--type-line-body` | `1.86` | DS body is more spacious than 4℃. Good for Traditional Chinese; keep. |

## Homepage Section Mapping

| DS homepage section | 4℃ reference pattern | DS typography structure | Notes |
| --- | --- | --- | --- |
| Hero | Campaign/brand first impression | Hidden H1, visible hero title, label, optional lead | Keep DS visual title below hidden H1. |
| Brand Introduction | Brand/statement block | Eyebrow, Editorial Statement, Lead, Body | Use quiet serif statement and sans body. |
| Recommendation | Product/campaign card rail | Section Title, Product Card Title, Body Secondary price | 4℃ card typography is compact; DS product names should not become huge. |
| Knowledge Editorial | Column/Information | Section Title, Article Category, Article Title, Summary | Use editorial card title selectively. |
| Featured Collections | Service/featured content | Section Title, Heading Primary, Body, CTA | Dark/featured variants may borrow 4℃ compact overlay heading logic. |
| Product Categories | Category search | Section Title, Category Card Title, Caption | 4℃ category title is centered; DS may keep grid aligned. |
| Consultation CTA | Reservation/footer CTA | Section Title, Lead, Button | CTA typography compact and confident. |

## Rules For Applying The Profile

- Do not globally switch DS body text to serif.
- Do not use the 46px 4℃ title scale unchanged; DS Chinese/English mixed text needs a calmer scale.
- Increase hierarchy through spacing and role clarity before increasing font size.
- Product cards remain Functional Sans unless they are editorial story cards.
- Keep mobile captions and dates readable; do not over-tighten line-height.
- Do not copy 4℃ campaign wording, dates, or navigation labels.
