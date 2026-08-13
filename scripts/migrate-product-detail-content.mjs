import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const productsDir = path.join(root, 'src', 'content', 'products');
const catalogPath = path.join(root, 'data', 'cyberbiz-catalog.json');
const outputDir = path.join(root, 'output');
const detailsPath = path.join(root, 'data', 'cyberbiz-product-details.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeEntities(value = '') {
  return String(value)
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function attrValue(tag, attr) {
  return (tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)`, 'i')) || [])[1] || '';
}

function normalizeUrl(raw) {
  let url = decodeEntities(raw).trim();
  if (!url || url.startsWith('data:')) return '';
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('/')) url = `https://www.dsdiamond.com.tw${url}`;
  return url;
}

function extractImages(html) {
  const images = [];
  for (const match of html.matchAll(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) {
    images.push({ src: normalizeUrl(match[1]), alt: '產品圖片', role: 'main' });
  }
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const srcs = [attrValue(tag, 'src'), attrValue(tag, 'data-src'), attrValue(tag, 'data-original')].filter(Boolean);
    for (const src of srcs) {
      const normalized = normalizeUrl(src);
      if (/products|media\/W1siZiIsIjMzMzM4L3Byb2R1Y3Rz/.test(normalized)) {
        images.push({ src: normalized, alt: decodeEntities(attrValue(tag, 'alt')) || '產品圖片' });
      }
    }
  }
  const seen = new Set();
  return images.filter((image, index) => {
    const key = image.src.replace(/thumb","[^"]+"/, 'thumb","SIZE"');
    if (!image.src || seen.has(key)) return false;
    seen.add(key);
    image.role ||= index === 0 ? 'main' : 'gallery';
    return true;
  });
}

function extractMeta(html) {
  const title = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  const metaDescription = decodeEntities((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || '').trim();
  const canonical = normalizeUrl((html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i) || [])[1] || '');
  return { title, metaDescription, canonical };
}

function extractJsonLdProducts(html) {
  const products = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities(match[1]).trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      products.push(...items.filter((item) => item?.['@type'] === 'Product'));
    } catch {
      continue;
    }
  }
  return products;
}

function extractVariants(html) {
  const match = html.match(/var\s+productData\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]).map((variant) => ({
      variantId: String(variant.variant_id ?? ''),
      sku: variant.sku || variant.id || '',
      name: variant.name || '',
      price: typeof variant.price === 'number' ? variant.price : null,
      compareAtPrice: typeof variant.compare_at_price === 'number' ? variant.compare_at_price : null,
      currency: variant.currency || 'TWD',
      inventoryStatus: variant.inventory_quantity_status || ''
    }));
  } catch {
    return [];
  }
}

function formatPrice(value) {
  if (typeof value !== 'number') return '';
  return `NT$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function extractJsonAssignment(html, marker) {
  const index = html.indexOf(marker);
  if (index < 0) return null;
  const start = html.indexOf('{', index);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let quote = '';
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return html.slice(start, i + 1);
  }
  return null;
}

function parseWindowProduct(html) {
  const candidates = [
    'window.product',
    'var product',
    'product:',
    'selectedProduct',
    'currentProduct'
  ];
  for (const marker of candidates) {
    const raw = extractJsonAssignment(html, marker);
    if (!raw || !raw.includes('otherDescriptions')) continue;
    try {
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

function extractOtherDescriptionText(product, settingName) {
  const found = product?.otherDescriptions?.find((item) => item.settingName === settingName);
  return stripHtml(found?.bodyHtml || '');
}

function extractVisibleProductDescription(html) {
  const blocks = [];
  for (const marker of ['product_description_section_description', 'product-description', 'ckeditor']) {
    const index = html.indexOf(marker);
    if (index < 0) continue;
    const slice = html.slice(Math.max(0, index - 1000), index + 6000);
    const text = stripHtml(slice);
    if (text && !/v-html|function|return|var /.test(text)) blocks.push(text);
  }
  return blocks.sort((a, b) => b.length - a.length)[0] || '';
}

function cleanProductTitle(title = '') {
  return title.replace(/\s*鑽之韻\s*$/u, '').trim();
}

function productUrl(handle) {
  return `https://www.dsdiamond.com.tw/zh-TW/products/${encodeURIComponent(handle)}`;
}

function productDisplayName(product) {
  return product.originalDisplayName || (product.englishName && product.name !== product.englishName ? `${product.name}｜${product.englishName}` : product.name);
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 product-content-migration' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const catalogCollections = JSON.parse((await fs.readFile(catalogPath, 'utf8')).replace(/^\uFEFF/, ''));
  const catalogProducts = new Map();
  for (const collection of catalogCollections) {
    for (const product of collection.products) {
      const key = product.title;
      const current = catalogProducts.get(key) || { ...product, collectionTitles: [] };
      current.collectionTitles.push(collection.title);
      catalogProducts.set(key, current);
    }
  }

  const files = (await fs.readdir(productsDir)).filter((file) => file.endsWith('.json'));
  const details = [];
  const report = [];
  let updated = 0;
  let fetched = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(productsDir, file);
    const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
    const displayName = productDisplayName(data);
    const catalog = catalogProducts.get(displayName);
    const handle = catalog?.handle || data.originalUrl?.split('/products/')[1] || data.legacyUrls?.[0]?.split('/products/')[1] || '';
    if (!handle) {
      report.push({ slug: data.slug, status: 'skipped-no-handle' });
      continue;
    }

    const url = productUrl(decodeURIComponent(handle));
    try {
      const html = await fetchWithRetry(url);
      fetched += 1;
      const parsedProduct = parseWindowProduct(html);
      const meta = extractMeta(html);
      const jsonLdProduct = extractJsonLdProducts(html)[0];
      const variants = extractVariants(html);
      const specText = extractOtherDescriptionText(parsedProduct, 'product_description_section_spec');
      const shippingText = extractOtherDescriptionText(parsedProduct, 'product_description_section_shipping');
      const visibleDescription = extractVisibleProductDescription(html);
      const description = stripHtml(jsonLdProduct?.description || parsedProduct?.description || parsedProduct?.bodyHtml || visibleDescription);
      const images = extractImages(html);
      const seoTitle = cleanProductTitle(meta.title) || displayName;
      const seoDescription = meta.metaDescription || description.slice(0, 140);
      const variantPrices = variants.map((variant) => variant.price).filter((price) => typeof price === 'number');
      const minPrice = variantPrices.length ? Math.min(...variantPrices) : null;
      const maxPrice = variantPrices.length ? Math.max(...variantPrices) : null;

      const before = JSON.stringify(data);
      data.originalUrl = url;
      data.canonicalUrl = meta.canonical || url;
      data.seoTitle = seoTitle;
      data.seoDescription = seoDescription;
      data.shortDescription = description || seoDescription || data.shortDescription;
      data.description = description || data.description;
      data.specifications = specText || data.specifications || '';
      data.shippingDescription = shippingText || data.shippingDescription || '';
      data.variants = variants;
      data.priceMin = minPrice;
      data.priceMax = maxPrice;
      data.displayPrice = minPrice === null
        ? data.displayPrice
        : minPrice === maxPrice
          ? formatPrice(minPrice)
          : `${formatPrice(minPrice)} - ${formatPrice(maxPrice)}`;
      data.productPageSourceStatus = 'live-product-page-fetched';
      data.contentStatus = description || specText ? 'complete' : data.contentStatus || 'api-confirmed';
      data.migrationStatus = description || specText ? 'product-detail-content-migrated' : data.migrationStatus;
      data.rawSources = [
        ...(data.rawSources || []),
        {
          sourceType: 'cyberbiz-product-page',
          sourceId: String(catalog?.id || data.legacyCyberbizId || ''),
          sourceFile: url,
          text: [description, specText, shippingText].filter(Boolean).join('\n\n').slice(0, 1200)
        }
      ];
      if (images.length > (data.images?.length || 0)) {
        data.images = images.map((image, index) => ({
          ...image,
          alt: image.alt === '產品圖片' ? `${displayName} ${index + 1}` : image.alt
        }));
        data.imageStatus = 'product-detail-page';
        data.mediaStatus = 'product-detail-page';
      }
      if (JSON.stringify(data) !== before) {
        await fs.writeFile(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        updated += 1;
      }
      details.push({ slug: data.slug, url, title: displayName, description, specifications: specText, shippingDescription: shippingText, variants, images });
      report.push({ slug: data.slug, status: description || specText ? 'content-migrated' : 'no-detail-text-found', url });
      await sleep(120);
    } catch (error) {
      failed += 1;
      report.push({ slug: data.slug, status: 'failed', url, error: error.message });
    }
  }

  await fs.writeFile(detailsPath, `${JSON.stringify(details, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(outputDir, 'product-detail-content-migration-report.json'), `${JSON.stringify({ fetched, updated, failed, report }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ fetched, updated, failed }, null, 2));
}

await main();
