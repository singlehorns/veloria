import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const projectRoot = path.resolve(process.cwd());
const dataDir = path.join(projectRoot, "data", "migration");
const docsDir = path.join(projectRoot, "docs", "migration");
const productsMediaRoot = path.join(projectRoot, "public", "assets", "migrated", "products");
const referencedUrlsPath = path.join(projectRoot, "..", "dsdiamond_backup", "migration", "referenced-urls.csv");

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function normalizeUrl(raw) {
  if (!raw) return "";
  let url = String(raw).trim();
  if (url.startsWith("//")) url = `https:${url}`;
  return url;
}

function decodeCybMediaPath(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return "";
  }
  const fileName = path.basename(parsed.pathname);
  const ext = path.extname(fileName);
  const token = fileName.slice(0, fileName.length - ext.length);
  try {
    const jsonText = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const decoded = JSON.parse(jsonText);
    if (Array.isArray(decoded) && decoded[0]?.[0] === "f") return decoded[0][1] || "";
  } catch {
    return "";
  }
  return "";
}

async function hashFile(file) {
  const bytes = await readFile(file);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function toMarkdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n") + "\n";
}

async function readReferencedStats() {
  if (!existsSync(referencedUrlsPath)) return {};
  const csv = await readFile(referencedUrlsPath, "utf8");
  const urls = csv.split(/\r?\n/).slice(1).map((line) => line.split(",")[0]).filter(Boolean);
  const productUrls = [];
  const attached = [];
  const blogs = [];
  const shared = [];
  for (const raw of urls) {
    const url = normalizeUrl(raw.replace(/^"|"$/g, ""));
    const decoded = decodeCybMediaPath(url);
    if (/33338\/products\/\d+\//.test(decoded)) productUrls.push({ url, decoded });
    else if (/33338\/attached_photos\//.test(decoded)) attached.push({ url, decoded });
    else if (/33338\/blogs\//.test(decoded)) blogs.push({ url, decoded });
    else if (url) shared.push({ url, decoded });
  }
  return {
    totalReferencedRows: urls.length,
    productMediaUrlCount: productUrls.length,
    productMediaUniqueUrlCount: new Set(productUrls.map((row) => row.url)).size,
    productMediaProductIds: new Set(productUrls.map((row) => (row.decoded.match(/33338\/products\/(\d+)\//) || [])[1]).filter(Boolean)).size,
    attachedPhotoCount: attached.length,
    blogMediaCount: blogs.length,
    sharedOrOtherCount: shared.length,
    productUrls
  };
}

async function readManifests() {
  const folders = await readdir(productsMediaRoot, { withFileTypes: true });
  const manifests = [];
  for (const folder of folders) {
    if (!folder.isDirectory()) continue;
    const manifestPath = path.join(productsMediaRoot, folder.name, "manifest.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    manifests.push({ folder: folder.name, manifestPath, manifest });
  }
  return manifests;
}

function pickSamples(products, manifests) {
  const byId = new Map(products.map((product) => [product.legacyProductId, product]));
  const byProductId = new Map(manifests.map((entry) => [entry.manifest.legacyProductId, entry]));
  const sampleCandidates = [];
  if (products[0]) sampleCandidates.push(["第一個產品", products[0].legacyProductId]);
  if (products.at(-1)) sampleCandidates.push(["最後一個產品", products.at(-1).legacyProductId]);
  const sortedByImages = [...products].sort((a, b) => b.downloadedImageCount - a.downloadedImageCount);
  if (sortedByImages[0]) sampleCandidates.push(["圖片最多的產品", sortedByImages[0].legacyProductId]);
  const zeroImage = products.find((product) => product.downloadedImageCount === 0);
  if (zeroImage) sampleCandidates.push(["圖片最少的產品", zeroImage.legacyProductId]);
  const multiSource = products.find((product) => product.sourceIds.length > 1);
  if (multiSource) sampleCandidates.push(["有多個來源網址的產品", multiSource.legacyProductId]);
  const variant = products.find((product) => product.variantType);
  if (variant) sampleCandidates.push(["有變體的產品", variant.legacyProductId]);
  const missing = products.find((product) => product.expectedImageCount === 0);
  if (missing) sampleCandidates.push(["無法確認圖片的產品", missing.legacyProductId]);

  return sampleCandidates.map(([sampleType, id]) => {
    const product = byId.get(id);
    const entry = byProductId.get(id);
    return {
      sampleType,
      legacyProductId: id,
      productName: product?.productName || "",
      legacyUrls: product?.legacyUrls?.join(" | ") || "",
      expectedImageCount: product?.expectedImageCount ?? "",
      downloadedImageCount: product?.downloadedImageCount ?? "",
      status: entry?.manifest?.status || "missing manifest",
      manifest: entry ? normalizeSlash(path.relative(projectRoot, entry.manifestPath)) : "",
      checkResult: entry && product && entry.manifest.downloadedFiles.length === product.downloadedImageCount ? "通過" : "需檢查"
    };
  });
}

const products = JSON.parse(await readFile(path.join(dataDir, "product-master.json"), "utf8"));
const mediaRows = JSON.parse(await readFile(path.join(dataDir, "product-media-master.json"), "utf8"));
const manifests = await readManifests();
const referencedStats = await readReferencedStats();
const usedProductImageUrls = new Set(products.flatMap((product) => (product.imageReferences || []).map((ref) => ref.originalUrl)));
const unassignedReferencedProductMedia = (referencedStats.productUrls || [])
  .filter((row) => !usedProductImageUrls.has(row.url))
  .map((row) => ({
    url: row.url,
    decodedPath: row.decoded,
    decodedProductId: (row.decoded.match(/33338\/products\/(\d+)\//) || [])[1] || "",
    reason: "referenced-urls.csv 中有產品圖 URL，但未在可確認產品來源中找到同 product id，因此未指派到產品。"
  }));
delete referencedStats.productUrls;

let missingManifestCount = 0;
let missingFileCount = 0;
let damagedFileCount = 0;
const hashMap = new Map();
let duplicateByHash = 0;

for (const product of products) {
  const folderName = `${product.legacyProductId}-${product.astroSlug}`;
  const manifestPath = path.join(productsMediaRoot, folderName, "manifest.json");
  if (!existsSync(manifestPath)) {
    missingManifestCount += 1;
    continue;
  }
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  for (const downloaded of manifest.downloadedFiles) {
    const file = path.join(projectRoot, downloaded.file);
    if (!existsSync(file)) {
      missingFileCount += 1;
      continue;
    }
    const fileStat = await stat(file);
    if (fileStat.size <= 0) damagedFileCount += 1;
    const sha256 = await hashFile(file);
    if (hashMap.has(sha256)) duplicateByHash += 1;
    else hashMap.set(sha256, downloaded.file);
  }
}

const audit = {
  productCount: products.length,
  manifestCount: manifests.length,
  missingManifestCount,
  missingFileCount,
  damagedFileCount,
  duplicateByHash,
  downloadedProductImages: mediaRows.reduce((sum, row) => sum + Number(row["下載成功"]), 0),
  failedDownloads: mediaRows.reduce((sum, row) => sum + Number(row["下載失敗"]), 0),
  completeProducts: mediaRows.filter((row) => row["圖片狀態"] === "完整").length,
  partialProducts: mediaRows.filter((row) => row["圖片狀態"] === "部分完成").length,
  missingImageProducts: mediaRows.filter((row) => row["圖片狀態"] === "缺少圖片").length,
  unassignedReferencedProductMediaCount: unassignedReferencedProductMedia.length,
  unassignedReferencedProductMedia,
  referencedStats,
  samples: pickSamples(products, manifests)
};

await writeFile(path.join(dataDir, "product-media-audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
await writeFile(path.join(dataDir, "unassigned-product-media.json"), JSON.stringify(unassignedReferencedProductMedia, null, 2) + "\n", "utf8");
await writeFile(
  path.join(docsDir, "PRODUCT_MEDIA_AUDIT.md"),
  `# Product Media Audit

- 產品數：${audit.productCount}
- manifest 數：${audit.manifestCount}
- 缺少 manifest：${audit.missingManifestCount}
- 缺少實體檔：${audit.missingFileCount}
- 空檔/損壞疑慮：${audit.damagedFileCount}
- 下載成功產品圖片：${audit.downloadedProductImages}
- 下載失敗：${audit.failedDownloads}
- 完整產品：${audit.completeProducts}
- 部分完成產品：${audit.partialProducts}
- 缺少圖片產品：${audit.missingImageProducts}
- referenced-urls 產品圖 URL：${audit.referencedStats.productMediaUrlCount ?? 0}
- referenced-urls 產品圖唯一 URL：${audit.referencedStats.productMediaUniqueUrlCount ?? 0}
- referenced-urls 產品 id 數：${audit.referencedStats.productMediaProductIds ?? 0}
- referenced-urls 未指派產品圖：${audit.unassignedReferencedProductMediaCount}

## 抽查

${toMarkdownTable(["sampleType", "legacyProductId", "productName", "legacyUrls", "expectedImageCount", "downloadedImageCount", "status", "manifest", "checkResult"], audit.samples)}

## 未指派產品圖

${toMarkdownTable(["decodedProductId", "decodedPath", "url", "reason"], unassignedReferencedProductMedia)}
`,
  "utf8"
);

console.log(JSON.stringify(audit, null, 2));
