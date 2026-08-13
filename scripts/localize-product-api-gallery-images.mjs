import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const projectRoot = process.cwd();
const productContentRoot = path.join(projectRoot, "src", "content", "products");
const productAssetRoot = path.join(projectRoot, "public", "assets", "migrated", "products");
const reportPath = path.join(projectRoot, "data", "migration", "localized-product-api-gallery-report.json");
const fallbackImage = "/assets/brand/brand-logo-primary.png";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function normalizeRemoteUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function publicPathFromProjectRelative(file) {
  return `/${normalizeSlash(file).replace(/^public\//, "")}`;
}

function extFromUrl(url) {
  try {
    const ext = path.extname(new URL(normalizeRemoteUrl(url)).pathname).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].includes(ext)) return ext;
  } catch {
    // Fall through.
  }
  return ".png";
}

function apiUrlFromProductUrl(rawUrl = "") {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/$/, "") + ".json";
    return url.toString();
  } catch {
    return "";
  }
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

function sourceFileKey(src = "") {
  const decoded = decodeMediaToken(normalizeRemoteUrl(src));
  return decoded.match(/\["f","([^"]+)/)?.[1] || decoded || src;
}

function bestPhotoUrl(photo = {}) {
  return normalizeRemoteUrl(photo.maximum || photo.original || photo.grande || photo.large || photo.medium || "");
}

function extractGalleryImages(apiProduct) {
  const photoUrls = Array.isArray(apiProduct.photo_urls)
    ? apiProduct.photo_urls
    : Array.isArray(apiProduct.photoUrls)
      ? apiProduct.photoUrls
      : [];
  const candidates = photoUrls.length ? photoUrls : [apiProduct.featured_image || apiProduct.featuredImage || {}];
  const bySourceFile = new Map();

  for (const photo of candidates) {
    const src = bestPhotoUrl(photo);
    if (!src) continue;
    const key = sourceFileKey(src);
    if (!bySourceFile.has(key)) bySourceFile.set(key, src);
  }

  return [...bySourceFile.values()];
}

async function fetchJsonWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 product-api-gallery-localizer"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
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
  const productFiles = (await readdir(productContentRoot)).filter((file) => file.endsWith(".json"));
  const changedProducts = [];
  const skipped = [];
  const failed = [];
  const failedDownloads = [];
  let fetched = 0;
  let downloaded = 0;
  let existing = 0;
  let fallback = 0;
  let totalImages = 0;

  for (const fileName of productFiles) {
    const file = path.join(productContentRoot, fileName);
    const product = JSON.parse(await readFile(file, "utf8"));
    const apiUrl = apiUrlFromProductUrl(product.originalUrl || product.canonicalUrl || "");

    if (!apiUrl) {
      skipped.push({ slug: product.slug, reason: "missing-api-url" });
      continue;
    }

    try {
      const apiProduct = await fetchJsonWithRetry(apiUrl);
      fetched += 1;
      const galleryUrls = extractGalleryImages(apiProduct);
      if (!galleryUrls.length) {
        skipped.push({ slug: product.slug, reason: "no-api-gallery-images", apiUrl });
        continue;
      }

      const folderName = `${product.legacyProductId || createHash("sha1").update(product.slug).digest("hex").slice(0, 8)}-${product.slug}`;
      const targetFolder = path.join(productAssetRoot, folderName, "localized");
      await mkdir(targetFolder, { recursive: true });

      const localizedImages = [];
      let productFallback = 0;
      for (let index = 0; index < galleryUrls.length; index += 1) {
        const sourceUrl = galleryUrls[index];
        const role = index === 0 ? "main" : "gallery";
        const target = path.join(
          targetFolder,
          `${product.legacyProductId || "product"}-${role}-${String(index + 1).padStart(2, "0")}${extFromUrl(sourceUrl)}`
        );
        const relTarget = normalizeSlash(path.relative(projectRoot, target));
        let src = publicPathFromProjectRelative(relTarget);

        try {
          const result = await download(sourceUrl, target);
          if (result === "downloaded") downloaded += 1;
          else existing += 1;
        } catch (error) {
          src = fallbackImage;
          fallback += 1;
          productFallback += 1;
          failedDownloads.push({ slug: product.slug, url: sourceUrl, error: error.message });
        }

        localizedImages.push({
          src,
          alt: `${product.originalDisplayName || product.name || product.englishName || product.slug} ${index + 1}`,
          role
        });
      }

      product.images = localizedImages;
      product.imageStatus = productFallback ? "localized-api-gallery-with-fallbacks" : "localized-api-gallery";
      product.mediaStatus = productFallback ? "localized-api-gallery-with-fallbacks" : "localized-api-gallery";
      product.liveProductImageFolderId = String(apiProduct.id || product.liveProductImageFolderId || product.legacyCyberbizId || "");
      await writeFile(file, `${JSON.stringify(product, null, 2)}\n`, "utf8");
      totalImages += localizedImages.length;
      changedProducts.push({ slug: product.slug, images: localizedImages.length, apiUrl });
      await sleep(90);
    } catch (error) {
      failed.push({ slug: product.slug, apiUrl, error: error.message });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    productFiles: productFiles.length,
    fetched,
    changedProducts: changedProducts.length,
    totalImages,
    downloaded,
    existing,
    fallback,
    skipped,
    failed,
    failedDownloads,
    changedProductsDetail: changedProducts
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

await main();
