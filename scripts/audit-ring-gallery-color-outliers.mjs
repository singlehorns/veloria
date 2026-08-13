import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const outputDir = path.join(root, "output");

function isTargetProduct(product) {
  const slugs = new Set(product.collectionSlugs || []);
  return product.primaryCategory === "womens-diamond-rings" || slugs.has("womens-diamond-rings");
}

async function imageMetrics(src) {
  const file = path.join(root, "public", src.replace(/^\//, ""));
  const { data, info } = await sharp(file)
    .resize(180, 180, { fit: "contain", background: "#fff" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let jewelry = 0;
  let warm = 0;
  let cool = 0;
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const saturation = max - min;
    const notWhite = max < 246 || saturation > 18;
    if (!notWhite) continue;

    jewelry += 1;
    sumR += r;
    sumG += g;
    sumB += b;

    if (r > g * 0.95 && g > b * 1.12 && r > b * 1.18) warm += 1;
    if (Math.abs(r - g) < 24 && Math.abs(g - b) < 30 && max > 115) cool += 1;
  }

  return {
    jewelry,
    warmRatio: jewelry ? warm / jewelry : 0,
    coolRatio: jewelry ? cool / jewelry : 0,
    meanR: jewelry ? sumR / jewelry : 0,
    meanG: jewelry ? sumG / jewelry : 0,
    meanB: jewelry ? sumB / jewelry : 0
  };
}

await mkdir(outputDir, { recursive: true });

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const report = [];

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  if (!isTargetProduct(product)) continue;

  const images = product.images || [];
  const metrics = [];
  for (const image of images) {
    metrics.push(await imageMetrics(image.src));
  }

  const main = metrics[0] || {};
  const outliers = metrics
    .map((metric, index) => ({ index: index + 1, src: images[index]?.src, ...metric }))
    .filter((metric, index) => {
      if (index === 0) return false;
      const mainLooksSilver = (main.warmRatio || 0) < 0.18;
      const imageLooksGold = metric.warmRatio > 0.28 && metric.warmRatio > (main.warmRatio || 0) + 0.18;
      return mainLooksSilver && imageLooksGold;
    });

  if (outliers.length) {
    report.push({
      slug: product.slug,
      id: product.legacyProductId,
      name: product.originalDisplayName || product.name || product.slug,
      main,
      outliers
    });
  }
}

const summary = {
  totalOutlierProducts: report.length,
  report
};

await writeFile(path.join(outputDir, "womens-ring-gallery-color-outliers.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
console.log(JSON.stringify(summary, null, 2));
