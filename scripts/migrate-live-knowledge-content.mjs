import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'output', 'live-knowledge-source', 'articles');
const contentDir = path.join(root, 'src', 'content', 'knowledge');
const categoryTsPath = path.join(root, 'src', 'data', 'knowledgeCategories.ts');
const categoryJsonPath = path.join(root, 'data', 'migration', 'knowledge-category-master.json');
const categoryDocPath = path.join(root, 'docs', 'migration', 'KNOWLEDGE_CATEGORY_MASTER.md');

const categoryMap = {
  'Proposal Guide': {
    categoryId: 'KCAT-001',
    name: 'Proposal Guide',
    slug: 'proposal-guide',
    description: '原站求婚選鑽文章，包含求婚戒、克拉、戒台、戒圍與訂製流程。',
    seoTitle: 'Proposal Guide｜鑽之韻知識學堂',
    seoDescription: '鑽之韻求婚選鑽指南，整理求婚戒、克拉、戒台、戒圍與訂製流程。'
  },
  'Proposal Guide｜求婚選鑽指南': {
    categoryId: 'KCAT-001',
    name: 'Proposal Guide',
    slug: 'proposal-guide',
    description: '原站求婚選鑽文章，包含求婚戒、克拉、戒台、戒圍與訂製流程。',
    seoTitle: 'Proposal Guide｜鑽之韻知識學堂',
    seoDescription: '鑽之韻求婚選鑽指南，整理求婚戒、克拉、戒台、戒圍與訂製流程。'
  },
  'Style Guide': {
    categoryId: 'KCAT-002',
    name: 'Style Guide',
    slug: 'style-guide',
    description: '原站風格挑選文章，包含黃鑽搭配、手型比例與預算風格選擇。',
    seoTitle: 'Style Guide｜鑽之韻知識學堂',
    seoDescription: '鑽之韻風格指南，整理黃鑽搭配、手型比例與鑽戒款式選擇。'
  },
  'Diamond Knowledge': {
    categoryId: 'KCAT-003',
    name: 'Diamond Knowledge',
    slug: 'diamond-knowledge',
    description: '原站鑽石知識文章，包含彩色鑽石、圓鑽、水滴型鑽石與切工火光。',
    seoTitle: 'Diamond Knowledge｜鑽之韻知識學堂',
    seoDescription: '鑽之韻鑽石知識，整理彩鑽、圓鑽、水滴型鑽石、切工與火光。'
  },
  'Diamond Guide': {
    categoryId: 'KCAT-004',
    name: 'Diamond Guide',
    slug: 'diamond-guide',
    description: '原站鑽石挑選指南，包含切工、彩鑽與天然鑽石、培育鑽石比較。',
    seoTitle: 'Diamond Guide｜鑽之韻知識學堂',
    seoDescription: '鑽之韻鑽石挑選指南，整理切工、彩鑽、天然鑽石與培育鑽石。'
  },
  'Jewelry Care': {
    categoryId: 'KCAT-005',
    name: 'Jewelry Care',
    slug: 'jewelry-care',
    description: '原站珠寶日常配戴與保養文章，包含水滴型鑽戒配戴注意事項。',
    seoTitle: 'Jewelry Care｜鑽之韻知識學堂',
    seoDescription: '鑽之韻珠寶保養指南，整理鑽戒日常配戴、清潔與維護注意事項。'
  },
  'Diamond Care Guide': {
    categoryId: 'KCAT-006',
    name: 'Diamond Care Guide',
    slug: 'diamond-care-guide',
    description: '原站鑽戒清潔與保養文章，包含居家清潔、日常維護與回店檢查。',
    seoTitle: 'Diamond Care Guide｜鑽之韻知識學堂',
    seoDescription: '鑽之韻鑽戒保養指南，整理鑽戒清潔、日常保養與檢修建議。'
  }
};

const fallbackCategory = categoryMap['Diamond Guide'];

function decodeEntities(value = '') {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, '•')
    .replace(/&rarr;/g, '→')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value = '') {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function yamlString(value = '') {
  return JSON.stringify(String(value));
}

function normalizeImage(src = '') {
  if (!src) return '/assets/knowledge/proposal-guide-cover.png';
  if (src.startsWith('//')) return `https:${src}`;
  return src;
}

function getMatch(html, regex) {
  return html.match(regex)?.[1]?.trim() ?? '';
}

function extractArticle(html, slug) {
  const pageTitle = stripTags(getMatch(html, /<title>([\s\S]*?)<\/title>/));
  const title = stripTags(getMatch(html, /<div class="article_title">[\s\S]*?<h1[^>]*>([\s\S]*?)<\/h1>/));
  const author = stripTags(getMatch(html, /<div class="article_author">[\s\S]*?<span>([^<]+)<\/span>/)) || 'singlehorns';
  const publishDate = stripTags(getMatch(html, /<div class="article_date">[\s\S]*?<span>([^<]+)<\/span>/));
  const content = getMatch(html, /<div id="ckeditor" class="article_content">[\s\S]*?<span class="ckeditor">([\s\S]*?)<\/span>\s*<\/div>/);
  const rawCategory = stripTags(getMatch(content, /class="ds-category"[^>]*>([\s\S]*?)<\/span>/));
  const category = categoryMap[rawCategory] ?? fallbackCategory;
  const coverImage = normalizeImage(getMatch(content, /<img[^>]+src="([^"]+)"/) || getMatch(html, /<meta property="og:image" content="([^"]+)"/));
  const description = stripTags(content)
    .replace(/^([A-Za-z ]+｜?[^ ]*)\s+/, '')
    .replace(/DIAMOND SYMPHONY\s*\?\s*JOURNAL/i, '')
    .slice(0, 155);
  const seoTitle = pageTitle.replace(/\s+/g, ' ').replace(/鑽之韻\s*$/, '').trim() || title;

  return {
    slug,
    title,
    description,
    categorySlug: category.slug,
    categoryName: category.name,
    publishDate,
    coverImage,
    coverImageAlt: title,
    author,
    seoTitle,
    seoDescription: description,
    content: content
      .replace(/<!-- 文案來源：[\s\S]*?-->/g, '')
      .replace(/:contentReference\[[^\]]+\]\{[^}]+\}/g, '')
      .trim()
  };
}

function renderMarkdown(article) {
  return `---
title: ${yamlString(article.title)}
description: ${yamlString(article.description)}
category: ${yamlString(article.categorySlug)}
subcategories: []
publishDate: ${article.publishDate}
updatedDate: ${article.publishDate}
coverImage: ${yamlString(article.coverImage)}
coverImageAlt: ${yamlString(article.coverImageAlt)}
author: ${yamlString(article.author)}
tags: [${yamlString(article.categoryName)}]
featured: false
draft: false
seoTitle: ${yamlString(article.seoTitle)}
seoDescription: ${yamlString(article.seoDescription)}
canonicalUrl: ${yamlString(`https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide/${article.slug}`)}
legacyUrl: ${yamlString(`https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide/${article.slug}`)}
legacySource: ${yamlString(`output/live-knowledge-source/articles/${article.slug}.html`)}
migrationStatus: "fully-migrated"
migrationNotes: "從原站文章 HTML 的 #ckeditor 主文區塊完整遷移。"
---

${article.content}
`;
}

await fs.mkdir(contentDir, { recursive: true });
const existing = await fs.readdir(contentDir);
await Promise.all(existing.filter((file) => file.endsWith('.md')).map((file) => fs.unlink(path.join(contentDir, file))));

const files = (await fs.readdir(sourceDir)).filter((file) => file.endsWith('.html')).sort();
const articles = [];
for (const file of files) {
  const slug = file.replace(/\.html$/, '');
  const html = await fs.readFile(path.join(sourceDir, file), 'utf8');
  const article = extractArticle(html, slug);
  articles.push(article);
  await fs.writeFile(path.join(contentDir, `${slug}.md`), renderMarkdown(article));
}

const categoryCounts = new Map();
for (const article of articles) categoryCounts.set(article.categorySlug, (categoryCounts.get(article.categorySlug) ?? 0) + 1);
const categories = [...new Map(Object.values(categoryMap).map((category) => [category.slug, category])).values()]
  .map((category, index) => ({
    ...category,
    displayOrder: index + 1,
    articleCount: categoryCounts.get(category.slug) ?? 0,
    legacyUrls: ['/blogs/diamond-symphony-guide'],
    source: 'Live original site article migration',
    status: 'active'
  }))
  .filter((category) => category.articleCount > 0);

const ts = `export type KnowledgeCategory = {
  categoryId: string;
  name: string;
  slug: string;
  description: string;
  legacyUrls: string[];
  displayOrder: number;
  articleCount: number;
  seoTitle: string;
  seoDescription: string;
  source: string;
  status: 'active' | 'inactive';
};

export const knowledgeCategories: KnowledgeCategory[] = ${JSON.stringify(categories, null, 2)} as KnowledgeCategory[];

export const knowledgeHome = {
  title: '鑽之韻知識學堂',
  description: '以原站文章內容整理鑽石知識、求婚選鑽、風格挑選與珠寶保養指南。',
  seoTitle: '鑽之韻知識學堂｜鑽石、求婚戒指與珠寶保養指南',
  seoDescription: '鑽之韻知識學堂完整收錄原站鑽石知識、求婚選鑽、風格指南與珠寶保養文章。'
};

export function getKnowledgeCategory(slug: string) {
  return knowledgeCategories.find((category) => category.slug === slug);
}

export function getKnowledgeCategoryName(slug: string) {
  return getKnowledgeCategory(slug)?.name ?? slug;
}
`;
await fs.writeFile(categoryTsPath, ts);
await fs.writeFile(categoryJsonPath, `${JSON.stringify(categories, null, 2)}\n`);

const rows = categories.map((category) => `| ${category.categoryId} | ${category.name} | ${category.slug} | ${category.articleCount} | ${category.status} |`).join('\n');
await fs.writeFile(categoryDocPath, `# Knowledge Category Master

此分類表依原站文章分類重建，文章內容來源為原站文章頁 HTML 的主文區塊。

| categoryId | name | slug | articles | status |
| --- | --- | --- | ---: | --- |
${rows}

總文章數：${articles.length}
`);

console.log(`Migrated ${articles.length} knowledge articles.`);
console.log(categories.map((category) => `${category.name}: ${category.articleCount}`).join('\n'));
