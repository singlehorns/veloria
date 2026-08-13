import { readdir, readFile, writeFile } from "node:fs/promises";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");

function isRing(product) {
  const slugs = new Set(product.collectionSlugs || []);
  if (product.productType === "loose-diamond" || slugs.has("loose-diamonds")) return false;
  return (
    product.productType === "ring" ||
    product.productType === "戒指" ||
    slugs.has("womens-diamond-rings") ||
    slugs.has("mens-diamond-rings") ||
    slugs.has("engagement-rings") ||
    slugs.has("classic-womens-rings") ||
    slugs.has("classic-mens-rings") ||
    slugs.has("fortune-womens-rings") ||
    slugs.has("fortune-mens-rings")
  );
}

function productIdentity(product) {
  return product.legacyCyberbizId || product.legacyProductId || product.slug;
}

function imageHash(src) {
  const file = path.join(root, "public", src.replace(/^\//, ""));
  if (!fs.existsSync(file)) return "";
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const products = [];
const byHash = new Map();

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isRing(product)) continue;
  products.push({ file, product });

  for (const image of product.images || []) {
    const hash = imageHash(image.src);
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({
      slug: product.slug,
      identity: productIdentity(product),
      src: image.src,
      role: image.role || ""
    });
  }
}

const sharedGallerySources = new Set();
const sharedGroups = [];

for (const [hash, entries] of byHash.entries()) {
  const identities = new Set(entries.map((entry) => entry.identity));
  if (identities.size <= 1) continue;

  const galleryEntries = entries.filter((entry) => entry.role !== "main");
  if (!galleryEntries.length) continue;

  for (const entry of galleryEntries) sharedGallerySources.add(entry.src);
  sharedGroups.push({ hash, identities: [...identities], entries });
}

const changed = [];

for (const { file, product } of products) {
  const before = product.images || [];
  const filtered = before.filter((image) => image.role === "main" || !sharedGallerySources.has(image.src));
  if (filtered.length === before.length) continue;

  product.images = filtered.map((image, index) => ({
    ...image,
    role: index === 0 ? "main" : "gallery"
  }));
  product.imageStatus = "localized-api-gallery-cross-product-filtered";
  product.mediaStatus = "localized-api-gallery-cross-product-filtered";

  await writeFile(path.join(productsDir, file), `${JSON.stringify(product, null, 2)}\n`, "utf8");
  changed.push({
    slug: product.slug,
    id: product.legacyProductId,
    before: before.length,
    after: product.images.length,
    removed: before.filter((image) => !filtered.includes(image)).map((image) => image.src)
  });
}

console.log(
  JSON.stringify(
    {
      sharedGroups: sharedGroups.length,
      sharedGalleryImages: sharedGallerySources.size,
      changed: changed.length,
      products: changed
    },
    null,
    2
  )
);
