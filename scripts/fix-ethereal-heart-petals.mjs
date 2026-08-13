import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const productsDir = path.join(process.cwd(), "src", "content", "products");
const productFile = path.join(productsDir, "ethereal-heart-petals.json");
const detailFile = path.join(process.cwd(), "data", "cyberbiz-product-details.json");

const product = JSON.parse(await readFile(productFile, "utf8"));
const details = JSON.parse(await readFile(detailFile, "utf8"));
const source = details.find((item) => item.slug === "ethereal-heart-petals");

if (!source) {
  throw new Error("Missing source detail for ethereal-heart-petals");
}

product.name = "凝光心羽";
product.englishName = "Ethereal Heart Petals";
product.originalDisplayName = "凝光心羽｜Ethereal Heart Petals";
product.category = "粉鑽";
product.collection = "彩色鑽石專區 | 粉鑽";
product.collections = ["彩色鑽石專區", "粉鑽"];
product.productType = "戒指";
product.shortDescription = source.description;
product.description = source.description;
product.seoTitle = "凝光心羽 Ethereal Heart Petals｜水滴形粉鑽戒指｜鑽之韻 DIAMOND SYMPHONY";
product.seoDescription = source.description.replace(/\s+/g, " ").trim();
product.inquiryText = "我想諮詢 凝光心羽｜Ethereal Heart Petals";
product.rawSources = (product.rawSources ?? []).map((rawSource) => (
  rawSource.sourceType === "cyberbiz-product-page"
    ? { ...rawSource, text: source.description }
    : rawSource
));
product.tags = [
  "colored-diamonds",
  "pink-diamonds",
  "other-color-diamonds",
  "ring",
  "unisex",
  "colored-diamond",
  "womens-diamond-rings",
  "classic-womens-rings"
];
product.variants = (product.variants ?? []).map((variant) => ({
  ...variant,
  name: "凝光心羽｜Ethereal Heart Petals",
  optionName: "實驗室培育鑽石"
}));
product.pricingStandards = {
  source: "cyberbiz-product-details",
  materialStatement: "此款價格基於鉑金（PT950）材質的設計。",
  naturalDiamond: "天然鑽款：因彩鑽等級、顏色稀有度與價格差異極大，若有天然彩鑽需求，歡迎洽詢專人，我們將為您提供合適建議與報價。",
  labDiamond: "培育鑽款：5 克拉 Fancy Vivid Pink 等級。",
  notes: [
    "若需升級等級、變更材質或其他客製需求，歡迎洽詢專人服務。"
  ]
};

await writeFile(productFile, `${JSON.stringify(product, null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  slug: product.slug,
  optionName: product.variants?.[0]?.optionName,
  pricingStandards: product.pricingStandards
}, null, 2));
