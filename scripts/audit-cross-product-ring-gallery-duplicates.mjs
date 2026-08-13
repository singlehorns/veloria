import { readdir, readFile } from "node:fs/promises";
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
    slugs.has("engagement-rings")
  );
}

function identity(product) {
  return product.legacyCyberbizId || product.legacyProductId || product.slug;
}

function imageHash(src) {
  const file = path.join(root, "public", src.replace(/^\//, ""));
  if (!fs.existsSync(file)) return "";
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

const byHash = new Map();
const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isRing(product)) continue;

  for (const image of product.images || []) {
    if (image.role === "main") continue;
    const hash = imageHash(image.src);
    if (!hash) continue;
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push({
      slug: product.slug,
      id: identity(product),
      src: image.src
    });
  }
}

const groups = [...byHash.values()].filter((entries) => new Set(entries.map((entry) => entry.id)).size > 1);
console.log(JSON.stringify({ crossProductGalleryDuplicates: groups.length, groups }, null, 2));
