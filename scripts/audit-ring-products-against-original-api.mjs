import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const outputDir = path.join(root, "output");

function isLooseDiamond(product) {
  const slugs = new Set(product.collectionSlugs || []);
  const tags = new Set(product.tags || []);
  return (
    product.primaryCategory === "loose-diamonds" ||
    product.productType === "loose-diamond" ||
    slugs.has("loose-diamonds") ||
    tags.has("loose-diamonds")
  );
}

function isRing(product) {
  if (isLooseDiamond(product)) return false;
  const slugs = new Set(product.collectionSlugs || []);
  const tags = new Set(product.tags || []);
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

function originalApiUrl(product) {
  const raw = product.originalUrl || product.canonicalUrl || product.legacyUrls?.[0] || "";
  if (!raw) return "";
  const url = new URL(raw);
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\/$/, "") + ".json";
  return url.toString();
}

function uniqueLocalImages(product) {
  return [...new Set((product.images || []).map((image) => image?.src).filter(Boolean))];
}

async function isExistingLocalImage(src = "") {
  if (!src || /^https?:\/\//i.test(src)) return false;
  const target = path.join(root, "public", src.split(/[?#]/)[0].replace(/^\/+/, ""));
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

function textOf(product) {
  const pricing = product.pricingStandards || {};
  return [
    product.description,
    product.specifications,
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

function hasCaratInfoInText(text = "") {
  return /(克拉|ct\b|carat|GIA|Fancy|VVS|VS|SI|主鑽|培育鑽款|天然鑽款|鑽石規格)/i.test(text);
}

function hasLocalPrice(product) {
  return (
    (product.variants || []).some((variant) => Number(variant.price) > 0) ||
    /NT\$|詢價|訂價|請洽|報價/.test(product.displayPrice || "") ||
    Boolean(product.pricingStandards?.materialStatement || product.pricingStandards?.naturalDiamond || product.pricingStandards?.labDiamond)
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0 ring-product-audit"
    }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

await mkdir(outputDir, { recursive: true });

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const rows = [];

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isRing(product)) continue;

  const apiUrl = originalApiUrl(product);
  const localImages = uniqueLocalImages(product);
  const localImageStatuses = await Promise.all(localImages.map(isExistingLocalImage));
  const remoteLocalImages = localImages.filter((src) => /^https?:\/\//i.test(src));
  const missingLocalImages = localImages.filter((_, index) => !localImageStatuses[index]);
  const issueCodes = [];
  let api = null;
  let apiError = "";

  try {
    api = await fetchJson(apiUrl);
  } catch (error) {
    apiError = error.message;
    issueCodes.push("api_fetch_failed");
  }

  const apiImageCount = api?.photo_urls?.length || 0;
  const apiVariantPrices = (api?.variants || []).map((variant) => Number(variant.price || 0));
  const apiHasPrice = apiVariantPrices.some((price) => price > 0);
  const apiHasCaratInfo = hasCaratInfoInText(`${api?.description || ""}\n${api?.specifications || ""}`);
  const localHasCaratInfo = hasCaratInfoInText(textOf(product));

  if (localImages.length < 3) issueCodes.push("local_image_count_lt_3");
  if (apiImageCount >= 3 && localImages.length !== apiImageCount) issueCodes.push("image_count_differs_from_api");
  if (remoteLocalImages.length) issueCodes.push("local_image_remote_url");
  if (missingLocalImages.length) issueCodes.push("local_image_missing_file");
  if (apiHasCaratInfo && !localHasCaratInfo) issueCodes.push("missing_local_carat_info");
  if (apiHasPrice && !hasLocalPrice(product)) issueCodes.push("missing_local_price");

  rows.push({
    slug: product.slug,
    id: product.legacyProductId,
    originalApiUrl: apiUrl,
    apiTitle: api?.title || "",
    localImageCount: localImages.length,
    apiImageCount,
    remoteLocalImages: remoteLocalImages.length,
    missingLocalImages: missingLocalImages.length,
    localHasCaratInfo,
    apiHasCaratInfo,
    localHasPrice: hasLocalPrice(product),
    apiHasPrice,
    localPrice: product.displayPrice || "",
    apiPrices: apiVariantPrices,
    apiError,
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

await writeFile(path.join(outputDir, "ring-products-original-api-audit.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
