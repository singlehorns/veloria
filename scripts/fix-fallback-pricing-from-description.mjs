import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const productsDir = path.join(process.cwd(), "src", "content", "products");

function normalizeLine(line = "") {
  return line
    .replace(/^[◆🔹💎⚠️📩\-\u25c6\u25cf\u2022]+\s*/u, "")
    .replace(/\s+/g, " ")
    .replace(/\s*：\s*/g, "：")
    .trim();
}

function extractPricing(description = "") {
  const lines = description
    .split(/\n+/)
    .map(normalizeLine)
    .filter(Boolean);

  const materialIndex = lines.findIndex((line) => /此款價格基於/.test(line));
  if (materialIndex < 0) return null;

  const pricingLines = [];
  for (const line of lines.slice(materialIndex)) {
    if (/Request an Appointment|LINE 諮詢|線上專員服務|客服中心|購買與諮詢請透過/.test(line)) break;
    pricingLines.push(line);
  }

  const materialStatement = pricingLines.find((line) => /此款價格基於/.test(line)) ?? "";
  const naturalDiamond = pricingLines.find((line) => /天然.*鑽.*款/.test(line)) ?? "";
  const labDiamond = pricingLines.find((line) => /培育.*鑽.*款/.test(line)) ?? "";
  const notes = pricingLines.filter((line) => (
    line !== materialStatement &&
    line !== naturalDiamond &&
    line !== labDiamond &&
    !/為確保服務品質|本商品需依據/.test(line)
  ));

  if (!materialStatement && !naturalDiamond && !labDiamond && !notes.length) return null;

  return {
    source: "description",
    materialStatement,
    naturalDiamond,
    labDiamond,
    notes
  };
}

function shouldSingleVariantBeLab(product, pricingStandards) {
  const variants = product.variants ?? [];
  if (variants.length !== 1) return false;
  if (!pricingStandards.labDiamond) return false;
  if (!pricingStandards.naturalDiamond) return true;
  return /(另行詢價|洽詢|報價|價格差異極大)/.test(pricingStandards.naturalDiamond);
}

const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));
const changed = [];

for (const file of files) {
  const productFile = path.join(productsDir, file);
  const product = JSON.parse(await readFile(productFile, "utf8"));

  if (product.pricingStandards?.source !== "fallback") continue;

  const pricingStandards = extractPricing(product.description || product.shortDescription || "");
  if (!pricingStandards) continue;

  product.pricingStandards = pricingStandards;

  if (shouldSingleVariantBeLab(product, pricingStandards)) {
    product.variants = (product.variants ?? []).map((variant) => ({
      ...variant,
      optionName: "實驗室培育鑽石"
    }));
  }

  await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");
  changed.push({
    slug: product.slug,
    id: product.legacyProductId,
    optionNames: (product.variants ?? []).map((variant) => variant.optionName),
    materialStatement: pricingStandards.materialStatement,
    naturalDiamond: pricingStandards.naturalDiamond,
    labDiamond: pricingStandards.labDiamond
  });
}

console.log(JSON.stringify(changed, null, 2));
console.error(`changed=${changed.length}`);
