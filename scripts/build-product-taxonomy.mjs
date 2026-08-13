import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const productsDir = join(root, 'src/content/products');
const migrationDir = join(root, 'data/migration');
const docsMigrationDir = join(root, '..', 'docs/migration');
const outputDir = join(root, 'output');

mkdirSync(migrationDir, { recursive: true });
mkdirSync(docsMigrationDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

const taxonomySeed = [
  ['primary-womens-diamond-rings', '女士鑽戒', 'Womens Diamond Rings', 'womens-diamond-rings', 'primary-category', '', 10, '為女性配戴情境整理的求婚、經典與轉運戒款。', '/assets/migrated/collections/womens-ring.jpeg', ['/collections/ring-female', '/collections/經典女戒', '/collections/轉運女戒']],
  ['primary-mens-diamond-rings', '男士鑽戒', 'Mens Diamond Rings', 'mens-diamond-rings', 'primary-category', '', 20, '以俐落比例、戒寬與日常佩戴穩定度為主的男士戒款。', '/assets/migrated/collections/mens-ring.jpeg', ['/collections/ring-man', '/collections/經典男戒', '/collections/轉運男戒']],
  ['primary-colored-diamonds', '彩鑽', 'Colored Diamonds', 'colored-diamonds', 'primary-category', '', 30, '依彩鑽色系與稀有度整理黃鑽、粉鑽、紅鑽、藍鑽、綠鑽與其他彩鑽。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/彩色鑽石專區', '/collections/黃鑽', '/collections/粉鑽', '/collections/紅鑽', '/collections/藍鑽', '/collections/綠鑽', '/collections/其他彩鑽']],
  ['primary-loose-diamonds', '裸鑽', 'Loose Diamonds', 'loose-diamonds', 'primary-category', '', 40, '以 4C、證書、形狀與用途整理的裸鑽挑選入口。', '/assets/migrated/collections/loose-diamond.jpeg', ['/collections/diamond']],
  ['primary-other-jewelry', '其他珠寶分類', 'Other Jewelry', 'other-jewelry', 'primary-category', '', 50, '戒指以外的項鍊、耳環、手鍊、對戒與特殊珠寶分類。', '/assets/migrated/collections/necklace.jpeg', ['/collections/necklace', '/collections/earring', '/collections/bracelet', '/collections/pair-ring']],
  ['sub-engagement-rings', '求婚鑽戒', 'Engagement Rings', 'engagement-rings', 'subcategory', 'primary-womens-diamond-rings', 11, '求婚、訂婚與承諾情境使用的鑽戒。', '/assets/migrated/collections/proposal-ring.jpeg', ['/collections/求婚']],
  ['sub-classic-womens-rings', '經典女戒', 'Classic Womens Rings', 'classic-womens-rings', 'subcategory', 'primary-womens-diamond-rings', 12, '經典比例與日常配戴取向的女戒。', '/assets/migrated/collections/womens-ring.jpeg', ['/collections/經典女戒', '/collections/ring-female']],
  ['sub-fortune-womens-rings', '轉運女戒', 'Fortune Womens Rings', 'fortune-womens-rings', 'subcategory', 'primary-womens-diamond-rings', 13, '以轉運、護身與象徵寓意為主的女戒。', '/assets/migrated/collections/womens-ring.jpeg', ['/collections/轉運女戒']],
  ['sub-classic-mens-rings', '經典男戒', 'Classic Mens Rings', 'classic-mens-rings', 'subcategory', 'primary-mens-diamond-rings', 21, '經典比例與日常配戴取向的男戒。', '/assets/migrated/collections/mens-ring.jpeg', ['/collections/經典男戒', '/collections/ring-man']],
  ['sub-fortune-mens-rings', '轉運男戒', 'Fortune Mens Rings', 'fortune-mens-rings', 'subcategory', 'primary-mens-diamond-rings', 22, '以轉運、護身與象徵寓意為主的男戒。', '/assets/migrated/collections/mens-ring.jpeg', ['/collections/轉運男戒']],
  ['sub-yellow-diamonds', '黃鑽', 'Yellow Diamonds', 'yellow-diamonds', 'subcategory', 'primary-colored-diamonds', 31, '黃色系彩鑽與相關珠寶。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/黃鑽']],
  ['sub-pink-diamonds', '粉鑽', 'Pink Diamonds', 'pink-diamonds', 'subcategory', 'primary-colored-diamonds', 32, '粉色系彩鑽與相關珠寶。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/粉鑽']],
  ['sub-red-diamonds', '紅鑽', 'Red Diamonds', 'red-diamonds', 'subcategory', 'primary-colored-diamonds', 33, '紅色系彩鑽與相關珠寶。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/紅鑽']],
  ['sub-blue-diamonds', '藍鑽', 'Blue Diamonds', 'blue-diamonds', 'subcategory', 'primary-colored-diamonds', 34, '藍色系彩鑽與相關珠寶。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/藍鑽']],
  ['sub-green-diamonds', '綠鑽', 'Green Diamonds', 'green-diamonds', 'subcategory', 'primary-colored-diamonds', 35, '綠色系彩鑽與相關珠寶。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/綠鑽']],
  ['sub-other-color-diamonds', '其他彩鑽', 'Other Color Diamonds', 'other-color-diamonds', 'subcategory', 'primary-colored-diamonds', 36, '其他色系或需人工確認色彩分類的彩鑽。', '/assets/jewelry/celestial-bloom-ring.jpeg', ['/collections/其他彩鑽']],
  ['sub-necklaces', '項鍊', 'Necklaces', 'necklaces', 'subcategory', 'primary-other-jewelry', 51, '項鍊與墜飾類珠寶。', '/assets/migrated/collections/necklace.jpeg', ['/collections/necklace']],
  ['sub-earrings', '耳環', 'Earrings', 'earrings', 'subcategory', 'primary-other-jewelry', 52, '耳環、耳釘與成對配戴珠寶。', '/assets/migrated/collections/wedding-ring.jpeg', ['/collections/earring']],
  ['sub-bracelets', '手鍊', 'Bracelets', 'bracelets', 'subcategory', 'primary-other-jewelry', 53, '手鍊與手部配戴珠寶。', '/assets/migrated/collections/wedding-ring.jpeg', ['/collections/bracelet']],
  ['sub-pair-rings', '對戒', 'Pair Rings', 'pair-rings', 'subcategory', 'primary-other-jewelry', 54, '伴侶對戒與雙人配戴系列。', '/assets/migrated/collections/wedding-ring.jpeg', ['/collections/pair-ring']],
  ['type-ring', '戒指', 'Ring', 'ring', 'product-type', '', 101, '戒指型商品。', '/assets/migrated/collections/womens-ring.jpeg', []],
  ['type-necklace', '項鍊', 'Necklace', 'necklace', 'product-type', '', 102, '項鍊型商品。', '/assets/migrated/collections/necklace.jpeg', []],
  ['type-earring', '耳環', 'Earring', 'earring', 'product-type', '', 103, '耳環型商品。', '/assets/migrated/collections/wedding-ring.jpeg', []],
  ['type-bracelet', '手鍊', 'Bracelet', 'bracelet', 'product-type', '', 104, '手鍊型商品。', '/assets/migrated/collections/wedding-ring.jpeg', []],
  ['type-loose-diamond', '裸鑽', 'Loose Diamond', 'loose-diamond', 'product-type', '', 105, '裸鑽型商品。', '/assets/migrated/collections/loose-diamond.jpeg', []],
  ['audience-women', '女性', 'Women', 'women', 'audience', '', 201, '主要面向女性配戴者。', '', []],
  ['audience-men', '男性', 'Men', 'men', 'audience', '', 202, '主要面向男性配戴者。', '', []],
  ['audience-couple', '伴侶', 'Couple', 'couple', 'audience', '', 203, '伴侶、對戒或雙人配戴情境。', '', []],
  ['audience-unisex', '不限性別', 'Unisex', 'unisex', 'audience', '', 204, '不限性別或需人工確認的配戴情境。', '', []],
  ['diamond-natural', '天然鑽石', 'Natural Diamond', 'natural-diamond', 'diamond-type', '', 301, '天然鑽石。', '', []],
  ['diamond-colored', '彩色鑽石', 'Colored Diamond', 'colored-diamond', 'diamond-type', '', 302, '彩色鑽石。', '', []],
  ['shape-round', '圓形', 'Round', 'round', 'stone-shape', '', 401, '圓形明亮式切工或需以圓形歸類的資料。', '', []],
  ['legacy-unresolved', '待人工確認', 'Needs Review', 'unresolved', 'legacy-only', '', 999, '舊資料不足或編碼損壞，需要後續人工確認。', '', []]
];

const taxonomy = taxonomySeed.map(([taxonomyId, name, englishName, slug, categoryType, parentTaxonomyId, displayOrder, description, heroImage, legacyUrls]) => ({
  taxonomyId,
  name,
  englishName,
  slug,
  legacyUrls,
  level: parentTaxonomyId ? 2 : categoryType === 'primary-category' ? 1 : 3,
  parentTaxonomyId,
  categoryType,
  displayOrder,
  description,
  heroImage,
  seoTitle: `${name} | 鑽之韻 DIAMOND SYMPHONY`,
  seoDescription: description,
  productCount: 0,
  sourceFiles: ['dsdiamond_backup/migration/routes.json', 'diamond-symphony-astro/data/migration/product-master.json'],
  migrationStatus: 'created-from-legacy-taxonomy',
  notes: ''
}));

const bySlug = Object.fromEntries(taxonomy.map((item) => [item.slug, item]));

function has(product, needle) {
  return JSON.stringify(product).toLowerCase().includes(needle.toLowerCase());
}

function classify(product) {
  const collections = new Set([product.collection, product.category, ...(product.collections || [])].filter(Boolean).map(String));
  const text = [...collections, product.slug, product.englishName, product.originalDisplayName, product.productType].join(' ').toLowerCase();
  let primaryCategory = 'other-jewelry';
  let subcategories = [];
  let audience = 'unisex';
  let productType = product.productType || 'ring';
  let diamondType = 'natural-diamond';
  let diamondShape = product.diamondShape || product.shape || '';
  let status = 'partially-confirmed';

  if (text.includes('ring-female') || has(product, '經典女戒') || has(product, '轉運女戒')) {
    primaryCategory = 'womens-diamond-rings';
    audience = 'women';
    subcategories.push(text.includes('轉運') || text.includes('fortune') ? 'fortune-womens-rings' : 'classic-womens-rings');
    productType = 'ring';
    status = 'confirmed';
  }

  if (text.includes('ring-man') || has(product, '經典男戒') || has(product, '轉運男戒')) {
    primaryCategory = 'mens-diamond-rings';
    audience = 'men';
    subcategories.push(text.includes('轉運') || text.includes('fortune') ? 'fortune-mens-rings' : 'classic-mens-rings');
    productType = 'ring';
    status = 'confirmed';
  }

  if (text.includes('proposal') || has(product, '求婚')) {
    primaryCategory = 'womens-diamond-rings';
    audience = 'women';
    subcategories.push('engagement-rings');
    productType = 'ring';
    status = 'confirmed';
  }

  if (text.includes('pair-ring')) {
    primaryCategory = 'other-jewelry';
    audience = 'couple';
    subcategories.push('pair-rings');
    productType = 'ring';
    status = 'confirmed';
  }

  if (text.includes('necklace')) {
    primaryCategory = 'other-jewelry';
    subcategories.push('necklaces');
    productType = 'necklace';
    status = 'confirmed';
  }

  if (text.includes('earring')) {
    primaryCategory = 'other-jewelry';
    subcategories.push('earrings');
    productType = 'earring';
    status = 'confirmed';
  }

  if (text.includes('bracelet')) {
    primaryCategory = 'other-jewelry';
    subcategories.push('bracelets');
    productType = 'bracelet';
    status = 'confirmed';
  }

  if (text.includes('diamond') || has(product, '裸鑽')) {
    primaryCategory = 'loose-diamonds';
    subcategories.push('loose-diamonds');
    productType = 'loose-diamond';
    status = 'partially-confirmed';
  }

  const colorRules = [
    ['黃鑽', 'yellow-diamonds'],
    ['粉鑽', 'pink-diamonds'],
    ['紅鑽', 'red-diamonds'],
    ['藍鑽', 'blue-diamonds'],
    ['綠鑽', 'green-diamonds'],
    ['其他彩鑽', 'other-color-diamonds'],
    ['彩色鑽石', 'other-color-diamonds']
  ];

  for (const [needle, subcategory] of colorRules) {
    if (has(product, needle)) {
      primaryCategory = 'colored-diamonds';
      subcategories.push(subcategory);
      diamondType = 'colored-diamond';
      status = 'confirmed';
    }
  }

  if (!subcategories.length) {
    subcategories.push('unresolved');
    status = 'unresolved';
  }

  return {
    primaryCategory,
    subcategories: [...new Set(subcategories)],
    productType,
    collection: product.collection || '',
    audience,
    diamondType,
    diamondShape,
    tags: [...new Set([primaryCategory, ...subcategories, productType, audience, diamondType].filter(Boolean))],
    legacyCategoryUrls: [...new Set((product.legacyUrls || []).map((url) => {
      try {
        return new URL(url).pathname;
      } catch {
        return url;
      }
    }))],
    taxonomyStatus: status,
    taxonomyNotes: status === 'unresolved'
      ? 'Legacy category evidence was not enough for a confident taxonomy assignment.'
      : 'Assigned mechanically from legacy collection/category strings and product route evidence.'
  };
}

const files = readdirSync(productsDir).filter((file) => file.endsWith('.json'));
const mappings = [];

for (const file of files) {
  const path = join(productsDir, file);
  const product = JSON.parse(readFileSync(path, 'utf8'));
  const assigned = classify(product);
  const updated = { ...product, ...assigned };
  writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
  mappings.push({
    productId: product.legacyProductId || product.slug,
    productName: product.originalDisplayName || product.name,
    slug: product.slug,
    originalUrl: product.originalUrl || product.canonicalUrl || '',
    primaryCategory: assigned.primaryCategory,
    subcategories: assigned.subcategories,
    productType: assigned.productType,
    collection: assigned.collection,
    audience: assigned.audience,
    diamondType: assigned.diamondType,
    taxonomyStatus: assigned.taxonomyStatus,
    notes: assigned.taxonomyNotes
  });
}

for (const mapping of mappings) {
  for (const slug of [mapping.primaryCategory, ...mapping.subcategories, mapping.productType, mapping.audience, mapping.diamondType]) {
    if (bySlug[slug]) bySlug[slug].productCount += 1;
  }
}

function csvEscape(value) {
  const string = Array.isArray(value) ? value.join('|') : String(value ?? '');
  return `"${string.replaceAll('"', '""')}"`;
}

function writeCsv(path, rows, columns) {
  const content = [columns.join(','), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(','))].join('\n');
  writeFileSync(path, `${content}\n`);
}

writeFileSync(join(migrationDir, 'product-taxonomy-master.json'), `${JSON.stringify(taxonomy, null, 2)}\n`);
writeCsv(join(migrationDir, 'product-taxonomy-master.csv'), taxonomy, ['taxonomyId', 'name', 'englishName', 'slug', 'legacyUrls', 'level', 'parentTaxonomyId', 'categoryType', 'displayOrder', 'description', 'heroImage', 'seoTitle', 'seoDescription', 'productCount', 'sourceFiles', 'migrationStatus', 'notes']);
writeFileSync(join(migrationDir, 'product-taxonomy-mapping.json'), `${JSON.stringify(mappings, null, 2)}\n`);
writeCsv(join(migrationDir, 'product-taxonomy-mapping.csv'), mappings, ['productId', 'productName', 'slug', 'originalUrl', 'primaryCategory', 'subcategories', 'productType', 'collection', 'audience', 'diamondType', 'taxonomyStatus', 'notes']);

const audit = {
  generatedAt: new Date().toISOString(),
  productCount: mappings.length,
  taxonomyCount: taxonomy.length,
  statusCounts: mappings.reduce((acc, item) => {
    acc[item.taxonomyStatus] = (acc[item.taxonomyStatus] || 0) + 1;
    return acc;
  }, {}),
  primaryCategoryCounts: mappings.reduce((acc, item) => {
    acc[item.primaryCategory] = (acc[item.primaryCategory] || 0) + 1;
    return acc;
  }, {}),
  critical: [],
  major: mappings.filter((item) => item.taxonomyStatus === 'unresolved').map((item) => ({ productId: item.productId, slug: item.slug, issue: 'taxonomy unresolved' })),
  minor: mappings.filter((item) => item.taxonomyStatus === 'partially-confirmed').map((item) => ({ productId: item.productId, slug: item.slug, issue: 'taxonomy partially confirmed' }))
};

writeFileSync(join(outputDir, 'product-taxonomy-audit.json'), `${JSON.stringify(audit, null, 2)}\n`);

writeFileSync(join(docsMigrationDir, 'PRODUCT_TAXONOMY_MASTER.md'), `# Product Taxonomy Master

Generated: ${audit.generatedAt}

## Summary

- Taxonomy nodes: ${taxonomy.length}
- Products mapped: ${mappings.length}
- Confirmed: ${audit.statusCounts.confirmed || 0}
- Partially confirmed: ${audit.statusCounts['partially-confirmed'] || 0}
- Unresolved: ${audit.statusCounts.unresolved || 0}

## Primary Categories

| Category | Slug | Products |
| --- | --- | ---: |
${taxonomy.filter((item) => item.categoryType === 'primary-category').map((item) => `| ${item.name} | ${item.slug} | ${item.productCount} |`).join('\n')}

JSON and CSV sources are stored in \`diamond-symphony-astro/data/migration/product-taxonomy-master.*\`.
`);

writeFileSync(join(docsMigrationDir, 'PRODUCT_TAXONOMY_MAPPING.md'), `# Product Taxonomy Mapping

Generated: ${audit.generatedAt}

All ${mappings.length} Astro product records were assigned taxonomy fields. The mapping JSON/CSV lives in \`diamond-symphony-astro/data/migration/product-taxonomy-mapping.*\`.

## Status Counts

| Status | Count |
| --- | ---: |
${Object.entries(audit.statusCounts).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}
`);

writeFileSync(join(docsMigrationDir, 'PRODUCT_CATEGORY_ROUTE_MAPPING.md'), `# Product Category Route Mapping

| Legacy route | Category type | New route | Migration action | Product count | Notes |
| --- | --- | --- | --- | ---: | --- |
${taxonomy.filter((item) => ['primary-category', 'subcategory'].includes(item.categoryType)).map((item) => {
  const legacy = item.legacyUrls.length ? item.legacyUrls.join('<br>') : '';
  const route = item.parentTaxonomyId ? `/categories/${taxonomy.find((parent) => parent.taxonomyId === item.parentTaxonomyId)?.slug}/${item.slug}/` : `/products/${item.slug}/`;
  return `| ${legacy} | ${item.categoryType} | ${route} | preserve/redirect | ${item.productCount} | ${item.description} |`;
}).join('\n')}
`);

writeFileSync(join(docsMigrationDir, 'PRODUCT_TAXONOMY_AUDIT.md'), `# Product Taxonomy Audit

Generated: ${audit.generatedAt}

## Result

- Product count: ${audit.productCount}
- Taxonomy count: ${audit.taxonomyCount}
- Critical findings: ${audit.critical.length}
- Major findings: ${audit.major.length}
- Minor findings: ${audit.minor.length}

## Primary Category Counts

| Category | Count |
| --- | ---: |
${Object.entries(audit.primaryCategoryCounts).map(([key, value]) => `| ${key} | ${value} |`).join('\n')}

Detailed JSON output: \`diamond-symphony-astro/output/product-taxonomy-audit.json\`.
`);

console.log(`Mapped ${mappings.length} products into ${taxonomy.length} taxonomy nodes.`);
