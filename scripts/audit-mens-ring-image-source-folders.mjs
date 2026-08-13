import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const outputDir = path.join(root, "output");

function isMensRing(product) {
  const slugs = new Set(product.collectionSlugs || []);
  return product.primaryCategory === "mens-diamond-rings" || slugs.has("mens-diamond-rings");
}

function apiUrlFromProduct(product) {
  const rawUrl = product.originalUrl || product.canonicalUrl || product.legacyUrls?.[0] || "";
  if (!rawUrl) return "";
  const url = new URL(rawUrl);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/$/, "") + ".json";
  return url.toString();
}

function normalizeUrl(raw = "") {
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}

function bestPhotoUrl(photo = {}) {
  return normalizeUrl(photo.maximum || photo.original || photo.grande || photo.large || photo.medium || "");
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

function productFolderId(decoded = "") {
  return decoded.match(/\/products\/([^/]+)\//)?.[1] || "";
}

function sourceFileKey(decoded = "") {
  return decoded.match(/\["f","([^"]+)/)?.[1] || decoded;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 mens-ring-source-audit"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

await mkdir(outputDir, { recursive: true });

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const report = [];

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isMensRing(product)) continue;

  const apiUrl = apiUrlFromProduct(product);
  try {
    const apiProduct = await fetchJson(apiUrl);
    const apiId = String(apiProduct.id || "");
    const images = (apiProduct.photo_urls || []).map((photo, index) => {
      const src = bestPhotoUrl(photo);
      const decoded = decodeMediaToken(src);
      return {
        index: index + 1,
        folderId: productFolderId(decoded),
        sourceFile: sourceFileKey(decoded)
      };
    });
    report.push({
      slug: product.slug,
      id: product.legacyProductId,
      apiId,
      apiTitle: apiProduct.title || "",
      imageCount: images.length,
      wrongFolderImages: images.filter((image) => image.folderId && image.folderId !== apiId),
      images
    });
  } catch (error) {
    report.push({ slug: product.slug, id: product.legacyProductId, error: error.message });
  }
}

const failing = report.filter((row) => row.error || row.wrongFolderImages?.length);
const summary = {
  total: report.length,
  passing: report.length - failing.length,
  failing: failing.length,
  failingRows: failing,
  report
};

await writeFile(path.join(outputDir, "mens-ring-image-source-folders-report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
