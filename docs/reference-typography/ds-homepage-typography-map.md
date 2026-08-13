# DS Homepage Typography Map With 4℃ Reference Profile

Base reference profile: `4c-bridal-japanese-luxury`
Brand font profile: DS dual font
Status: mapping only; not globally applied to CSS.

## Homepage Roles

| Section | Element | Scope | Role | Level | Tone | Font role | Reference role | DS token/class | Responsive rule | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Hero | Hidden `h1` | Page | Page Title / SEO H1 | 1 | Primary | Editorial Serif | Reference Logo H1 | `.home-hero-title` | Remains visually hidden | Keep |
| Hero | `量身打造` | Hero | Hero Label | 3 | Accent | Functional Sans / label treatment | Campaign label | `.type-section-eyebrow` | Horizontal on mobile | Refined |
| Hero | `設計師引領 / 專屬鑽戒體驗` | Hero | Hero Title | 2 | Primary | Editorial Serif | Hero/campaign title | `.type-page-title` | Vertical desktop, horizontal mobile | Refined |
| Hero | Lead text | Hero | Hero Lead | 4 | Secondary | Functional Sans | Campaign description | `.type-lead` | Hidden desktop in current K.UNO-style hero, available in markup | Needs future review |
| Brand Introduction | `Diamond Symphony` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Section label | `.type-section-eyebrow` | Small all viewport | Good |
| Brand Introduction | `鑽石應該被戴上，而不是被收藏。` | Section | Editorial Statement | 3 | Primary | Editorial Serif | Section title/brand statement | `.type-editorial-statement` | Should stay below Hero Title | Good |
| Brand Introduction | Intro paragraph | Section | Section Lead / Body | 5-6 | Secondary | Functional Sans | Body description | `.type-section-lead`, `.type-body` | Preserve readable Chinese line-height | Good |
| Recommendation | `人氣首選` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Section label | `.type-section-eyebrow` | Keep compact | Good |
| Recommendation | `Recommendation` | Section | Section Title | 3 | Primary | Editorial Serif | Large section heading | `.type-section-title` | Keep below Hero; centered is acceptable | Good |
| Recommendation | Product names | Card | Product Name / Card Title | 7 | Primary | Functional Sans | Campaign/card title | `.type-card-title` | In-frame hover only; no text scale hover | Good |
| Recommendation | Price | Card | Body Secondary | 8 | Muted | Functional Sans | Caption/supporting info | `.type-body-secondary` | Always lower than product name | Good |
| Knowledge Editorial | `Diamond Guide` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Section label | `.type-section-eyebrow` | Compact | Good |
| Knowledge Editorial | `知識與選購指南` | Section | Section Title | 3 | Primary | Editorial Serif | Section title | `.type-section-title` | Left-aligned DS editorial variant | Good |
| Knowledge Editorial | Article category | Card | Article Category | 8 | Muted | Functional Sans | Date/category caption | `.type-caption` | Do not enlarge | Good |
| Knowledge Editorial | Article title | Card | Article Title | 6-7 | Primary | Editorial Serif for featured, sans for standard | Column title | `.type-card-title-editorial`, `.type-card-title` | Featured title may be slightly stronger but below section title | Good |
| Featured Collections | `Featured Collections` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Section label | `.type-section-eyebrow` | Compact | Good |
| Featured Collections | `精選系列` | Section | Section Title | 3 | Primary | Editorial Serif | Section title | `.type-section-title` | Below Hero | Good |
| Featured Collections | Story product name | Group/Card | Heading Primary | 4 | Primary | Editorial Serif | Service/feature title | `.type-heading-primary` | Should not become page title | Good |
| Featured Collections | Story description | Group/Card | Body | 6 | Secondary | Functional Sans | Description | `.type-body` | Keep line-height generous | Good |
| Product Categories | `Collections` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Category section label | `.type-section-eyebrow` | Compact | Good |
| Product Categories | `商品分類與重點系列` | Section | Section Title | 3 | Primary | Editorial Serif | Category title | `.type-section-title` | Use DS title scale, not 4℃ 46px raw | Good |
| Product Categories | Category labels | Card | Card Title | 7 | Primary | Functional Sans | Category card title | `.type-card-title` | Keep consistent | Good |
| Product Categories | Product rail titles | Group | Heading Secondary | 5 | Primary | Functional Sans | Supporting block heading | `.type-heading-secondary` | Keep below section title | Good |
| Consultation CTA | `Private Appointment` | Section | Section Eyebrow | 5 | Muted | Functional Sans | Reservation label | `.type-section-eyebrow` | Compact | Good |
| Consultation CTA | CTA heading | Section | Section Title | 3 | Primary | Editorial Serif | Reservation title | `.type-section-title` | Supporting section should not feel heavier than product sections | Watch |
| Consultation CTA | Buttons | Component | Button | 9 | Primary | Functional Sans | Reservation CTA | `.type-button` | Focus and hover visible | Good |

## Profile Application Notes

- DS should borrow 4℃'s controlled serif title rhythm, not its all-serif UI.
- Homepage section titles should remain around DS token scale.
- English labels can use slightly wider tracking when they are decorative labels.
- Body text should remain Functional Sans for Traditional Chinese readability.
- Product cards should not adopt 4℃ campaign title scale.
- Mobile needs explicit hierarchy preservation: label, title, lead, image/content, CTA.

## Watch List

- Hero lead is hidden on desktop in the current K.UNO-inspired hero. If future accessibility/content review requires visible lead, use `.type-lead` below the vertical title or as a mobile-first text block.
- CTA section title can feel too strong if paired with large whitespace; keep supporting section spacing compact.
- Section title alignment should be intentional: centered for recommendation, left for editorial/content sections.
