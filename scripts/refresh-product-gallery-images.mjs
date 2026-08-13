import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const productsDir = path.join(root, 'src', 'content', 'products');
const outputDir = path.join(root, 'output');
const reportPath = path.join(outputDir, 'product-gallery-refresh-report.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function decodeEntities(value = '') {
  return String(value)
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function decodeMediaToken(src = '') {
  const token = src.match(/\/media\/([^/?#.]+)/)?.[1];
  if (!token) return '';
  try {
    return Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function normalizeUrl(raw = '') {
  let url = decodeEntities(raw).replace(/\\\//g, '/').trim();
  if (url.startsWith('//')) url = `https:${url}`;
  return url;
}

function productFolderId(decoded = '') {
  return decoded.match(/\/products\/([^/]+)\//)?.[1] || '';
}

function sourceFileKey(decoded = '') {
  return decoded.match(/\["f","([^"]+)/)?.[1] || decoded;
}

function thumbArea(decoded = '') {
  const size = decoded.match(/\["p","thumb","(\d+)x(\d+)"\]/);
  return size ? Number(size[1]) * Number(size[2]) : 0;
}

function extractLiveProductId(html = '') {
  return (
    html.match(/"productId"\s*:\s*"?(\d+)"?/)?.[1] ||
    html.match(/"product_id"\s*:\s*"?(\d+)"?/)?.[1] ||
    html.match(/window\.c12t\s*=\s*\{[\s\S]*?"product"\s*:\s*\{[\s\S]*?"id"\s*:\s*"?(\d+)"?/)?.[1] ||
    ''
  );
}

function extractMediaImages(html = '') {
  const normalizedHtml = decodeEntities(html).replace(/\\\//g, '/');
  const matches = normalizedHtml.matchAll(/(?:https?:)?\/\/cdn-general\.cybassets\.com\/media\/[^\s"'<>\\)]+/g);
  const images = [];
  for (const match of matches) {
    const src = normalizeUrl(match[0]);
    const decoded = decodeMediaToken(src);
    const folderId = productFolderId(decoded);
    if (!src || !folderId) continue;
    images.push({ src, decoded, folderId });
  }
  return images;
}

function selectProductImages(images, liveProductId) {
  let productImages = liveProductId
    ? images.filter((image) => image.folderId === String(liveProductId))
    : [];

  if (!productImages.length) {
    const folderCounts = new Map();
    for (const image of images) {
      folderCounts.set(image.folderId, (folderCounts.get(image.folderId) || 0) + 1);
    }
    const firstMeaningfulFolder = images.find((image) => folderCounts.get(image.folderId) > 1)?.folderId || images[0]?.folderId;
    productImages = images.filter((image) => image.folderId === firstMeaningfulFolder);
  }

  const byFile = new Map();
  for (const image of productImages) {
    const key = sourceFileKey(image.decoded);
    const previous = byFile.get(key);
    if (!previous || thumbArea(image.decoded) > thumbArea(previous.decoded)) {
      byFile.set(key, image);
    }
  }

  return [...byFile.values()].sort((a, b) => {
    const folderCompare = a.folderId.localeCompare(b.folderId);
    if (folderCompare !== 0) return folderCompare;
    return sourceFileKey(a.decoded).localeCompare(sourceFileKey(b.decoded), undefined, { numeric: true });
  });
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 product-gallery-refresh' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

function productDisplayName(data) {
  return data.originalDisplayName || (data.englishName && data.name !== data.englishName ? `${data.name}｜${data.englishName}` : data.name);
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const files = (await fs.readdir(productsDir)).filter((file) => file.endsWith('.json'));
  const report = [];
  let fetched = 0;
  let updated = 0;
  let failed = 0;

  for (const file of files) {
    const fullPath = path.join(productsDir, file);
    const data = JSON.parse(await fs.readFile(fullPath, 'utf8'));
    const url = data.originalUrl || data.canonicalUrl || data.legacyUrls?.[0] || '';
    if (!url) {
      report.push({ file, slug: data.slug, status: 'skipped-no-url' });
      continue;
    }

    try {
      const html = await fetchWithRetry(url);
      fetched += 1;
      const liveProductId = extractLiveProductId(html);
      const allMediaImages = extractMediaImages(html);
      const selectedImages = selectProductImages(allMediaImages, liveProductId);
      const beforeCount = Array.isArray(data.images) ? data.images.length : 0;

      if (selectedImages.length) {
        const displayName = productDisplayName(data);
        data.images = selectedImages.map((image, index) => ({
          src: image.src,
          alt: `${displayName} ${index + 1}`,
          role: index === 0 ? 'main' : 'gallery'
        }));
        data.imageStatus = selectedImages.length > 1 ? 'product-gallery-refreshed' : 'product-main-image-refreshed';
        data.mediaStatus = selectedImages.length > 1 ? 'product-gallery-refreshed' : 'product-main-image-refreshed';
        data.liveProductImageFolderId = selectedImages[0].folderId;
      }

      const afterCount = Array.isArray(data.images) ? data.images.length : 0;
      if (afterCount !== beforeCount || selectedImages.length) {
        await fs.writeFile(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
        updated += 1;
      }

      report.push({
        file,
        slug: data.slug,
        status: selectedImages.length ? 'updated' : 'no-product-images-found',
        url,
        liveProductId,
        beforeCount,
        afterCount,
        selectedFolderId: selectedImages[0]?.folderId || ''
      });
      await sleep(90);
    } catch (error) {
      failed += 1;
      report.push({ file, slug: data.slug, status: 'failed', url, error: error.message });
    }
  }

  await fs.writeFile(reportPath, `${JSON.stringify({ fetched, updated, failed, report }, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ fetched, updated, failed, reportPath }, null, 2));
}

await main();
