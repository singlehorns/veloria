import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const productsDir = path.join(process.cwd(), "src", "content", "products");
const files = (await readdir(productsDir)).filter((file) => file.endsWith(".json"));

const consultPattern = /(洽詢|另行詢價|報價|價格差異|請洽|需求)/;
const concretePattern = /(\d|克拉|ct|Fancy|D 色|VVS|SI|I1|等級)/i;

const changed = [];

for (const file of files) {
  const productFile = path.join(productsDir, file);
  const product = JSON.parse(await readFile(productFile, "utf8"));
  const variants = product.variants ?? [];
  if (variants.length !== 1 || variants[0].optionName !== "天然鑽石") continue;

  const pricingStandards = product.pricingStandards ?? {};
  const natural = pricingStandards.naturalDiamond ?? "";
  const lab = pricingStandards.labDiamond ?? "";

  const shouldBeLabSingleVariant =
    consultPattern.test(natural) &&
    concretePattern.test(lab) &&
    !consultPattern.test(lab);

  if (!shouldBeLabSingleVariant) continue;

  product.variants = [
    {
      ...variants[0],
      optionName: "實驗室培育鑽石"
    }
  ];

  await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");
  changed.push({
    slug: product.slug,
    id: product.legacyProductId,
    price: variants[0].price
  });
}

console.log(JSON.stringify(changed, null, 2));
console.error(`changed=${changed.length}`);
