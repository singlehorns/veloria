# Typography System

This document defines the official typography roles for the DIAMOND SYMPHONY Astro site. It is a system layer only; visual rollout should happen section by section.

## Core Families

| Natural name | Token | Use |
| --- | --- | --- |
| Sans | `--font-sans` | Navigation, UI, body, product names, prices |
| Serif | `--font-serif` | Page titles, editorial section titles, brand storytelling |
| Functional Sans | `--font-functional-sans` | Semantic alias for shopping, navigation, controls, product cards, body copy |
| Editorial Serif | `--font-editorial-serif` | Semantic alias for brand display, hero/page titles, section titles, editorial statements, quotes |

## Semantic Tokens

| Natural name | Size token | Class | Default role |
| --- | --- | --- | --- |
| Brand Display | `--type-brand-display-size` | `.type-brand-display` | Highest brand/editorial display |
| Page Title | `--type-page-title-size` | `.type-page-title` | One visible page-level title |
| Section Eyebrow | `--type-label-size` | `.type-section-eyebrow` | Small section kicker |
| Section Title | `--type-section-title-size` | `.type-section-title` | Main title of a section |
| Section Lead | `--type-lead-size` | `.type-section-lead` | Intro copy under section title |
| Section Heading Primary | `--type-section-heading-primary-size` | `.type-heading-primary` | Major heading inside a section |
| Section Heading Secondary | `--type-section-heading-secondary-size` | `.type-heading-secondary` | Supporting heading inside a section |
| Group Title | `--type-group-title-size` | `.type-group-title` | Title for grouped content |
| Card Title | `--type-card-title-size` | `.type-card-title` | Product/article/card title |
| Card Subtitle | `--type-card-subtitle-size` | `.type-card-subtitle` | Product metadata or secondary title |
| Lead | `--type-lead-size` | `.type-lead` | Page or hero introduction |
| Body | `--type-body-size` | `.type-body` | Main paragraph text |
| Body Secondary | `--type-body-secondary-size` | `.type-body-secondary` | Price, metadata, helper copy |
| Caption | `--type-caption-size` | `.type-caption` | Date, count, breadcrumb, small helper text |
| Label | `--type-label-size` | `.type-label` | Eyebrow, ID, status, category marker |
| Navigation | `--type-navigation-size` | `.type-navigation` | Header, mobile, sidebar navigation |
| Button | `--type-button-size` | `.type-button` | CTA and tool controls |
| Editorial Section Title | `--type-editorial-section-title-size` | `.type-section-title` in editorial homepage sections | Homepage/product-story section title below Page Title |
| Editorial Statement | `--type-editorial-statement-size` | `.type-editorial-statement` | Brand statements, feature-product story headings |
| Quote Title | `--type-quote-title-size` | `.type-quote-title` | Short editorial quote or highlighted brand sentence |
| Article Title | `--type-page-title-size` | `.type-article-title` | Knowledge article title |
| Article Section Title | `--type-section-heading-primary-size` | `.type-article-section-title` | Knowledge article h2-level section title |
| Editorial Card Title | `--type-group-title-size` | `.type-card-title-editorial` | Article/editorial card titles only; product cards remain sans |

## Dual-Font Role Rule

Use Editorial Serif for brand display, hidden or visible page titles, hero titles, homepage section titles, product-story statements, article titles, quotes, and important brand sentences. Use Functional Sans for eyebrow labels, lead/body copy, navigation, buttons, prices, captions, filters, product card titles, and functional collection cards.

The homepage may borrow the article page's editorial rhythm, but it must not become an article layout. Product and shopping UI remain Functional Sans.

## Responsive Rules

| Breakpoint | Rule |
| --- | --- |
| Desktop | Full editorial hierarchy. Brand Display and Page Title may be large, but Section Title remains below Page Title. |
| Tablet `max-width: 1023px` | Reduce display and page title scale. Preserve hierarchy by lowering section headings with them. |
| Mobile `max-width: 620px` | Prioritize readability and wrapping. Mixed Chinese/English names must fit without overlap. |

## Tone Mapping

| Tone | Recommended color token |
| --- | --- |
| Primary | `--color-ink` |
| Secondary | `--color-ink-soft` |
| Muted | `--color-muted` |
| Accent | `--color-accent` |
| Inverse | white or controlled inverse context |
| Emphasis | `--color-ink` with stronger size/weight, not arbitrary font size |
