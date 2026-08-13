import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const productsDir = path.join(process.cwd(), "src", "content", "products");

function cleanLine(value = "") {
  return value
    .replace(/^[\s◆🔹💎⚠️📩\-•]+/u, "")
    .replace(/\s*：\s*/g, "：")
    .replace(/\s+/g, " ")
    .trim();
}

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const changed = [];

for (const file of files) {
  const productFile = path.join(productsDir, file);
  const product = JSON.parse(await readFile(productFile, "utf8"));
  const pricing = product.pricingStandards;
  if (!pricing) continue;

  const nextPricing = {
    ...pricing,
    materialStatement: cleanLine(pricing.materialStatement),
    naturalDiamond: cleanLine(pricing.naturalDiamond),
    labDiamond: cleanLine(pricing.labDiamond),
    notes: (pricing.notes ?? []).map(cleanLine).filter(Boolean)
  };

  if (JSON.stringify(nextPricing) === JSON.stringify(pricing)) continue;

  product.pricingStandards = nextPricing;
  await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");
  changed.push(product.slug);
}

console.log(JSON.stringify(changed, null, 2));
console.error(`changed=${changed.length}`);
