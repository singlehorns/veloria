import { access, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const outputDir = path.join(root, "output");

function isRing(product) {
  const slugs = new Set(product.collectionSlugs || []);
  const tags = new Set(product.tags || []);
  if (
    product.primaryCategory === "loose-diamonds" ||
    product.productType === "loose-diamond" ||
    slugs.has("loose-diamonds") ||
    tags.has("loose-diamonds")
  ) {
    return false;
  }

  return (
    product.productType === "ring" ||
    product.productType === "戒指" ||
    slugs.has("womens-diamond-rings") ||
    slugs.has("mens-diamond-rings") ||
    slugs.has("engagement-rings") ||
    tags.has("womens-diamond-rings") ||
    tags.has("mens-diamond-rings")
  );
}

function textOf(product) {
  const pricing = product.pricingStandards || {};
  return [
    product.name,
    product.originalDisplayName,
    product.englishName,
    product.description,
    product.specifications,
    product.material,
    product.mainStone,
    product.sideStone,
    pricing.materialStatement,
    pricing.naturalDiamond,
    pricing.labDiamond,
    ...(pricing.notes || [])
  ]
    .filter(Boolean)
    .join("\n");
}

function hasCaratInfo(product) {
  const text = textOf(product);
  return /(克拉|ct\b|carat|GIA|Fancy|VVS|VS|SI|主鑽|培育鑽款|天然鑽款|鑽石規格)/i.test(text);
}

function hasPriceInfo(product) {
  const hasVariantPrice = (product.variants || []).some((variant) => Number(variant.price) > 0);
  const hasDisplayPrice = /NT\$|詢價|訂價|請洽|報價/.test(product.displayPrice || "");
  const pricing = product.pricingStandards || {};
  const hasPricingStandard = Boolean(
    pricing.materialStatement || pricing.naturalDiamond || pricing.labDiamond || (pricing.notes || []).length
  );
  const descriptionHasPriceCue = /(NT\$|此款價格基於|訂價基準|款式價格|請洽|報價|詢價)/.test(product.description || "");
  return hasVariantPrice || hasDisplayPrice || hasPricingStandard || descriptionHasPriceCue;
}

async function existsPublicAsset(src = "") {
  if (!src || /^https?:\/\//i.test(src)) return false;
  const cleanSrc = src.split(/[?#]/)[0].replace(/^\/+/, "");
  const target = path.join(root, "public", cleanSrc.replace(/^assets[\\/]/, "assets/"));
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function uniqueImageSources(images = []) {
  return [...new Set(images.map((image) => image?.src).filter(Boolean))];
}

await writeFile(path.join(outputDir, ".keep"), "", "utf8").catch(async () => {
  await import("node:fs/promises").then((fs) => fs.mkdir(outputDir, { recursive: true }));
});

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const rows = [];

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isRing(product)) continue;

  const imageSources = uniqueImageSources(product.images || []);
  const localStatuses = await Promise.all(imageSources.map(existsPublicAsset));
  const remoteImages = imageSources.filter((src) => /^https?:\/\//i.test(src));
  const missingLocalImages = imageSources.filter((_, index) => !localStatuses[index]);

  const issueCodes = [];
  if (imageSources.length < 3) issueCodes.push("image_count_lt_3");
  if (remoteImages.length) issueCodes.push("remote_images");
  if (missingLocalImages.length) issueCodes.push("missing_local_images");
  if (!hasCaratInfo(product)) issueCodes.push("missing_carat_info");
  if (!hasPriceInfo(product)) issueCodes.push("missing_price_info");

  rows.push({
    slug: product.slug,
    id: product.legacyProductId,
    name: product.originalDisplayName || `${product.name || ""} ${product.englishName || ""}`.trim(),
    primaryCategory: product.primaryCategory,
    collectionSlugs: product.collectionSlugs || [],
    imageCount: imageSources.length,
    remoteImages: remoteImages.length,
    missingLocalImages: missingLocalImages.length,
    hasCaratInfo: hasCaratInfo(product),
    hasPriceInfo: hasPriceInfo(product),
    displayPrice: product.displayPrice || "",
    variants: (product.variants || []).map((variant) => ({
      optionName: variant.optionName || "",
      price: variant.price || 0
    })),
    pricingSource: product.pricingStandards?.source || "",
    issueCodes
  });
}

const failing = rows.filter((row) => row.issueCodes.length);
const summary = {
  totalRingProducts: rows.length,
  passing: rows.length - failing.length,
  issueCounts: failing.reduce((counts, row) => {
    for (const code of row.issueCodes) counts[code] = (counts[code] || 0) + 1;
    return counts;
  }, {}),
  failing
};

await writeFile(path.join(outputDir, "ring-product-readiness-report.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
