# Homepage Typography Redesign

Typography Hierarchy Agent review for the redesigned homepage.

## Design Direction

- Visual language: Japanese Corporate Editorial, Modern Luxury Minimal, Quiet Elegance.
- Layout goal: single clear hero, restrained section rhythm, refined jewelry presentation.
- Typography rule: editorial serif for hero and major storytelling; functional sans for body, navigation, product names, prices, labels, buttons.
- Implementation rule: use existing `.type-*` roles and typography tokens. Do not add arbitrary component font sizes.

## Section Hierarchy

| Section | Strength | Primary role | Supporting roles | Layout role |
| --- | --- | --- | --- | --- |
| Hero | Emphasis | Page Title | Eyebrow, Lead, Button, Card Title, Caption | One primary campaign plus two supporting campaign entries |
| Brand Intro | Standard | Editorial Statement | Eyebrow, Lead, Body, Button | Brand belief and supporting copy |
| Recommendation | Standard | Section Title | Eyebrow, Caption, Card Title, Body Secondary | Product showcase with one featured item and four supporting products |
| Collections | Emphasis | Section Title | Eyebrow, Body, Editorial Card Title, Caption | Editorial mosaic category wall |
| Signature Stories | Emphasis | Heading Primary | Eyebrow, Lead, Caption, Button | Full-width video product story |
| Modern Gent | Standard | Section Title | Eyebrow, Body, Card Title, Body Secondary | Horizontal product carousel |
| Loose Diamonds | Emphasis | Section Title | Eyebrow, Body, Button, Card Title, Body Secondary | Dark editorial product focus |
| Contact CTA | Supporting | Heading Primary | Eyebrow, Body, Button | Conversion panel |

## Typography QA

- Page H1: one hidden H1 remains inside the hero for SEO and accessibility.
- Hero title: one visible `.type-page-title`; former multiple hero slide titles were reduced to supporting campaign cards.
- Section titles: use `.type-section-title`; no Section Title is visually promoted to Page Title.
- Product names: remain `.type-card-title`; first recommendation product no longer receives a larger ad hoc title size.
- Category cards: use `.type-card-title-editorial`, lower than Section Title.
- Body, lead, captions, labels, and buttons: all use existing semantic roles.
- Component CSS: no arbitrary homepage font-size values for content text; only token-based decorative brand marker remains.

## Spacing QA

- Homepage spacing tokens added locally:
  - `--home-space-emphasis`
  - `--home-space-standard`
  - `--home-space-supporting`
  - `--home-grid-gap`
  - `--home-content-gap`
  - `--home-card-gap`
- Section spacing now follows Emphasis / Standard / Supporting strength.
- Grid and card gaps share consistent tokenized rhythm.

## Responsive QA Notes

- Desktop: hero uses a single primary story with supporting campaign cards; product and category sections have clear visual hierarchy.
- Tablet: two-column layouts collapse to one column; featured product grid becomes a horizontal product row.
- Mobile: hero text and supporting campaign cards stack within the first viewport without multiple Page Title roles.

