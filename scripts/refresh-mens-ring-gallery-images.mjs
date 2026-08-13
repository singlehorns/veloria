import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const outputDir = path.join(root, "output");

function isMensRing(product) {
  const slugs = new Set(product.collectionSlugs || []);
  return (
    product.primaryCategory === "mens-diamond-rings" ||
    slugs.has("mens-diamond-rings") ||
    slugs.has("classic-mens-rings") ||
    slugs.has("fortune-mens-rings")
  );
}

function normalizeRemoteUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
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

function extFromUrl(url) {
  const ext = path.extname(new URL(normalizeRemoteUrl(url)).pathname).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"].includes(ext) ? ext : ".png";
}

function bestPhotoUrl(photo = {}) {
  return normalizeRemoteUrl(photo.maximum || photo.original || photo.grande || photo.large || photo.medium || "");
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
  const decoded = decodeMediaToken(src);
  return decoded.match(/\["f","([^"]+)/)?.[1] || src.split("?")[0];
}

function productDisplayName(product) {
  return product.originalDisplayName || [product.name, product.englishName].filter(Boolean).join("｜") || product.slug;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 mens-ring-gallery-refresh"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function download(url, target) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 mens-ring-gallery-refresh"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  await writeFile(target, Buffer.from(await response.arrayBuffer()));
}

await mkdir(outputDir, { recursive: true });

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const report = [];

for (const file of files) {
  const productFile = path.join(productsDir, file);
  const product = JSON.parse(await readFile(productFile, "utf8"));
  if (!isMensRing(product)) continue;

  const apiUrl = apiUrlFromProduct(product);
  if (!apiUrl) {
    report.push({ slug: product.slug, status: "skipped-no-url" });
    continue;
  }

  try {
    const apiProduct = await fetchJson(apiUrl);
    const uniquePhotos = [];
    const seenKeys = new Set();

    for (const photo of apiProduct.photo_urls || []) {
      const sourceUrl = bestPhotoUrl(photo);
      const key = sourceFileKey(sourceUrl);
      if (!sourceUrl || seenKeys.has(key)) continue;
      seenKeys.add(key);
      uniquePhotos.push({ sourceUrl, key });
    }

    if (!uniquePhotos.length) {
      report.push({ slug: product.slug, status: "no-photos", apiUrl });
      continue;
    }

    const folderName = `${product.legacyProductId}-${product.slug}`;
    const targetFolder = path.join(root, "public", "assets", "migrated", "products", folderName, "localized");
    await mkdir(targetFolder, { recursive: true });

    const localizedImages = [];
    for (let index = 0; index < uniquePhotos.length; index += 1) {
      const { sourceUrl } = uniquePhotos[index];
      const role = index === 0 ? "main" : "gallery";
      const targetName = `${product.legacyProductId}-${role}-${String(index + 1).padStart(2, "0")}${extFromUrl(sourceUrl)}`;
      const target = path.join(targetFolder, targetName);
      await download(sourceUrl, target);
      localizedImages.push({
        src: `/assets/migrated/products/${folderName}/localized/${targetName}`,
        alt: `${productDisplayName(product)} ${index + 1}`,
        role
      });
    }

    product.images = localizedImages;
    product.imageStatus = "localized-api-gallery-deduped";
    product.mediaStatus = "localized-api-gallery-deduped";
    product.liveProductImageFolderId = String(apiProduct.id || product.liveProductImageFolderId || product.legacyCyberbizId || "");

    await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");
    report.push({
      slug: product.slug,
      id: product.legacyProductId,
      status: "updated",
      apiPhotoCount: (apiProduct.photo_urls || []).length,
      uniquePhotoCount: uniquePhotos.length,
      localImageCount: localizedImages.length
    });
  } catch (error) {
    report.push({ slug: product.slug, status: "failed", apiUrl, error: error.message });
  }
}

const summary = {
  total: report.length,
  updated: report.filter((row) => row.status === "updated").length,
  failed: report.filter((row) => row.status === "failed").length,
  withLessThanThree: report.filter((row) => row.status === "updated" && row.localImageCount < 3),
  report
};

await writeFile(path.join(outputDir, "mens-ring-gallery-refresh-report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
