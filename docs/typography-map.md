# Typography Map

This file maps current components to the official typography roles. Do not treat HTML tags as visual roles; use role classes/tokens when a section is migrated.

## Component Mapping

| Component | Current text | Scope | Role | Level | Tone | Target class |
| --- | --- | --- | --- | --- | --- | --- |
| `SiteHeader` brand | Logo text | Site | Navigation | 13 | Primary | `.type-navigation` |
| `SiteHeader` main nav | Top-level links | Component | Navigation | 13 | Secondary | `.type-navigation` |
| `SiteHeader` mega trigger | Dropdown parent | Component | Navigation | 13 | Primary | `.type-navigation` |
| `SiteHeader` mega child | Dropdown child | Component | Navigation | 14 | Muted | `.type-caption` or scoped nav secondary |
| `SiteFooter` heading | Site name | Site | Group Title | 6 | Inverse | `.type-group-title` in inverse context |
| `ProductGrid` title | Catalog title | Page/Section | Page Title or Section Title | 2/3 | Primary | `.type-page-title` or `.type-section-title` |
| `ProductGrid` tools | Sort/filter/view controls | Component | Button/Label | 14/12 | Primary/Muted | `.type-button`, `.type-caption` |
| `ProductCard` name | Product name | Card | Card Title | 7 | Primary | `.type-card-title` |
| `ProductCard` price | Product price | Card | Body Secondary | 10 | Muted | `.type-body-secondary` |
| `ProductCategorySidebar` parent | Primary category | Component | Navigation | 13 | Primary | `.type-navigation` |
| `ProductCategorySidebar` child | Subcategory | Component | Navigation | 14 | Secondary | `.type-caption` or scoped nav secondary |
| `KnowledgeArticleCard` title | Article card title | Card | Card Title | 7 | Primary | `.type-card-title` |
| `KnowledgeArticleCard` description | Article excerpt | Card | Body Secondary | 10 | Muted | `.type-body-secondary` |
| `KnowledgeArticleCard` date | Date | Card | Caption | 11 | Muted | `.type-caption` |
| `KnowledgeCategorySidebar` title | Sidebar title | Group | Group Title | 6 | Secondary | `.type-group-title` |
| `FormalContentPage` header title | Page title | Page | Page Title | 2 | Primary | `.type-page-title` |
| `FormalContentPage` block title | Content block heading | Section | Section Heading Secondary | 5 | Primary | `.type-heading-secondary` |
| `ContactCTA` heading | CTA title | Section | Section Heading Secondary | 5 | Primary | `.type-heading-secondary` |

## Homepage Dual-Font Mapping

| Section | Text role | Family | Token/class | Notes |
| --- | --- | --- | --- | --- |
| Banner | Unique H1 | Editorial Serif | `.type-page-title` semantics, visually hidden | SEO/page title lives in the banner but is not visually displayed |
| Brand Intro | Eyebrow | Functional Sans | `.type-section-eyebrow` | Label only |
| Brand Intro | Main brand statement | Editorial Serif | `.type-heading-primary` using `--type-editorial-statement-size` | Visible highest homepage statement below hidden H1 |
| Brand Intro | Lead/body/CTA | Functional Sans | `.type-lead`, `.type-body`, `.type-button` | Reading and action text |
| Recommendation | Section title | Editorial Serif | `.type-section-title` using `--type-editorial-section-title-size` | Below page title; matches article editorial rhythm |
| Recommendation | Product names/prices | Functional Sans | `.type-card-title`, `.type-body-secondary` | Product cards remain shopping UI |
| Feature Videos | Product story heading | Editorial Serif | `.type-heading-primary` using `--type-editorial-statement-size` | Important product-story statement |
| Feature Videos | Description/button | Functional Sans | `.type-body`, `.type-button` | Body and CTA |
| Brand Panel | Highlight sentence | Editorial Serif | `.type-quote-title` sizing | Short editorial brand highlight |
| Brand Panel | Paragraphs/button | Functional Sans | `.type-body`, `.type-button` | Supporting copy |
| Modern Gent | Section title | Editorial Serif | `.type-section-title` using `--type-editorial-section-title-size` | Carousel title |
| Modern Gent | Product names/prices | Functional Sans | `.type-card-title`, `.type-body-secondary` | Product cards remain sans |
| Collections | Card labels | Functional Sans | `.type-card-title` | Functional navigation cards, not editorial cards |
| Selected Loose Diamonds | Section title | Editorial Serif | `.type-section-title` using `--type-editorial-section-title-size` | Carousel title |
| Contact CTA | Heading/actions | Functional Sans | `.type-heading-secondary`, `.type-button` | Supporting utility section |

## Natural Language To Token

| Request wording | Use role |
| --- | --- |
| 主標、頁面標題、最高標題 | Page Title |
| 首屏品牌大字、形象主標 | Brand Display |
| 區塊小字、上方分類字 | Section Eyebrow / Label |
| 區塊標題 | Section Title |
| 區塊說明、導讀 | Section Lead |
| 區塊內大標 | Section Heading Primary |
| 區塊內小標 | Section Heading Secondary |
| 一組內容的標題 | Group Title |
| 商品名、文章卡標題、分類卡標題 | Card Title |
| 價格、日期、數量、輔助說明 | Body Secondary / Caption |
| 連結選單、側邊分類 | Navigation |
| CTA、工具按鈕 | Button |
