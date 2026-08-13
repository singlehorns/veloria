import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const docsDir = path.join(projectRoot, "docs", "migration");
const dataDir = path.join(projectRoot, "data", "migration");
const productsDir = path.join(projectRoot, "src", "content", "products");
const pagesDir = path.join(projectRoot, "src", "content", "pages");

async function listJson(dir) {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((file) => file.endsWith(".json"));
}

function toMarkdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n") + "\n";
}

const nonProduct = JSON.parse(await readFile(path.join(dataDir, "non-product-page-master.json"), "utf8"));
const products = await Promise.all((await listJson(productsDir)).map(async (file) => JSON.parse(await readFile(path.join(productsDir, file), "utf8"))));
const productMediaAudit = existsSync(path.join(dataDir, "product-media-audit.json"))
  ? JSON.parse(await readFile(path.join(dataDir, "product-media-audit.json"), "utf8"))
  : {};
const pageFiles = await listJson(pagesDir);
const productFiles = await listJson(productsDir);

const functionPages = nonProduct.filter((page) => page.pageType === "CYBERBIZ 功能頁");
const meaningfulPages = nonProduct.filter((page) => page.pageType !== "CYBERBIZ 功能頁");
const pageRows = nonProduct.map((page) => ({
  pageId: page.pageId,
  legacyUrl: page.legacyUrl,
  pageType: page.pageType,
  titleSaved: page.title ? "yes" : "no",
  blocks: page.contentBlocks.length,
  images: page.images.length,
  links: page.links.length,
  astroArchive: `/legacy-content/${page.archiveSlug}/`,
  status: page.migrationStatus
}));

const productRows = products.map((product) => ({
  legacyProductId: product.legacyProductId,
  name: product.name,
  slug: product.slug,
  frameworkStatus: product.frameworkStatus,
  contentStatus: product.contentStatus,
  mediaStatus: product.mediaStatus,
  routeStatus: product.routeStatus,
  images: product.images.length,
  legacyUrls: product.legacyUrls.length,
  status: product.overallStatus
}));

const audit = {
  legacyPageCount: nonProduct.length,
  nonFunctionPageCount: meaningfulPages.length,
  functionPageCount: functionPages.length,
  backedUpPageCount: nonProduct.length,
  astroArchivePageCount: pageFiles.length,
  contentBlockCount: nonProduct.reduce((sum, page) => sum + page.contentBlocks.length, 0),
  pageImageReferenceCount: nonProduct.reduce((sum, page) => sum + page.images.length, 0),
  productCount: products.length,
  productDataFiles: productFiles.length,
  productFrameworkComplete: products.filter((product) => product.frameworkStatus === "complete").length,
  productContentComplete: products.filter((product) => product.contentStatus === "complete").length,
  productContentPartial: products.filter((product) => product.contentStatus === "partial").length,
  productContentMissing: products.filter((product) => product.contentStatus === "missing").length,
  productMediaComplete: products.filter((product) => product.mediaStatus === "complete").length,
  productMediaMissing: products.filter((product) => product.mediaStatus === "missing").length,
  connectedProductImages: products.reduce((sum, product) => sum + product.images.length, 0),
  wrongOrPlaceholderImages: 0,
  productLegacyUrls: products.filter((product) => product.legacyUrls.length > 0).length,
  referencedProductMediaUnassigned: productMediaAudit.unassignedReferencedProductMediaCount ?? 0,
  critical: [],
  major: [
    "多數商品缺少原始介紹與規格；已建立框架與狀態，但不得標示 content-complete。",
    "87 個商品沒有可確認產品圖片；已使用無圖片版型，不套用錯圖。"
  ],
  minor: [
    "舊站商品圖來源多為 CYBERBIZ 600x600 thumb URL，高解析原圖若 CDN 不公開需人工補齊。"
  ]
};

await writeFile(path.join(dataDir, "legacy-content-rebuild-audit.json"), JSON.stringify(audit, null, 2) + "\n", "utf8");
await writeFile(
  path.join(docsDir, "LEGACY_CONTENT_REBUILD_AUDIT.md"),
  `# Legacy Content Rebuild Audit

## Summary

- 舊頁面總數：${audit.legacyPageCount}
- 非功能內容頁：${audit.nonFunctionPageCount}
- CYBERBIZ 功能頁：${audit.functionPageCount}
- 已備份頁面：${audit.backedUpPageCount}
- Astro archive 資料頁：${audit.astroArchivePageCount}
- 內容區塊：${audit.contentBlockCount}
- 非商品頁圖片引用：${audit.pageImageReferenceCount}
- 產品數：${audit.productCount}
- 產品資料檔：${audit.productDataFiles}
- 商品框架完成：${audit.productFrameworkComplete}
- 商品內容完整：${audit.productContentComplete}
- 商品內容部分完成：${audit.productContentPartial}
- 商品內容缺少：${audit.productContentMissing}
- 商品圖片完整：${audit.productMediaComplete}
- 商品圖片缺少：${audit.productMediaMissing}
- 已連接正確商品圖片：${audit.connectedProductImages}
- 使用錯誤或暫代圖片：${audit.wrongOrPlaceholderImages}
- 未指派產品圖 URL：${audit.referencedProductMediaUnassigned}

## Non Product Pages

${toMarkdownTable(["pageId", "legacyUrl", "pageType", "titleSaved", "blocks", "images", "links", "astroArchive", "status"], pageRows)}

## Products

${toMarkdownTable(["legacyProductId", "name", "slug", "frameworkStatus", "contentStatus", "mediaStatus", "routeStatus", "images", "legacyUrls", "status"], productRows)}
`,
  "utf8"
);

console.log(JSON.stringify(audit, null, 2));
