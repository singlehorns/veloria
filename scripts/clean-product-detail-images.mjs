import fs from 'node:fs';
import path from 'node:path';

const productsDir = path.join(process.cwd(), 'src', 'content', 'products');

function decodeMediaToken(src = '') {
  const token = src.match(/media\/([^/?]+)/)?.[1];
  if (!token) return '';
  try {
    return Buffer.from(token, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

function sourceFileKey(decoded = '') {
  return decoded.match(/\["f","([^"]+)/)?.[1] || decoded;
}

function productFolderId(decoded = '') {
  return decoded.match(/\/products\/([^/]+)\//)?.[1] || '';
}

function thumbArea(decoded = '') {
  const size = decoded.match(/\["p","thumb","(\d+)x(\d+)"\]/);
  return size ? Number(size[1]) * Number(size[2]) : 0;
}

let changed = 0;
const samples = [];

for (const file of fs.readdirSync(productsDir).filter((item) => item.endsWith('.json'))) {
  const fullPath = path.join(productsDir, file);
  const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  if (!data.legacyCyberbizId || !Array.isArray(data.images)) continue;

  const before = data.images.length;
  const decodedImages = data.images.map((image, index) => ({ image, index, decoded: decodeMediaToken(image.src) }));
  let sameProductImages = decodedImages.filter((item) => productFolderId(item.decoded) === String(data.legacyCyberbizId));

  if (!sameProductImages.length) {
    const firstProductFolder = productFolderId(decodedImages[0]?.decoded);
    sameProductImages = decodedImages.filter((item) => productFolderId(item.decoded) === firstProductFolder);
  }

  if (!sameProductImages.length) continue;

  const byFile = new Map();
  for (const item of sameProductImages) {
    const key = sourceFileKey(item.decoded);
    const previous = byFile.get(key);
    if (!previous || thumbArea(item.decoded) > thumbArea(previous.decoded)) {
      byFile.set(key, item);
    }
  }

  data.images = [...byFile.values()]
    .sort((a, b) => thumbArea(b.decoded) - thumbArea(a.decoded))
    .map((item, index) => ({
      ...item.image,
      role: index === 0 ? 'main' : 'gallery'
    }));

  if (data.images.length !== before) {
    fs.writeFileSync(fullPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    changed += 1;
    if (samples.length < 12) samples.push({ file, before, after: data.images.length });
  }
}

console.log(JSON.stringify({ changed, samples }, null, 2));
