import fs from 'node:fs';
import path from 'node:path';

const collectionSpecs = [
  ['engagement-rings', '求婚戒指', '%E6%B1%82%E5%A9%9A', 'womens-diamond-rings'],
  ['pair-rings', '結婚對戒', 'pair-ring', 'other-jewelry'],
  ['womens-diamond-rings', '女士鑽戒', 'ring-female', 'womens-diamond-rings'],
  ['classic-womens-rings', '經典女戒', '%E7%B6%93%E5%85%B8%E5%A5%B3%E6%88%92', 'womens-diamond-rings'],
  ['fortune-womens-rings', '轉運女戒', '%E8%BD%89%E9%81%8B%E5%A5%B3%E6%88%92', 'womens-diamond-rings'],
  ['mens-diamond-rings', '男士鑽戒', 'ring-man', 'mens-diamond-rings'],
  ['classic-mens-rings', '經典男戒', '%E7%B6%93%E5%85%B8%E7%94%B7%E6%88%92', 'mens-diamond-rings'],
  ['fortune-mens-rings', '轉運男戒', '%E8%BD%89%E9%81%8B%E7%94%B7%E6%88%92', 'mens-diamond-rings'],
  ['necklaces', '項鍊', 'necklace', 'other-jewelry'],
  ['earrings', '耳環', 'earring', 'other-jewelry'],
  ['bracelets', '手鍊', 'bracelet', 'other-jewelry'],
  ['colored-diamonds', '彩色鑽石專區', '%E5%BD%A9%E8%89%B2%E9%91%BD%E7%9F%B3%E5%B0%88%E5%8D%80', 'colored-diamonds'],
  ['yellow-diamonds', '黃鑽', '%E9%BB%83%E9%91%BD', 'colored-diamonds'],
  ['pink-diamonds', '粉鑽', '%E7%B2%89%E9%91%BD', 'colored-diamonds'],
  ['blue-diamonds', '藍鑽', '%E8%97%8D%E9%91%BD', 'colored-diamonds'],
  ['red-diamonds', '紅鑽', '%E7%B4%85%E9%91%BD', 'colored-diamonds'],
  ['green-diamonds', '綠鑽', '%E7%B6%A0%E9%91%BD', 'colored-diamonds'],
  ['other-color-diamonds', '其他彩鑽', '%E5%85%B6%E4%BB%96%E5%BD%A9%E9%91%BD', 'colored-diamonds'],
  ['loose-diamonds', '精選裸鑽', 'diamond', 'loose-diamonds']
];

const primaryCollectionSlugs = new Set([
  'womens-diamond-rings',
  'mens-diamond-rings',
  'colored-diamonds',
  'loose-diamonds'
]);

const root = process.cwd();
const productsDir = path.join(root, 'src/content/products');
const collectionLabels = new Map(collectionSpecs.map(([slug, label]) => [slug, label]));

function displayName(product) {
  if (product.originalDisplayName && !/[�]/.test(product.originalDisplayName)) {
    return product.originalDisplayName;
  }
  if (product.name && product.englishName && product.name !== product.englishName) {
    return `${product.name}｜${product.englishName}`;
  }
  return product.originalDisplayName || product.englishName || product.name;
}

function splitTitle(title) {
  const parts = title.split('｜');
  if (parts.length > 1) return [parts[0].trim(), parts.slice(1).join('｜').trim()];
  return [title.trim(), ''];
}

function slugify(value) {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'product';
}

function productSlugBase(meta, primaryCategory) {
  if (primaryCategory === 'loose-diamonds') {
    const looseShapeSlugs = [
      ['公主方', 'princess'],
      ['圓鑽', 'round'],
      ['心形', 'heart'],
      ['枕形', 'cushion'],
      ['梨形', 'pear'],
      ['橢圓', 'oval'],
      ['祖母綠', 'emerald'],
      ['阿斯切', 'asscher'],
      ['雷迪恩', 'radiant'],
      ['馬眼', 'marquise']
    ];
    const match = looseShapeSlugs.find(([label]) => meta.title.includes(label) || meta.handle.includes(label));
    if (match) return match[1];
  }
  const englishSlug = slugify(meta.englishName);
  if (englishSlug !== 'product') return englishSlug;
  const handleSlug = slugify(meta.handle);
  if (handleSlug !== 'product') {
    return primaryCategory === 'loose-diamonds' ? `loose-diamond-${handleSlug}` : handleSlug;
  }
  return slugify(meta.title);
}

function displayPrice(value) {
  if (typeof value !== 'number') return '價格請洽詢';
  return `NT$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function productUrl(handle) {
  return `https://www.dsdiamond.com.tw/zh-TW/products/${encodeURIComponent(handle)}`;
}

function readProducts() {
  return fs.readdirSync(productsDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const fullPath = path.join(productsDir, file);
      const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      return { file, fullPath, data, displayName: displayName(data) };
    });
}

const existingProducts = readProducts();
const byTitle = new Map(existingProducts.map((product) => [product.displayName, product]));
const apiProducts = new Map();
const collectionOrder = {};
const catalogPath = path.join(root, 'data/cyberbiz-catalog.json');
const catalogCollections = JSON.parse(fs.readFileSync(catalogPath, 'utf8').replace(/^\uFEFF/, ''));

for (const productRow of existingProducts) {
  productRow.data.collectionSlugs = [];
}

for (const collection of catalogCollections) {
  collectionOrder[collection.slug] = [];
  for (const product of collection.products) {
    const [name, englishName] = splitTitle(product.title);
    const current = apiProducts.get(product.title) ?? {
      ...product,
      name,
      englishName,
      collections: [],
      primaries: new Set()
    };
    current.collections.push(collection.slug);
    current.primaries.add(collection.primaryCategory);
    current.image ||= product.image;
    current.cheapest ??= product.cheapest;
    apiProducts.set(product.title, current);
  }
}

let created = 0;
let updated = 0;

for (const meta of apiProducts.values()) {
  let productRow = byTitle.get(meta.title);
  const primaryCategory = [...meta.primaries][0] ?? 'other-jewelry';

  if (!productRow) {
    const baseSlug = productSlugBase(meta, primaryCategory);
    let slug = baseSlug;
    let suffix = 2;
    while (fs.existsSync(path.join(productsDir, `${slug}.json`))) slug = `${baseSlug}-${suffix++}`;

    const collectionNames = meta.collections.map((collectionSlug) => collectionLabels.get(collectionSlug) ?? collectionSlug);
    const data = {
      legacyProductId: meta.sku || `CYB-${meta.id}`,
      legacyCyberbizId: String(meta.id),
      name: meta.name,
      ...(meta.englishName ? { englishName: meta.englishName } : {}),
      originalDisplayName: meta.title,
      slug,
      legacyUrls: [productUrl(meta.handle)],
      category: collectionNames.join(' | '),
      collection: collectionNames.join(' | '),
      collections: collectionNames,
      productType: primaryCategory === 'loose-diamonds' ? 'loose-diamond' : 'ring',
      variantType: '',
      parentProductId: '',
      shortDescription: `${meta.title} 為官網分類中的商品。`,
      description: `${meta.title} 為鑽之韻官網商品。`,
      material: '',
      mainStone: '',
      sideStone: '',
      diamondShape: '',
      shape: '',
      color: '',
      certificate: '',
      specifications: '',
      images: meta.image ? [{ src: meta.image, alt: meta.title }] : [],
      displayPrice: displayPrice(meta.cheapest),
      video: '',
      seoTitle: meta.title,
      seoDescription: `${meta.title}，鑽之韻商品。`,
      canonicalUrl: '',
      originalUrl: productUrl(meta.handle),
      inquiryText: `我想諮詢 ${meta.title}`,
      frameworkStatus: 'complete',
      contentStatus: 'api-confirmed',
      imageStatus: meta.image ? 'api-confirmed' : 'missing',
      mediaStatus: 'missing',
      routeStatus: 'api-product-route',
      overallStatus: 'partial',
      migrationStatus: 'api-confirmed',
      sourceIds: [],
      sourceFiles: [],
      rawSources: [{ sourceType: 'cyberbiz-search-products-api', sourceId: String(meta.id), text: meta.title }],
      migrationNotes: 'Added from current CYBERBIZ collection API while synchronizing product categories.',
      primaryCategory,
      collectionSlugs: meta.collections,
      subcategories: meta.collections.filter((slug) => !primaryCollectionSlugs.has(slug)),
      audience: primaryCategory === 'mens-diamond-rings' ? 'men' : primaryCategory === 'loose-diamonds' ? 'unisex' : 'women',
      diamondType: primaryCategory === 'colored-diamonds' ? 'colored-diamond' : 'diamond',
      tags: [...new Set([primaryCategory, ...meta.collections, primaryCategory === 'loose-diamonds' ? 'loose-diamond' : 'ring'])],
      legacyCategoryUrls: [],
      taxonomyStatus: 'confirmed',
      taxonomyNotes: 'Confirmed by CYBERBIZ collection search_products.json.'
    };

    const fullPath = path.join(productsDir, `${slug}.json`);
    fs.writeFileSync(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    productRow = { file: `${slug}.json`, fullPath, data, displayName: meta.title };
    byTitle.set(meta.title, productRow);
    created += 1;
  } else {
    const data = productRow.data;
    data.originalDisplayName = meta.title;
    data.collectionSlugs = meta.collections;
    data.legacyCyberbizId ||= String(meta.id);
    data.displayPrice ||= displayPrice(meta.cheapest);
    if ((!data.images || data.images.length === 0) && meta.image) data.images = [{ src: meta.image, alt: meta.title }];
    if (!data.primaryCategory || !meta.collections.includes(data.primaryCategory)) data.primaryCategory = primaryCategory;
    const subcategories = new Set([
      ...(data.subcategories ?? []),
      ...meta.collections.filter((slug) => !primaryCollectionSlugs.has(slug))
    ]);
    data.subcategories = [...subcategories];
    data.tags = [...new Set([...(data.tags ?? []), ...(data.collectionSlugs ?? []), ...data.subcategories])];
    fs.writeFileSync(productRow.fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    updated += 1;
  }
}

for (const collection of catalogCollections) {
  collectionOrder[collection.slug] = collection.products
    .map((product) => byTitle.get(product.title)?.data.slug)
    .filter(Boolean);
}

for (const productRow of existingProducts) {
  fs.writeFileSync(productRow.fullPath, `${JSON.stringify(productRow.data, null, 2)}\n`, 'utf8');
}

const orderFile = `export const productCollectionOrder = ${JSON.stringify(collectionOrder, null, 2)} as const;\n\nexport type ProductCollectionSlug = keyof typeof productCollectionOrder;\n`;
fs.writeFileSync(path.join(root, 'src/data/productCollectionOrder.ts'), orderFile, 'utf8');

console.log(JSON.stringify({
  created,
  updated,
  collections: Object.fromEntries(Object.entries(collectionOrder).map(([slug, products]) => [slug, products.length]))
}, null, 2));
