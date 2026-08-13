import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const contentDir = path.join(root, 'src', 'content', 'knowledge');
const categoryMasterPath = path.join(root, 'data', 'migration', 'knowledge-category-master.json');
const outputJsonPath = path.join(root, 'output', 'knowledge-layout-audit.json');
const outputMdPath = path.join(root, 'docs', 'migration', 'KNOWLEDGE_LAYOUT_AUDIT.md');

const requiredFields = [
  'title',
  'description',
  'category',
  'publishDate',
  'coverImage',
  'coverImageAlt',
  'author',
  'tags',
  'featured',
  'draft',
  'seoTitle',
  'seoDescription',
  'canonicalUrl',
  'migrationStatus'
];

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, rawValue] = pair;
    let value = rawValue.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value === 'true') value = true;
    if (value === 'false') value = false;
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((item) => item.trim().replace(/^"|"$/g, ''))
        .filter(Boolean);
    }
    data[key] = value;
  }
  return data;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

await fs.mkdir(path.dirname(outputJsonPath), { recursive: true });
await fs.mkdir(path.dirname(outputMdPath), { recursive: true });

const categories = JSON.parse(await fs.readFile(categoryMasterPath, 'utf8'));
const categorySlugs = new Set(categories.map((category) => category.slug));
const files = (await fs.readdir(contentDir)).filter((file) => file.endsWith('.md'));
const articles = [];
const issues = [];

for (const file of files) {
  const fullPath = path.join(contentDir, file);
  const source = await fs.readFile(fullPath, 'utf8');
  const frontmatter = parseFrontmatter(source);
  const body = source.replace(/^---\r?\n[\s\S]*?\r?\n---/, '').trim();
  const missingFields = requiredFields.filter((field) => frontmatter[field] === undefined || frontmatter[field] === '');
  const imageIsRemote = /^https?:\/\//.test(frontmatter.coverImage ?? '');
  const imagePath = frontmatter.coverImage?.startsWith('/')
    ? path.join(root, 'public', frontmatter.coverImage)
    : undefined;
  const imageExists = imageIsRemote || (imagePath ? await fileExists(imagePath) : false);

  if (missingFields.length > 0) issues.push({ file, severity: 'major', message: `Missing frontmatter: ${missingFields.join(', ')}` });
  if (!categorySlugs.has(frontmatter.category)) issues.push({ file, severity: 'critical', message: `Unknown category: ${frontmatter.category}` });
  if (!imageExists) issues.push({ file, severity: 'major', message: `Cover image not found: ${frontmatter.coverImage}` });
  if (body.length < 300) issues.push({ file, severity: 'major', message: 'Article body is shorter than 300 characters.' });
  const slug = file.replace(/\.md$/, '');

  articles.push({
    file,
    title: frontmatter.title,
    slug,
    category: frontmatter.category,
    draft: frontmatter.draft,
    featured: frontmatter.featured,
    bodyCharacters: body.length,
    imageExists
  });
}

const publishedArticles = articles.filter((article) => article.draft !== true);
const draftArticles = articles.filter((article) => article.draft === true);
const counts = Object.fromEntries(categories.map((category) => [category.slug, publishedArticles.filter((article) => article.category === category.slug).length]));
const missingRouteFiles = [
  'src/pages/blogs/diamond-symphony-guide/index.astro',
  'src/pages/blogs/diamond-symphony-guide/page/[page].astro',
  'src/pages/blogs/diamond-symphony-guide/category/[category].astro',
  'src/pages/blogs/diamond-symphony-guide/[slug].astro',
  'src/components/knowledge/KnowledgeCategorySidebar.astro',
  'src/components/knowledge/KnowledgeCategoryMobileNav.astro'
];

for (const routeFile of missingRouteFiles) {
  if (!(await fileExists(path.join(root, routeFile)))) {
    issues.push({ file: routeFile, severity: 'critical', message: 'Required knowledge layout file is missing.' });
  }
}

const summary = {
  route: '/blogs/diamond-symphony-guide/',
  articleCount: articles.length,
  publishedArticleCount: publishedArticles.length,
  draftArticleCount: draftArticles.length,
  categoryCount: categories.length,
  counts,
  requiredRouteFiles: missingRouteFiles,
  issues,
  layoutStatus: issues.some((issue) => issue.severity === 'critical') ? 'needs-fix' : 'layout-complete',
  contentStatus: issues.some((issue) => issue.message.startsWith('Missing frontmatter')) ? 'needs-frontmatter-fix' : 'content-ready',
  mediaStatus: issues.some((issue) => issue.message.startsWith('Cover image not found')) ? 'needs-media-fix' : 'media-linked',
  routeStatus: issues.some((issue) => issue.message.includes('layout file is missing')) ? 'needs-route-fix' : 'routes-ready',
  overallStatus: issues.length === 0 ? 'fully-migrated' : 'layout-complete-with-notes'
};

const issueTable = issues.length
  ? issues.map((issue) => `| ${issue.severity} | ${issue.file} | ${issue.message} |`).join('\n')
  : '| - | - | No issues found. |';
const countTable = categories
  .map((category) => `| ${category.name} | ${category.slug} | ${counts[category.slug] ?? 0} | ${category.status} |`)
  .join('\n');

const markdown = `# Knowledge Layout Audit

Generated: ${new Date().toISOString()}

## Summary

| Item | Result |
| --- | --- |
| Route | ${summary.route} |
| Published articles | ${summary.publishedArticleCount} |
| Draft articles | ${summary.draftArticleCount} |
| Categories | ${summary.categoryCount} |
| Layout status | ${summary.layoutStatus} |
| Content status | ${summary.contentStatus} |
| Media status | ${summary.mediaStatus} |
| Route status | ${summary.routeStatus} |
| Overall status | ${summary.overallStatus} |

## Category Counts

| Category | Slug | Articles | Status |
| --- | --- | ---: | --- |
${countTable}

## Issues

| Severity | File | Message |
| --- | --- | --- |
${issueTable}
`;

await fs.writeFile(outputJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
await fs.writeFile(outputMdPath, markdown);

console.log(`Knowledge layout audit: ${summary.overallStatus}`);
console.log(`Articles: ${summary.publishedArticleCount} published, ${summary.draftArticleCount} draft`);
console.log(`Issues: ${issues.length}`);
