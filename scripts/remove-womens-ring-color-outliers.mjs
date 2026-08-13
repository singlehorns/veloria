import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const reportPath = path.join(process.cwd(), "output", "womens-ring-gallery-color-outliers.json");
const productsDir = path.join(process.cwd(), "src", "content", "products");

const report = JSON.parse(await readFile(reportPath, "utf8"));
const changed = [];

for (const row of report.report || []) {
  const productFile = path.join(productsDir, `${row.slug}.json`);
  const product = JSON.parse(await readFile(productFile, "utf8"));
  const removeSources = new Set((row.outliers || []).map((outlier) => outlier.src));
  const before = product.images || [];
  const filtered = before.filter((image) => !removeSources.has(image.src));

  if (filtered.length === before.length) continue;

  product.images = filtered.map((image, index) => ({
    ...image,
    role: index === 0 ? "main" : "gallery"
  }));
  product.imageStatus = "localized-api-gallery-color-filtered";
  product.mediaStatus = "localized-api-gallery-color-filtered";

  await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");
  changed.push({
    slug: product.slug,
    id: product.legacyProductId,
    before: before.length,
    after: product.images.length,
    removed: [...removeSources]
  });
}

console.log(JSON.stringify({ changed: changed.length, products: changed }, null, 2));
