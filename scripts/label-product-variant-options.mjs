import fs from 'node:fs/promises';
import path from 'node:path';

const productsDir = path.join(process.cwd(), 'src', 'content', 'products');

function singleVariantLabel(product) {
  const diamondType = String(product.diamondType || '').toLowerCase();
  if (diamondType.includes('lab') || diamondType.includes('grown') || diamondType.includes('培育')) {
    return '實驗室培育鑽石';
  }
  return '天然鑽石';
}

function labelsForVariants(product, variants) {
  if (variants.length <= 1) return variants.map(() => singleVariantLabel(product));

  const prices = variants.map((variant) => (typeof variant.price === 'number' ? variant.price : null));
  const numericPrices = prices.filter((price) => typeof price === 'number');
  const minPrice = numericPrices.length ? Math.min(...numericPrices) : null;
  const maxPrice = numericPrices.length ? Math.max(...numericPrices) : null;

  return variants.map((variant, index) => {
    if (typeof variant.price === 'number' && minPrice !== maxPrice) {
      return variant.price === maxPrice ? '天然鑽石' : '實驗室培育鑽石';
    }
    return index === 0 ? '天然鑽石' : '實驗室培育鑽石';
  });
}

let changed = 0;
const samples = [];

for (const file of (await fs.readdir(productsDir)).filter((item) => item.endsWith('.json'))) {
  const fullPath = path.join(productsDir, file);
  const product = JSON.parse(await fs.readFile(fullPath, 'utf8'));
  if (!Array.isArray(product.variants) || !product.variants.length) continue;

  const labels = labelsForVariants(product, product.variants);
  let productChanged = false;
  product.variants = product.variants.map((variant, index) => {
    if (variant.optionName === labels[index]) return variant;
    productChanged = true;
    return {
      ...variant,
      optionName: labels[index]
    };
  });

  if (productChanged) {
    await fs.writeFile(fullPath, `${JSON.stringify(product, null, 2)}\n`, 'utf8');
    changed += 1;
    if (samples.length < 12) {
      samples.push({
        file,
        variants: product.variants.map((variant) => ({ optionName: variant.optionName, price: variant.price, sku: variant.sku }))
      });
    }
  }
}

console.log(JSON.stringify({ changed, samples }, null, 2));
