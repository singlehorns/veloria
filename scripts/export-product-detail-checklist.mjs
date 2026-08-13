import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..');
const productsDir = path.join(projectRoot, 'src', 'content', 'products');
const outputDir = path.join(workspaceRoot, 'docs', 'migration');

const primaryCategoryLabels = {
  'womens-diamond-rings': '女士鑽戒',
  'mens-diamond-rings': '男士鑽戒',
  'colored-diamonds': '彩色鑽石專區',
  'loose-diamonds': '裸鑽',
  'other-jewelry': '珠寶飾品'
};

const subcategoryLabels = {
  'engagement-rings': '求婚鑽戒',
  'classic-womens-rings': '經典女戒',
  'fortune-womens-rings': '轉運女戒',
  'classic-mens-rings': '經典男戒',
  'fortune-mens-rings': '轉運男戒',
  necklaces: '項鍊',
  earrings: '耳環',
  bracelets: '手鍊',
  'pair-rings': '對戒',
  'yellow-diamonds': '黃鑽',
  'pink-diamonds': '粉鑽',
  'blue-diamonds': '藍鑽',
  'red-diamonds': '紅鑽',
  'green-diamonds': '綠鑽',
  'other-color-diamonds': '其他彩鑽'
};

const productTypeLabels = {
  ring: '戒指',
  'ring-female': '女戒',
  'ring-man': '男戒',
  necklace: '項鍊',
  earring: '耳環',
  bracelet: '手鍊',
  diamond: '裸鑽',
  'pair-ring': '對戒'
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function cleanText(value = '') {
  return String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function label(slug, labels) {
  return labels[slug] ?? slug ?? '';
}

function formatPrice(value) {
  return typeof value === 'number' ? `NT$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '';
}

function formatVariants(product) {
  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants
      .map((variant) => {
        const option = cleanText(variant.optionName || variant.name || variant.sku || variant.variantId || '未命名規格');
        return `${option}: ${formatPrice(variant.price) || '請洽專人確認'}`;
      })
      .join('；');
  }

  return product.displayPrice || '請洽專人確認';
}

function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

const productFiles = fs.readdirSync(productsDir).filter((file) => file.endsWith('.json')).sort();
const products = productFiles
  .map((file) => readJson(path.join(productsDir, file)))
  .sort((a, b) => (a.legacyProductId || '').localeCompare(b.legacyProductId || '', 'en'));

const rows = products.map((product) => {
  const subcategories = Array.isArray(product.subcategories) && product.subcategories.length > 0
    ? product.subcategories.map((slug) => label(slug, subcategoryLabels)).join('、')
    : product.collectionSlugs?.map((slug) => label(slug, subcategoryLabels)).join('、') || '';

  return {
    舊商品編號: product.legacyProductId || '',
    Cyberbiz商品ID: product.legacyCyberbizId || '',
    主要類別: label(product.primaryCategory, primaryCategoryLabels),
    子類別: subcategories,
    產品類型: label(product.productType, productTypeLabels),
    產品名稱: product.name || product.englishName || product.slug,
    英文名稱: product.englishName || '',
    產品描述: cleanText(product.shortDescription || product.description),
    鑽石分類金額: formatVariants(product),
    價格區間: product.displayPrice || [
      formatPrice(product.priceMin),
      formatPrice(product.priceMax)
    ].filter(Boolean).join(' - '),
    天然鑽石標準: cleanText(product.pricingStandards?.naturalDiamond || ''),
    培育鑽石標準: cleanText(product.pricingStandards?.labDiamond || ''),
    材質說明: cleanText(product.pricingStandards?.materialStatement || product.material || ''),
    商品頁路徑: `/products/${product.slug}/`,
    舊站原始網址: product.originalUrl || product.canonicalUrl || '',
    資料狀態: product.overallStatus || product.migrationStatus || ''
  };
});

const headers = Object.keys(rows[0] ?? {});
const csv = [
  headers.join(','),
  ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(','))
].join('\n');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'ORIGINAL_PRODUCT_DETAIL_CHECKLIST.csv'), `\uFEFF${csv}\n`, 'utf8');

const categoryCounts = rows.reduce((acc, row) => {
  acc[row.主要類別] = (acc[row.主要類別] || 0) + 1;
  return acc;
}, {});

const markdown = [
  '# 原站產品檢查明細',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '來源：`diamond-symphony-astro/src/content/products/*.json`，保留舊站商品編號與 Cyberbiz 商品 ID 方便回查。',
  '',
  '## 統計',
  '',
  `- 商品總數：${rows.length}`,
  ...Object.entries(categoryCounts).map(([category, count]) => `- ${category}：${count}`),
  '',
  '## 欄位',
  '',
  '- 主要類別 / 子類別',
  '- 產品名稱 / 英文名稱 / 產品描述',
  '- 鑽石分類金額：依商品 variants 整理，例如「天然鑽石: NT$...；實驗室培育鑽石: NT$...」',
  '- 天然鑽石標準 / 培育鑽石標準 / 材質說明',
  '- 商品頁路徑 / 舊站原始網址 / 資料狀態',
  '',
  `完整 CSV：\`docs/migration/ORIGINAL_PRODUCT_DETAIL_CHECKLIST.csv\``,
  ''
].join('\n');

fs.writeFileSync(path.join(outputDir, 'ORIGINAL_PRODUCT_DETAIL_CHECKLIST.md'), markdown, 'utf8');

console.log(`Exported ${rows.length} products.`);
