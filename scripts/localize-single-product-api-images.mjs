import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const [slug] = process.argv.slice(2);

if (!slug) {
  console.error("Usage: node scripts/localize-single-product-api-images.mjs <product-slug>");
  process.exit(1);
}

const projectRoot = process.cwd();
const productFile = path.join(projectRoot, "src", "content", "products", `${slug}.json`);
const product = JSON.parse(await readFile(productFile, "utf8"));

function normalizeRemoteUrl(url = "") {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function apiUrlFromProductUrl(rawUrl = "") {
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

const apiUrl = apiUrlFromProductUrl(product.originalUrl || product.canonicalUrl);
const response = await fetch(apiUrl, {
  headers: {
    accept: "application/json",
    "user-agent": "Mozilla/5.0 single-product-image-localizer"
  }
});

if (!response.ok) {
  throw new Error(`Unable to fetch ${apiUrl}: HTTP ${response.status}`);
}

const apiProduct = await response.json();
const galleryUrls = (apiProduct.photo_urls || []).map(bestPhotoUrl).filter(Boolean);

if (!galleryUrls.length) {
  throw new Error(`No gallery images found for ${slug}`);
}

const folderName = `${product.legacyProductId}-${product.slug}`;
const targetFolder = path.join(projectRoot, "public", "assets", "migrated", "products", folderName, "localized");
await mkdir(targetFolder, { recursive: true });

const localizedImages = [];

for (let index = 0; index < galleryUrls.length; index += 1) {
  const sourceUrl = galleryUrls[index];
  const role = index === 0 ? "main" : "gallery";
  const targetName = `${product.legacyProductId}-${role}-${String(index + 1).padStart(2, "0")}${extFromUrl(sourceUrl)}`;
  const target = path.join(targetFolder, targetName);
  const imageResponse = await fetch(sourceUrl);

  if (!imageResponse.ok) {
    throw new Error(`Unable to download ${sourceUrl}: HTTP ${imageResponse.status}`);
  }

  await writeFile(target, Buffer.from(await imageResponse.arrayBuffer()));
  localizedImages.push({
    src: `/assets/migrated/products/${folderName}/localized/${targetName}`,
    alt: `${product.name || product.originalDisplayName || product.englishName || product.slug} ${index + 1}`,
    role
  });
}

product.images = localizedImages;
product.imageStatus = "localized-api-gallery";
product.mediaStatus = "localized-api-gallery";
product.liveProductImageFolderId = String(apiProduct.id || product.liveProductImageFolderId || product.legacyCyberbizId || "");

await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      slug,
      apiUrl,
      images: localizedImages.length,
      files: localizedImages.map((image) => image.src)
    },
    null,
    2
  )
);
