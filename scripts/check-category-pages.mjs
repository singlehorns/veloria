import fs from 'node:fs';

const expectedPages = {
  'womens-diamond-rings': 68,
  'womens-diamond-rings/engagement-rings': 29,
  'womens-diamond-rings/classic-womens-rings': 72,
  'womens-diamond-rings/fortune-womens-rings': 6,
  'mens-diamond-rings': 25,
  'mens-diamond-rings/classic-mens-rings': 17,
  'mens-diamond-rings/fortune-mens-rings': 6,
  'other-jewelry': 23,
  'other-jewelry/necklaces': 15,
  'other-jewelry/earrings': 7,
  'other-jewelry/bracelets': 1,
  'other-jewelry/pair-rings': 7,
  'colored-diamonds': 24,
  'colored-diamonds/yellow-diamonds': 9,
  'colored-diamonds/pink-diamonds': 17,
  'colored-diamonds/blue-diamonds': 5,
  'colored-diamonds/red-diamonds': 0,
  'colored-diamonds/green-diamonds': 0,
  'colored-diamonds/other-color-diamonds': 0,
  'loose-diamonds': 10
};

let hasFailure = false;
const directLinkPages = new Set(['womens-diamond-rings/engagement-rings', 'other-jewelry/pair-rings', 'loose-diamonds']);

for (const [page, expectedCount] of Object.entries(expectedPages)) {
  const html = fs.readFileSync(`dist/categories/${page}/index.html`, 'utf8');
  const count = Number(html.match(/共\s*(\d+)\s*件商品/)?.[1] ?? Number.NaN);
  const openCount = html.match(/<details class="menu-group" open/g)?.length ?? 0;
  const hasExtraAll = /全部(?:女士鑽戒|男士鑽戒|時尚珠寶|彩色鑽石專區)/.test(html);
  const expectedOpenCount = directLinkPages.has(page) ? 0 : 1;
  const passed = count === expectedCount && openCount === expectedOpenCount && !hasExtraAll;

  if (!passed) hasFailure = true;

  console.log(
    [
      passed ? 'OK' : 'FAIL',
      page,
      `count=${count}/${expectedCount}`,
      `open=${openCount}/${expectedOpenCount}`,
      `extraAll=${hasExtraAll}`
    ].join('\t')
  );
}

if (hasFailure) process.exit(1);
