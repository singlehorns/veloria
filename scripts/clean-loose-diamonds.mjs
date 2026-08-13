import fs from 'node:fs';
import path from 'node:path';

const catalog = JSON.parse(fs.readFileSync('data/cyberbiz-catalog.json', 'utf8').replace(/^\uFEFF/, ''));
const loose = catalog.find((collection) => collection.slug === 'loose-diamonds');
const shapeMap = [
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

for (const item of loose.products) {
  const [, slug] = shapeMap.find(([label]) => item.title.includes(label));
  const product = {
    legacyProductId: item.sku || `CYB-${item.id}`,
    legacyCyberbizId: String(item.id),
    name: item.title,
    originalDisplayName: item.title,
    slug,
    legacyUrls: [`https://www.dsdiamond.com.tw/zh-TW/products/${encodeURIComponent(item.handle)}`],
    category: '精選裸鑽',
    collection: '精選裸鑽',
    collections: ['精選裸鑽'],
    productType: 'loose-diamond',
    variantType: '',
    parentProductId: '',
    shortDescription: `${item.title} 為官網精選裸鑽分類中的商品。`,
    description: `${item.title} 為鑽之韻精選裸鑽商品。`,
    material: '',
    mainStone: '',
    sideStone: '',
    diamondShape: slug,
    shape: slug,
    color: '',
    certificate: '',
    specifications: '',
    images: item.image ? [{ src: item.image, alt: item.title }] : [],
    displayPrice: typeof item.cheapest === 'number'
      ? `NT$${item.cheapest.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : '價格請洽詢',
    video: '',
    seoTitle: item.title,
    seoDescription: `${item.title}，鑽之韻精選裸鑽商品。`,
    canonicalUrl: '',
    originalUrl: `https://www.dsdiamond.com.tw/zh-TW/products/${encodeURIComponent(item.handle)}`,
    inquiryText: `我想諮詢 ${item.title}`,
    frameworkStatus: 'complete',
    contentStatus: 'api-confirmed',
    imageStatus: item.image ? 'api-confirmed' : 'missing',
    mediaStatus: 'missing',
    routeStatus: 'api-product-route',
    overallStatus: 'partial',
    migrationStatus: 'api-confirmed',
    sourceIds: [],
    sourceFiles: [],
    rawSources: [{ sourceType: 'cyberbiz-search-products-api', sourceId: String(item.id), text: item.title }],
    migrationNotes: 'Added from current CYBERBIZ collection API while synchronizing product categories.',
    primaryCategory: 'loose-diamonds',
    collectionSlugs: ['loose-diamonds'],
    subcategories: [],
    audience: 'unisex',
    diamondType: 'diamond',
    tags: ['loose-diamonds', 'loose-diamond'],
    legacyCategoryUrls: [],
    taxonomyStatus: 'confirmed',
    taxonomyNotes: 'Confirmed by CYBERBIZ collection search_products.json.'
  };
  fs.writeFileSync(path.join('src/content/products', `${slug}.json`), `${JSON.stringify(product, null, 2)}\n`, 'utf8');
}

console.log(`Cleaned ${loose.products.length} loose diamond products.`);
