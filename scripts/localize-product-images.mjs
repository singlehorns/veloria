import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const productContentRoot = path.join(projectRoot, "src", "content", "products");
const productAssetRoot = path.join(projectRoot, "public", "assets", "migrated", "products");
const reportPath = path.join(projectRoot, "data", "migration", "localized-product-images-report.json");
const detailsPath = path.join(projectRoot, "data", "cyberbiz-product-details.json");
const fallbackImage = "/assets/brand/brand-logo-primary.png";

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function publicPathFromProjectRelative(file) {
  return `/${normalizeSlash(file).replace(/^public\//, "")}`;
}

function extFromUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  } catch {
    // Fall through.
  }
  return ".png";
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

function productFolderIdFromMedia(src = "") {
  return decodeMediaToken(src).match(/\/products\/([^/]+)\//)?.[1] || "";
}

function sourceFileKey(src = "") {
  const decoded = decodeMediaToken(src);
  return decoded.match(/\["f","([^"]+)/)?.[1] || decoded || src;
}

function thumbArea(src = "") {
  const decoded = decodeMediaToken(src);
  const size = decoded.match(/\["p","thumb","(\d+)x(\d+)"\]/);
  return size ? Number(size[1]) * Number(size[2]) : 0;
}

function productOnlyImages(detail, product) {
  const expectedFolderIds = [
    product.liveProductImageFolderId,
    product.legacyCyberbizId,
    detail.liveProductImageFolderId,
    detail.legacyCyberbizId,
    detail.productId,
    detail.id
  ]
    .filter(Boolean)
    .map(String);
  const images = Array.isArray(detail.images) ? detail.images : [];
  const matchingImages = expectedFolderIds.length
    ? images.filter((image) => expectedFolderIds.includes(productFolderIdFromMedia(image.src)))
    : images.filter((image) => !productFolderIdFromMedia(image.src));

  const bySourceFile = new Map();
  for (const image of matchingImages) {
    const key = sourceFileKey(image.src);
    const previous = bySourceFile.get(key);
    if (!previous || thumbArea(image.src) > thumbArea(previous.src)) {
      bySourceFile.set(key, image);
    }
  }

  return [...bySourceFile.values()].sort((a, b) => sourceFileKey(a.src).localeCompare(sourceFileKey(b.src), undefined, { numeric: true }));
}

async function download(url, target) {
  if (existsSync(target)) {
    const fileStat = await stat(target);
    if (fileStat.size > 0) return "existing";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error("empty response");
    await writeFile(target, bytes);
    return "downloaded";
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const details = JSON.parse(await readFile(detailsPath, "utf8"));
  const detailsBySlug = new Map(details.map((item) => [item.slug, item]));
  const productFiles = (await readdir(productContentRoot)).filter((file) => file.endsWith(".json"));
  const changedProducts = [];
  const missingDetails = [];
  const noMatchingImages = [];
  const failedDownloads = [];
  let downloaded = 0;
  let existing = 0;
  let fallback = 0;
  let removedMixedImages = 0;

  for (const fileName of productFiles) {
    const file = path.join(productContentRoot, fileName);
    const product = JSON.parse(await readFile(file, "utf8"));
    const detail = detailsBySlug.get(product.slug);
    if (!detail?.images?.length) {
      missingDetails.push(product.slug);
      continue;
    }
    const productImages = productOnlyImages(detail, product);
    if (!productImages.length) {
      noMatchingImages.push({
        slug: product.slug,
        legacyCyberbizId: product.legacyCyberbizId || "",
        detailImages: detail.images.length
      });
      continue;
    }
    removedMixedImages += Math.max(0, detail.images.length - productImages.length);

    const folderName = `${product.legacyProductId || createHash("sha1").update(product.slug).digest("hex").slice(0, 8)}-${product.slug}`;
    const targetFolder = path.join(productAssetRoot, folderName, "localized");
    await mkdir(targetFolder, { recursive: true });

    const localizedImages = [];
    let productFallback = 0;
    for (let index = 0; index < productImages.length; index += 1) {
      const source = productImages[index];
      const previous = product.images?.[index] || {};
      const role = index === 0 ? "main" : "gallery";
      const target = path.join(
        targetFolder,
        `${product.legacyProductId || "product"}-${role}-${String(index + 1).padStart(2, "0")}${extFromUrl(source.src)}`
      );
      const relTarget = normalizeSlash(path.relative(projectRoot, target));
      let src = publicPathFromProjectRelative(relTarget);

      try {
        const result = await download(source.src, target);
        if (result === "downloaded") downloaded += 1;
        else existing += 1;
      } catch (error) {
        src = fallbackImage;
        fallback += 1;
        productFallback += 1;
        failedDownloads.push({ slug: product.slug, url: source.src, error: error.message });
      }

      localizedImages.push({
        src,
        alt: previous.alt || source.alt || `${product.name || product.englishName || product.slug} ${index + 1}`,
        role: previous.role || source.role || role
      });
    }

    product.images = localizedImages;
    product.imageStatus = productFallback ? "localized-product-only-with-fallbacks" : "localized-product-only";
    product.mediaStatus = productFallback ? "localized-product-only-with-fallbacks" : "localized-product-only";
    await writeFile(file, JSON.stringify(product, null, 2) + "\n", "utf8");
    changedProducts.push(product.slug);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    productFiles: productFiles.length,
    changedProducts: changedProducts.length,
    downloaded,
    existing,
    fallback,
    removedMixedImages,
    missingDetails,
    noMatchingImages,
    failedDownloads
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));
}

await main();
