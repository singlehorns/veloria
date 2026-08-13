import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const productsDir = path.join(process.cwd(), "src", "content", "products");
const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));

const consultPattern = /(洽詢|另行詢價|報價|價格差異|請洽|需求)/;
const concretePattern = /(\d|克拉|ct|Fancy|D 色|VVS|SI|I1|等級)/i;
const diamondRingPattern = /(rings|diamond|粉鑽|黃鑽|藍鑽|紅鑽|綠鑽|彩鑽|戒)/;

const suspicious = [];

for (const file of files) {
  const product = JSON.parse(await readFile(path.join(productsDir, file), "utf8"));
  const variants = product.variants ?? [];
  if (!variants.length) continue;

  const pricingStandards = product.pricingStandards ?? {};
  const natural = pricingStandards.naturalDiamond ?? "";
  const lab = pricingStandards.labDiamond ?? "";
  const searchText = [
    product.category,
    ...(product.subcategories ?? []),
    product.productType,
    product.type
  ].filter(Boolean).join("|");

  const shouldBeLabSingleVariant =
    variants.length === 1 &&
    variants[0].optionName === "天然鑽石" &&
    consultPattern.test(natural) &&
    concretePattern.test(lab) &&
    !consultPattern.test(lab);

  if (shouldBeLabSingleVariant) {
    suspicious.push({
      slug: product.slug,
      id: product.legacyProductId,
      category: product.category,
      price: variants[0].price,
      currentOptionName: variants[0].optionName,
      expectedOptionName: "實驗室培育鑽石",
      natural,
      lab,
      isDiamondRing: diamondRingPattern.test(searchText)
    });
  }
}

console.log(JSON.stringify(suspicious, null, 2));
console.error(`count=${suspicious.length}`);
