import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const productRoot = path.join(projectRoot, "src", "content", "products");
const assetRoot = path.join(projectRoot, "public", "assets", "migrated", "products");
const reportPath = path.join(projectRoot, "output", "earring-html-gallery-sync-report.json");

const earringSlugs = [
  "luminous-duet",
  "stellar-studs",
  "golden-bloom",
  "akatsuki-dance",
  "aurora-hoops",
  "arc-diamond-sequence",
  "celestial-halo-radiance"
];

function decodeEntities(value = "") {
  return String(value)
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeUrl(raw = "") {
  let value = decodeEntities(raw).replace(/\\\//g, "/").trim();
  if (value.startsWith("//")) value = `https:${value}`;
  return value;
}

function decodeMediaToken(src = "") {
  const token = src.match(/\/media\/([^/?#.]+)/)?.[1];
  if (!token) return "";
  try {
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function sourceFileKey(decoded = "") {
  return decoded.match(/\["f","([^"]+)"/)?.[1] || decoded;
}

function thumbSize(decoded = "") {
  const size = decoded.match(/\["p","thumb","(\d+)x(\d+)"\]/);
  if (!size) return 0;
  return Number(size[1]) * Number(size[2]);
}

function extensionFromUrl(src = "") {
  try {
    const ext = path.extname(new URL(src).pathname).toLowerCase();
    return [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".png";
  } catch {
    return ".png";
  }
}

function productMediaFromHtml(html, productFolderId) {
  const normalizedHtml = decodeEntities(html).replace(/\\\//g, "/");
  const urls = [
    ...normalizedHtml.matchAll(/(?:https?:)?\/\/cdn-general\.cybassets\.com\/media\/[^\s"'<>\\)]+/g)
  ].map((match) => normalizeUrl(match[0]));

  const bySourceFile = new Map();
  for (const src of urls) {
    const decoded = decodeMediaToken(src);
    if (!decoded.includes(`/products/${productFolderId}/`)) continue;
    const sourceFile = sourceFileKey(decoded);
    const size = thumbSize(decoded);
    const existing = bySourceFile.get(sourceFile);
    if (!existing || size > existing.size) {
      bySourceFile.set(sourceFile, { src, decoded, sourceFile, size });
    }
  }

  return [...bySourceFile.values()];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 earring-gallery-sync"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function download(src, target) {
  const response = await fetch(src, {
    headers: {
      "user-agent": "Mozilla/5.0 earring-gallery-sync"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error("empty response");
  await writeFile(target, bytes);
  return bytes.length;
}

function localizedSrc(legacyProductId, slug, fileName) {
  return `/assets/migrated/products/${legacyProductId}-${slug}/localized/${fileName}`;
}

const report = {
  generatedAt: new Date().toISOString(),
  updated: [],
  failed: []
};

for (const slug of earringSlugs) {
  const jsonPath = path.join(productRoot, `${slug}.json`);
  try {
    const product = JSON.parse(await readFile(jsonPath, "utf8"));
    const legacyProductId = product.legacyProductId;
    const productFolderId = String(product.legacyCyberbizId || product.liveProductImageFolderId || "");
    const sourceUrl = product.originalUrl || product.canonicalUrl;
    if (!legacyProductId || !productFolderId || !sourceUrl) {
      throw new Error("missing product id, folder id, or source url");
    }

    const html = await fetchText(sourceUrl);
    const media = productMediaFromHtml(html, productFolderId);
    if (media.length < 3) {
      throw new Error(`only found ${media.length} product images in source page`);
    }

    const targetFolder = path.join(assetRoot, `${legacyProductId}-${slug}`, "localized");
    await mkdir(targetFolder, { recursive: true });

    const nextImages = [];
    const downloads = [];
    for (let index = 0; index < media.length; index += 1) {
      const role = index === 0 ? "main" : "gallery";
      const fileName = `${legacyProductId}-${role}-${String(index + 1).padStart(2, "0")}${extensionFromUrl(media[index].src)}`;
      const target = path.join(targetFolder, fileName);
      const bytes = await download(media[index].src, target);
      downloads.push({ fileName, bytes, sourceFile: media[index].sourceFile });
      nextImages.push({
        src: localizedSrc(legacyProductId, slug, fileName),
        alt: `${product.originalDisplayName || product.name || product.englishName || slug} ${index + 1}`,
        role
      });
    }

    product.images = nextImages;
    product.imageStatus = "localized-html-gallery";
    product.mediaStatus = "localized-html-gallery";
    product.liveProductImageFolderId = productFolderId;
    await writeFile(jsonPath, `${JSON.stringify(product, null, 2)}\n`, "utf8");

    report.updated.push({
      slug,
      legacyProductId,
      productFolderId,
      sourceUrl,
      imageCount: nextImages.length,
      downloads
    });
  } catch (error) {
    report.failed.push({
      slug,
      error: error.message
    });
  }
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (report.failed.length) process.exitCode = 1;
