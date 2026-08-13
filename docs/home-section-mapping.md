# Diamond Symphony Home Section Mapping

## Current Section Map

1. Hero
   - Pattern: Brand Feature Split
   - Strength: Emphasis
   - Highest semantic heading: H1, visually hidden for SEO
   - Visible title role: Hero Title
   - Lead role: Hero Lead, visually suppressed on desktop hero to keep K.UNO-style vertical focus
   - CTA: Primary and secondary links retained in markup

2. Brand Introduction
   - Pattern: Brand Feature Split
   - Strength: Standard
   - English Label: Section Eyebrow
   - Chinese Title: Editorial Statement
   - Body: Section Lead and Body
   - CTA: Text Link

3. Recommendation
   - Pattern: Product Selection
   - Strength: Standard
   - English/Chinese Label: Section Eyebrow
   - Section Title: Section Title
   - Product Name: Card Title
   - Price: Body Secondary
   - Interaction: Arrow controls, mouse drag, in-frame image scale

4. Knowledge Editorial
   - Pattern: Editorial List
   - Strength: Standard
   - English Label: Section Eyebrow
   - Chinese Title: Section Title
   - Lead: Section Lead
   - Article Title: Card Title / Editorial Card Title
   - Article Description: Body Secondary

5. Featured Collections
   - Pattern: Brand Feature Split / Product Story
   - Strength: Emphasis
   - English Label: Section Eyebrow
   - Chinese Title: Section Title
   - Story Heading: Heading Primary
   - Story Body: Body
   - CTA: Button/Text Link role

6. Product Categories
   - Pattern: Collection Grid and Product Selection
   - Strength: Standard
   - English Label: Section Eyebrow
   - Chinese Title: Section Title
   - Category Title: Card Title
   - Category English: Caption
   - Product Rail Title: Heading Secondary
   - Product Name: Card Title
   - Price: Body Secondary

7. Consultation CTA
   - Pattern: Service / Reservation
   - Strength: Supporting
   - English Label: Section Eyebrow
   - CTA Title: Section Title
   - Lead: Section Lead
   - Buttons: Button

## Typography Tokens Used

- Hero Title: `type-page-title`
- Section Eyebrow: `type-section-eyebrow`
- Section Title: `type-section-title`
- Section Lead: `type-section-lead`
- Editorial Statement: `type-editorial-statement`
- Heading Primary: `type-heading-primary`
- Heading Secondary: `type-heading-secondary`
- Card Title: `type-card-title`
- Editorial Card Title: `type-card-title-editorial`
- Body: `type-body`
- Body Secondary: `type-body-secondary`
- Caption: `type-caption`
- Button: `type-button`

## Responsive Reading Order

- Desktop: centered header, nav row, left-weighted hero image, vertical hero message, then aligned content sections.
- Tablet: hero image becomes full-width background, vertical message remains readable, product and story grids reduce columns.
- Mobile: hero message changes to horizontal text blocks, controls are hidden, every section reads top to bottom as label, title, lead, media/content, CTA.
