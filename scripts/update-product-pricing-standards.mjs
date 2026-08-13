import fs from 'node:fs';
import path from 'node:path';

const productsDir = path.resolve('src/content/products');

const decodeHtml = (value = '') =>
  value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));

const cleanText = (value = '') =>
  decodeHtml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeLine = (line = '') =>
  line
    .replace(/^[💎🔹⚠️📩💬]\s*/u, '')
    .replace(/^🔹$/u, '')
    .replace(/\s+：/g, '：')
    .replace(/：\s+/g, '：')
    .replace(/\s+/g, ' ')
    .trim();

const extractPricingFromDescription = (description = '') => {
  const paragraphs = description
    .replace(/\s+(天然鑽款\s*：)/g, '\n$1')
    .replace(/\s+(培育鑽款\s*：)/g, '\n$1')
    .replace(/\s+(若需|如有特殊規格|配鑽將)/g, '\n$1')
    .split(/\n+/)
    .map((paragraph) => normalizeLine(paragraph))
    .filter((paragraph) => paragraph && paragraph !== '🔹');
  const start = paragraphs.findIndex((paragraph) => paragraph.includes('訂價基準'));
  if (start < 0) return null;

  const pricingLines = paragraphs
    .slice(start + 1)
    .filter(
      (paragraph) =>
        !paragraph.includes('購買與諮詢') &&
        !paragraph.includes('客服中心') &&
        !paragraph.includes('LINE 諮詢')
    );

  const materialStatement = pricingLines.find((line) => /^此款價格|^以下價格/.test(line)) ?? '';
  const naturalDiamond = pricingLines.find((line) => line.includes('天然鑽款')) ?? '';
  const labDiamond = pricingLines.find((line) => line.includes('培育鑽款')) ?? '';
  const notes = pricingLines.filter((line) => line !== materialStatement && line !== naturalDiamond && line !== labDiamond);

  if (!materialStatement && !naturalDiamond && !labDiamond && notes.length === 0) return null;

  return {
    source: 'description',
    materialStatement,
    naturalDiamond,
    labDiamond,
    notes
  };
};

const extractSloganFromHtml = (html = '') => {
  const matches = [...html.matchAll(/<span[^>]*class=["'][^"']*product_slogan[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => cleanText(match[1]))
    .filter(Boolean);
  return matches.find((text) => /價格|材質|克拉|分/.test(text)) ?? '';
};

const fallbackPricing = (product) => {
  const variants = product.variants ?? [];
  const hasNatural = variants.some((variant) => variant.optionName === '天然鑽石');
  const hasLab = variants.some((variant) => variant.optionName === '實驗室培育鑽石');
  const material = product.material?.trim();
  const isLooseDiamond = product.primaryCategory === 'loose-diamonds' || product.productType === 'loose-diamond';
  const inferredMaterial = material || (isLooseDiamond ? '鑽石規格' : '18K 金材質');

  return {
    source: 'fallback',
    materialStatement: isLooseDiamond
      ? '此款價格依鑽石形狀、克拉數、顏色、淨度與證書規格而定。'
      : `此款價格基於${inferredMaterial}之設計。`,
    naturalDiamond: hasNatural ? '天然鑽款：請洽專人確認鑽石規格。' : '',
    labDiamond: hasLab ? '培育鑽款：請洽專人確認鑽石規格。' : '',
    notes: ['如有特殊規格、材質更換或其他客製需求，歡迎洽詢專人服務。']
  };
};

const fetchSloganPricing = async (product) => {
  if (!product.originalUrl) return null;
  try {
    const response = await fetch(product.originalUrl);
    if (!response.ok) return null;
    const html = await response.text();
    const slogan = extractSloganFromHtml(html);
    if (!slogan) return null;

    return {
      source: 'product-slogan',
      materialStatement: slogan,
      naturalDiamond: '',
      labDiamond: '',
      notes: []
    };
  } catch {
    return null;
  }
};

const files = fs.readdirSync(productsDir).filter((file) => file.endsWith('.json')).sort();
const stats = {
  total: files.length,
  description: 0,
  productSlogan: 0,
  fallback: 0,
  updated: 0
};

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const product = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const fromDescription = extractPricingFromDescription(product.description);
  const fromSlogan = fromDescription ? null : await fetchSloganPricing(product);
  const pricingStandards = fromDescription ?? fromSlogan ?? fallbackPricing(product);

  if (pricingStandards.source === 'description') stats.description += 1;
  if (pricingStandards.source === 'product-slogan') stats.productSlogan += 1;
  if (pricingStandards.source === 'fallback') stats.fallback += 1;

  const nextProduct = {
    ...product,
    pricingStandards
  };

  fs.writeFileSync(filePath, `${JSON.stringify(nextProduct, null, 2)}\n`, 'utf8');
  stats.updated += 1;
}

console.log(JSON.stringify(stats, null, 2));
