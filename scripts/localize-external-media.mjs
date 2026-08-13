import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const staticReplacements = new Map([
  [
    'https://v.cyberbiz.tw/s/33338/ab9f310c8b1429a59353e3445ef3b965.mp4?t=1752386460',
    '/assets/migrated/legacy-media/ab9f310c8b1429a59353e3445ef3b965.mp4',
  ],
  [
    'https://images.unsplash.com/photo-1602752250015-52934bc45613',
    '/assets/knowledge/covers/natural-vs-lab-grown-diamond.png',
  ],
  [
    'https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide/pear-shaped-diamond-ring-hand-shape',
    '/blogs/diamond-symphony-guide/pear-shaped-diamond-ring-hand-shape/',
  ],
  [
    'https://www.dsdiamond.com.tw/zh-TW/blogs/diamond-symphony-guide/pear-shaped-diamond-guide',
    '/blogs/diamond-symphony-guide/pear-shaped-diamond-guide/',
  ],
  [
    'https://www.dsdiamond.com.tw/zh-TW/products/arc-contour-engagement-ring',
    '/products/arc-contour/',
  ],
  [
    'https://www.dsdiamond.com.tw/zh-TW/products/%E5%A5%B3%E6%88%9236',
    '/products/blush-teardrop/',
  ],
  [
    'https://www.dsdiamond.com.tw/zh-TW/products/%E7%B9%86%E6%80%9D%E4%B9%8B%E6%BB%B4%EF%BD%9Cmuse-drop',
    '/products/lune-drop/',
  ],
  [
    'https://www.dsdiamond.com.tw/zh-TW/products/pear-lumiere-bloom-designer-diamond-ring',
    '/products/pear-lumiere-bloom/',
  ],
]);

const mediaReplacements = new Map([
  [
    /https:\/\/cdn-(?:general|next)\.cybassets\.com\/media\/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzc3Mzg3NzIwXzAwMDAuanBnLmpwZWciXV0\.jpeg\?sha=3c7922d414f01ab9/g,
    null,
  ],
  [
    /https:\/\/cdn-(?:general|next)\.cybassets\.com\/media\/W1siZiIsIjMzMzM4L3Byb2R1Y3RzLzY0NzM2NjgxLzE3NjgyMjU4MjlfYWMzYTM4NmU5M2QwNDM4YmZmOWEuanBlZyJdLFsicCIsInRodW1iIiwiNjAweDYwMCJdXQ\.jpeg\?sha=d1f3f3168596208e/g,
    '/assets/migrated/products/DSP-0029-arc-contour/localized/DSP-0029-main-01.jpeg',
  ],
  [
    /https:\/\/cdn-(?:general|next)\.cybassets\.com\/media\/W1siZiIsIjMzMzM4L3Byb2R1Y3RzLzU3MzM3MDUyLzE3NTIwMzUzNjRfY2MxMDczZDc2ZTYzNjk2MTQ3ZjMucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d\.png\?sha=3e90f718b725d32b/g,
    '/assets/migrated/products/DSP-0062-blush-teardrop/localized/DSP-0062-main-01.png',
  ],
  [
    /https:\/\/cdn-(?:general|next)\.cybassets\.com\/media\/W1siZiIsIjMzMzM4L3Byb2R1Y3RzLzU5MDY5MzQ2LzE3NTgwOTkyNDVfYTU5YzI0NmNkOTllN2RlM2NlMmMucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d\.png\?sha=586cb2008c61252c/g,
    '/assets/migrated/products/DSP-0070-lune-drop/localized/DSP-0070-main-01.png',
  ],
  [
    /https:\/\/cdn-(?:general|next)\.cybassets\.com\/media\/W1siZiIsIjMzMzM4L3Byb2R1Y3RzLzU4MzIzNTk0LzE3NTUxNTYxMjhfYzZiYjhiMGE4YmYxNDZmYmY1OGIucG5nIl0sWyJwIiwidGh1bWIiLCI2MDB4NjAwIl1d\.png\?sha=8eec2800b8ff0e93/g,
    '/assets/migrated/products/DSF0042-pear-lumiere-bloom/localized/DSF0042-main-01.png',
  ],
]);

function filesIn(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return filesIn(fullPath);
    return [fullPath];
  });
}

function articleCoverPath(filePath) {
  const slug = path.basename(filePath, '.md');
  const assetPath = `/assets/knowledge/covers/${slug}.png`;
  return existsSync(path.join(root, 'public', assetPath)) ? assetPath : '/assets/banners/brand-hero-diamond-symphony.jpeg';
}

const targets = [
  path.join(root, 'src', 'components', 'home', 'HomePage.astro'),
  ...filesIn(path.join(root, 'src', 'content', 'knowledge')).filter((file) => file.endsWith('.md')),
];

const report = [];

for (const target of targets) {
  const before = readFileSync(target, 'utf8');
  let after = before;
  const relativePath = path.relative(root, target).replaceAll(path.sep, '/');
  const localCover = articleCoverPath(target);

  for (const [from, to] of staticReplacements) {
    if (after.includes(from)) {
      after = after.split(from).join(to);
      report.push(`${relativePath}\t${from}\t${to}`);
    }
  }

  for (const [from, to] of mediaReplacements) {
    const replacement = to ?? localCover;
    if (from.test(after)) {
      after = after.replace(from, replacement);
      report.push(`${relativePath}\t${from.source}\t${replacement}`);
    }
  }

  if (after !== before) {
    writeFileSync(target, after);
  }
}

console.log(report.join('\n'));
