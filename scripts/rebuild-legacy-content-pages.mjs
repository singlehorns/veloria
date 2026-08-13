import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const workspaceRoot = path.resolve(projectRoot, "..");
const backupRoot = path.join(workspaceRoot, "dsdiamond_backup");
const routesPath = path.join(backupRoot, "migration", "routes.json");
const productMasterPath = path.join(projectRoot, "data", "migration", "product-master.json");
const docsDir = path.join(projectRoot, "docs", "migration");
const dataMigrationDir = path.join(projectRoot, "data", "migration");
const legacyContentDir = path.join(projectRoot, "data", "legacy-content");
const astroProductsDir = path.join(projectRoot, "src", "content", "products");
const astroPagesDir = path.join(projectRoot, "src", "content", "pages");

const pageSubdirs = ["pages", "products", "collections", "knowledge", "media", "manifests"];

function normalizeSlash(value) {
  return String(value ?? "").replace(/\\/g, "/");
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "page";
}

function pageIdFromRoute(route) {
  if (route === "/" || route === "/zh-TW") return "home";
  return slugify(route.replace(/^\/+/, "").replace(/\//g, "__"));
}

function archiveSlugFromRoute(route) {
  if (route === "/") return "home";
  if (route === "/zh-TW") return "zh-tw";
  return route.replace(/^\/+/, "").replace(/\/+$/g, "").split("/").map((part) => slugify(decodeURIComponent(part))).join("/");
}

function toCsvValue(value) {
  if (Array.isArray(value)) value = value.join(" | ");
  if (value && typeof value === "object") value = JSON.stringify(value);
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((header) => toCsvValue(row[header])).join(","))].join("\n") + "\n";
}

function toMarkdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n") + "\n";
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeEntities(value).replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function attrValue(tag, attr) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']+)`, "i"));
  return match?.[1] || "";
}

function normalizeUrl(raw) {
  if (!raw) return "";
  let url = decodeEntities(String(raw).trim());
  if (!url || url.startsWith("data:")) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/")) url = `https://www.dsdiamond.com.tw${url}`;
  return url;
}

function extractImages(html) {
  const images = [];
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    const srcs = [attrValue(tag, "src"), attrValue(tag, "data-src"), attrValue(tag, "data-original")].filter(Boolean);
    const srcset = attrValue(tag, "srcset");
    if (srcset) {
      srcs.push(...srcset.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean));
    }
    for (const src of srcs) {
      images.push({
        src: normalizeUrl(src),
        alt: decodeEntities(attrValue(tag, "alt")),
        title: decodeEntities(attrValue(tag, "title")),
        sourceType: "img"
      });
    }
  }
  for (const match of html.matchAll(/<source\b[^>]*srcset=["']([^"']+)["'][^>]*>/gi)) {
    for (const src of match[1].split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean)) {
      images.push({ src: normalizeUrl(src), alt: "", title: "", sourceType: "source-srcset" });
    }
  }
  for (const match of html.matchAll(/background(?:-image)?\s*:\s*url\(([^)]+)\)/gi)) {
    images.push({ src: normalizeUrl(match[1].replace(/["']/g, "")), alt: "", title: "", sourceType: "css-background" });
  }
  for (const match of html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["'][^>]*>/gi)) {
    images.push({ src: normalizeUrl(match[1]), alt: "SEO image", title: "", sourceType: "seo-image" });
  }
  const seen = new Set();
  return images.filter((image) => image.src && !seen.has(image.src) && seen.add(image.src));
}

function extractLinks(html) {
  const links = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = normalizeUrl(match[1]);
    if (!href) continue;
    links.push({ href, text: stripHtml(match[2]), type: href.includes("dsdiamond.com.tw") ? "internal" : "external" });
  }
  return links;
}

function extractVideos(html) {
  const videos = [];
  for (const match of html.matchAll(/<video\b[\s\S]*?<\/video>/gi)) {
    const srcs = [...match[0].matchAll(/src=["']([^"']+)["']/gi)].map((m) => normalizeUrl(m[1])).filter(Boolean);
    videos.push(...srcs.map((src) => ({ src, sourceType: "video" })));
  }
  for (const match of html.matchAll(/(?:youtube\.com|youtu\.be|v\.cyberbiz\.tw)[^"'<>\\\s]+/gi)) {
    videos.push({ src: normalizeUrl(match[0]), sourceType: "embedded-or-linked" });
  }
  return [...new Map(videos.map((video) => [video.src, video])).values()];
}

function extractSchema(html) {
  const schemas = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = decodeEntities(match[1]).trim();
    if (raw) schemas.push(raw);
  }
  return schemas;
}

function extractMeta(html) {
  const title = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const metaDescription = decodeEntities((html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1] || "");
  const canonical = normalizeUrl((html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)/i) || [])[1] || "");
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
  const h3 = [...html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
  return { title, metaDescription, canonical, h1, h2, h3 };
}

function extractContentBlocks(html, markdownText) {
  const blocks = [];
  let order = 1;
  const push = (blockType, title, text, imageSource = "") => {
    const cleaned = stripHtml(text);
    if (!cleaned && !imageSource) return;
    blocks.push({
      blockOrder: order++,
      blockType,
      title: title || "",
      text: cleaned,
      imageSource,
      status: "已備份"
    });
  };

  for (const match of html.matchAll(/<(h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)) push(match[1].toUpperCase(), stripHtml(match[2]), "");
  for (const match of html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)) push("Paragraph", "", match[1]);
  for (const match of html.matchAll(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi)) push("List", "", match[2]);
  for (const match of html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) push("Table", "", match[1]);
  for (const image of extractImages(html)) push("Image", image.alt || image.title, "", image.src);

  if (!blocks.length && markdownText) {
    const paragraphs = markdownText.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
    for (const paragraph of paragraphs) push(/^#/.test(paragraph) ? "Title" : "Paragraph", "", paragraph);
  }
  return blocks;
}

function pageType(route, rawType) {
  if (route === "/" || route === "/zh-TW") return "首頁";
  if (/account|cart|checkout|login|signup|orders|coupons|tracking|forgot_password|logout|search/.test(route)) return "CYBERBIZ 功能頁";
  if (/blogs\//.test(route)) return "知識文章";
  if (/collections\//.test(route)) return "系列頁";
  if (/privacy|terms/.test(route)) return "法律頁";
  if (/contact/.test(route)) return "聯絡頁";
  if (/about/.test(route)) return "品牌頁";
  if (/qna|custom-service|尊榮/.test(route)) return "服務說明";
  return rawType || "一般內容頁";
}

async function safeRead(file) {
  if (!file || !existsSync(file)) return "";
  return readFile(file, "utf8");
}

async function resetDir(dir) {
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
}

async function buildLegacyPages() {
  for (const dir of pageSubdirs) await mkdir(path.join(legacyContentDir, dir), { recursive: true });
  await mkdir(dataMigrationDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });
  await resetDir(astroPagesDir);

  const routes = JSON.parse(await readFile(routesPath, "utf8"));
  const pageBackups = [];
  const masterRows = [];
  const blockRows = [];
  let pageCounter = 1;

  for (const route of routes) {
    const html = await safeRead(route.sourceFile);
    const markdownText = await safeRead(route.contentFile);
    const type = pageType(route.route, route.type);
    const pageId = `PAGE-${String(pageCounter++).padStart(4, "0")}`;
    const meta = extractMeta(html);
    const images = extractImages(html);
    const links = extractLinks(html);
    const videos = extractVideos(html);
    const schemas = extractSchema(html);
    const blocks = extractContentBlocks(html, markdownText);
    const archiveSlug = archiveSlugFromRoute(route.route);
    const backup = {
      pageId,
      legacyUrl: `https://www.dsdiamond.com.tw${route.route === "/" ? "" : route.route}`,
      route: route.route,
      archiveSlug,
      pageType: type,
      title: meta.title || route.title || "",
      metaDescription: meta.metaDescription || route.description || "",
      canonical: meta.canonical || route.canonical || "",
      headings: { h1: meta.h1, h2: meta.h2, h3: meta.h3 },
      contentBlocks: blocks,
      images,
      links,
      videos,
      downloads: links.filter((link) => /\.(pdf|docx?|xlsx?|zip)$/i.test(link.href)),
      schema: schemas,
      sourceFiles: [route.sourceFile, route.contentFile].filter(Boolean).map(normalizeSlash),
      migrationStatus: type === "CYBERBIZ 功能頁" ? "功能頁不重建，內容已備份並導向" : "原始內容已備份，Astro archive 頁已建立",
      notes: type === "CYBERBIZ 功能頁" ? ["購物/會員功能不在本次重建範圍；若頁面含政策文字，已保留於原始備份。"] : []
    };
    pageBackups.push(backup);
    const targetSubdir = type === "系列頁" ? "collections" : type === "知識文章" ? "knowledge" : "pages";
    await writeFile(path.join(legacyContentDir, targetSubdir, `${pageId}-${pageIdFromRoute(route.route)}.json`), JSON.stringify(backup, null, 2) + "\n", "utf8");

    const pageData = {
      pageId,
      title: backup.title || backup.route,
      slug: archiveSlug,
      legacyUrl: backup.legacyUrl,
      pageType: backup.pageType,
      metaDescription: backup.metaDescription,
      canonical: backup.canonical,
      headings: backup.headings,
      contentBlocks: backup.contentBlocks,
      images: backup.images,
      links: backup.links,
      videos: backup.videos,
      schema: backup.schema,
      sourceFiles: backup.sourceFiles,
      migrationStatus: backup.migrationStatus,
      notes: backup.notes
    };
    await writeFile(path.join(astroPagesDir, `${pageId}-${pageIdFromRoute(route.route)}.json`), JSON.stringify(pageData, null, 2) + "\n", "utf8");

    masterRows.push({
      "頁面 ID": pageId,
      "舊網址": backup.legacyUrl,
      "頁面名稱": backup.title,
      "頁面類型": backup.pageType,
      "原始內容來源": backup.sourceFiles.join(" | "),
      "圖片數": backup.images.length,
      "新網址": `/legacy-content/${archiveSlug}/`,
      "搬遷狀態": backup.migrationStatus
    });
    for (const block of blocks) {
      blockRows.push({
        "頁面 ID": pageId,
        "區塊順序": block.blockOrder,
        "區塊類型": block.blockType,
        "標題": block.title,
        "文字來源": block.text.slice(0, 240),
        "圖片來源": block.imageSource,
        "新站對應": `/legacy-content/${archiveSlug}/`,
        "狀態": block.status
      });
    }
  }

  await writeFile(path.join(dataMigrationDir, "non-product-page-master.json"), JSON.stringify(pageBackups, null, 2) + "\n", "utf8");
  await writeFile(path.join(dataMigrationDir, "non-product-page-master.csv"), toCsv(masterRows, ["頁面 ID", "舊網址", "頁面名稱", "頁面類型", "原始內容來源", "圖片數", "新網址", "搬遷狀態"]), "utf8");
  await writeFile(path.join(docsDir, "NON_PRODUCT_PAGE_MASTER_LIST.md"), `# Non Product Page Master List\n\n舊頁面總數：${masterRows.length}\n\n` + toMarkdownTable(["頁面 ID", "舊網址", "頁面名稱", "頁面類型", "原始內容來源", "圖片數", "新網址", "搬遷狀態"], masterRows), "utf8");
  await writeFile(path.join(docsDir, "NON_PRODUCT_CONTENT_BLOCK_AUDIT.md"), `# Non Product Content Block Audit\n\n內容區塊總數：${blockRows.length}\n\n` + toMarkdownTable(["頁面 ID", "區塊順序", "區塊類型", "標題", "文字來源", "圖片來源", "新站對應", "狀態"], blockRows), "utf8");
  await writeFile(path.join(legacyContentDir, "manifests", "non-product-pages.json"), JSON.stringify({ total: pageBackups.length, generatedAt: "2026-07-17", pages: pageBackups.map((page) => ({ pageId: page.pageId, legacyUrl: page.legacyUrl, pageType: page.pageType })) }, null, 2) + "\n", "utf8");

  return { pageBackups, masterRows, blockRows };
}

async function readManifestForProduct(product) {
  const folder = path.join(projectRoot, "public", "assets", "migrated", "products", `${product.legacyProductId}-${product.astroSlug}`);
  const manifestPath = path.join(folder, "manifest.json");
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(await readFile(manifestPath, "utf8"));
}

async function buildProducts() {
  await resetDir(astroProductsDir);
  await mkdir(path.join(legacyContentDir, "products"), { recursive: true });
  const products = JSON.parse(await readFile(productMasterPath, "utf8"));
  const completenessRows = [];
  const usedSlugs = new Set();

  for (const product of products) {
    const manifest = await readManifestForProduct(product);
    let outputSlug = product.astroSlug;
    if (usedSlugs.has(outputSlug)) outputSlug = `${outputSlug}-${product.legacyProductId.toLowerCase()}`;
    usedSlugs.add(outputSlug);
    const images = (manifest?.downloadedFiles || []).map((file, index) => ({
      src: `/${normalizeSlash(file.file).replace(/^public\//, "")}`,
      alt: `${product.originalDisplayName || product.productName} ${index + 1}`,
      role: file.role || (index === 0 ? "main" : "gallery"),
      originalUrl: file.originalUrl || "",
      sourcePath: file.sourcePath || "",
      sha256: file.sha256 || ""
    }));
    const contentStatus = product.originalDescription || product.originalSpecifications ? "partial" : "missing";
    const mediaStatus = images.length && images.length === product.expectedImageCount ? "complete" : images.length ? "partial" : "missing";
    const routeStatus = product.legacyUrls?.length ? "redirect-needed" : "no-legacy-product-route";
    const overallStatus = contentStatus === "complete" && mediaStatus === "complete" && routeStatus === "complete" ? "fully-migrated" : "partial";
    const productData = {
      legacyProductId: product.legacyProductId,
      legacyCyberbizId: product.legacyCyberbizId,
      name: product.productName,
      englishName: product.englishName,
      originalDisplayName: product.originalDisplayName,
      slug: outputSlug,
      legacyUrls: product.legacyUrls,
      category: product.category || "",
      collection: product.collection || "",
      collections: product.collection ? product.collection.split("|").map((item) => item.trim()).filter(Boolean) : [],
      productType: product.productType || "",
      variantType: product.variantType || "",
      parentProductId: product.parentProductId || "",
      shortDescription: product.originalDescription || `${product.originalDisplayName} 為舊 CYBERBIZ 網站中可確認的商品名稱。`,
      description: product.originalDescription || "",
      material: "",
      mainStone: "",
      sideStone: "",
      diamondShape: "",
      shape: "",
      color: "",
      certificate: "",
      specifications: product.originalSpecifications || "",
      images,
      video: "",
      seoTitle: product.originalDisplayName || product.productName,
      seoDescription: product.originalDescription || `${product.originalDisplayName || product.productName}，來源為鑽之韻舊 CYBERBIZ 網站備份。`,
      canonicalUrl: product.legacyUrls?.[0] || "",
      originalUrl: product.legacyUrls?.[0] || "",
      inquiryText: `我想諮詢 ${product.originalDisplayName || product.productName}`,
      frameworkStatus: "complete",
      contentStatus,
      imageStatus: mediaStatus,
      mediaStatus,
      routeStatus,
      overallStatus,
      migrationStatus: "framework-complete",
      sourceIds: product.sourceIds,
      sourceFiles: [...new Set((product.imageReferences || []).map((ref) => ref.sourceFile).filter(Boolean))],
      rawSources: product.sourceIds.map((sourceId) => ({ sourceType: "product-source-master", sourceId, text: product.originalDisplayName })),
      migrationNotes: product.notes || "原始商品介紹/規格不足，不得標示為內容完整。"
    };
    await writeFile(path.join(astroProductsDir, `${outputSlug}.json`), JSON.stringify(productData, null, 2) + "\n", "utf8");
    await writeFile(path.join(legacyContentDir, "products", `${product.legacyProductId}-${outputSlug}.json`), JSON.stringify(productData, null, 2) + "\n", "utf8");
    completenessRows.push({
      "產品 ID": product.legacyProductId,
      "產品名稱": product.originalDisplayName,
      "舊網址": product.legacyUrls.join(" | "),
      "名稱": product.productName ? "已保存" : "缺少",
      "介紹": contentStatus,
      "規格": product.originalSpecifications ? "partial" : "missing",
      "圖片": mediaStatus,
      "系列": product.collection ? "已保存" : "缺少",
      "SEO": "partial",
      "商品頁": `/products/${outputSlug}/`,
      "狀態": overallStatus
    });
  }

  await writeFile(path.join(docsDir, "PRODUCT_CONTENT_COMPLETENESS.md"), `# Product Content Completeness\n\n產品總數：${products.length}\n\n` + toMarkdownTable(["產品 ID", "產品名稱", "舊網址", "名稱", "介紹", "規格", "圖片", "系列", "SEO", "商品頁", "狀態"], completenessRows), "utf8");
  await writeFile(path.join(legacyContentDir, "manifests", "products.json"), JSON.stringify({ total: products.length, generatedAt: "2026-07-17", products: products.map((product) => ({ legacyProductId: product.legacyProductId, slug: product.astroSlug, legacyUrls: product.legacyUrls })) }, null, 2) + "\n", "utf8");

  return { products, completenessRows };
}

const pages = await buildLegacyPages();
const products = await buildProducts();
await writeFile(path.join(dataMigrationDir, "legacy-content-rebuild-summary.json"), JSON.stringify({
  generatedAt: "2026-07-17",
  legacyPageCount: pages.pageBackups.length,
  contentBlockCount: pages.blockRows.length,
  productCount: products.products.length,
  productFrameworkComplete: products.products.length,
  outputRoots: {
    legacyContent: normalizeSlash(legacyContentDir),
    astroProducts: normalizeSlash(astroProductsDir),
    astroPages: normalizeSlash(astroPagesDir)
  }
}, null, 2) + "\n", "utf8");

console.log(JSON.stringify({
  legacyPageCount: pages.pageBackups.length,
  contentBlockCount: pages.blockRows.length,
  productCount: products.products.length
}, null, 2));
