import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, "..");
const legacyRoot = path.join(workspaceRoot, "dsdiamond_backup");
const legacySiteRoot = path.join(legacyRoot, "site", "www.dsdiamond.com.tw");
const brandDataRoot = path.join(legacyRoot, "brand-data");
const docsDir = path.join(projectRoot, "docs", "migration");
const outputDir = path.join(projectRoot, "output");
const collectionsDir = path.join(projectRoot, "src", "content", "collections");
const productsDir = path.join(projectRoot, "src", "content", "products");
const knowledgeDir = path.join(projectRoot, "src", "content", "knowledge");
const publicDir = path.join(projectRoot, "public");

const htmlExt = /\.html$/i;
const imageExt = /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)(?:$|\?)/i;
const videoExt = /\.(?:m4v|mp4|webm)(?:$|\?)/i;

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full));
    if (entry.isFile()) files.push(full);
  }
  return files;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function mdTable(headers, rows) {
  const header = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  return [header, sep, ...rows.map((row) => `| ${row.map(csvEscape).join(" | ")} |`)].join("\n") + "\n";
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function normalizeText(text) {
  return decodeHtmlEntities(text).replace(/\s+/g, " ").trim();
}

function stripHtml(html) {
  return normalizeText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|section|article|li|h[1-6]|summary|details)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  );
}

function extractFirst(html, regex) {
  const match = html.match(regex);
  return match ? normalizeText(match[1] || match[2] || "") : "";
}

function extractAll(html, regex) {
  return [...html.matchAll(regex)].map((match) => normalizeText(match[1] || match[2] || "")).filter(Boolean);
}

function routeFromLegacyHtml(file) {
  const rel = path.relative(legacySiteRoot, file).replace(/\\/g, "/");
  if (rel === "index.html") return "/";
  if (rel === "zh-TW.html") return "/zh-TW";
  return "/" + rel.replace(/\.html$/i, "");
}

function titleFromRoute(route) {
  const last = decodeURIComponent(route.split("/").filter(Boolean).pop() || "首頁");
  const map = {
    "zh-TW": "首頁（繁中入口）",
    "about-us": "關於我們",
    "qna": "常見問題",
    "privacy": "隱私政策",
    "terms": "服務條款",
    "contact": "聯絡我們",
    "diamond-symphony-guide": "鑽之韻知識學堂",
    "pair-ring": "結婚對戒",
    "ring-female": "女士鑽戒",
    "ring-man": "男士鑽戒",
    "necklace": "項鍊",
    "earring": "耳環",
    "bracelet": "手鍊",
    "diamond": "精選裸鑽",
  };
  return map[last] || last || "首頁";
}

function pageTypeFromRoute(route) {
  if (route.includes("/collections/")) return "collection";
  if (route.includes("/blogs/")) return "article";
  if (route.includes("/pages/")) return "page";
  if (route.includes("/account/")) return "account";
  if (route.includes("/cart")) return "cart";
  if (route.includes("/contact")) return "contact";
  if (route.includes("/search")) return "search";
  if (route === "/" || route === "/zh-TW") return "home";
  return "other";
}

function slugFromRoute(route) {
  return decodeURIComponent(route.split("/").filter(Boolean).pop() || "home");
}

function textStats(text) {
  const clean = normalizeText(text);
  const paragraphs = clean.split(/(?:。|！|？|\n)+/).map((x) => x.trim()).filter(Boolean);
  return { chars: [...clean].length, paragraphs: paragraphs.length };
}

function extractMedia(html, baseRoute) {
  const media = new Set();
  const patterns = [
    /\b(?:src|data-src|data-original|poster)\s*=\s*["']([^"']+)["']/gi,
    /\bsrcset\s*=\s*["']([^"']+)["']/gi,
    /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
    /https?:\/\/[^\s"'<>\\]+/gi,
    /\/\/cdn-[^\s"'<>\\]+/gi,
    /\/\/v\.cyberbiz\.tw[^\s"'<>\\]+/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const raw = match[1] || match[0];
      for (const part of raw.split(",")) {
        const candidate = part.trim().split(/\s+/)[0].replace(/\\u0026/g, "&");
        if (!candidate || candidate.startsWith("data:")) continue;
        if (imageExt.test(candidate) || videoExt.test(candidate)) {
          media.add(candidate.startsWith("//") ? `https:${candidate}` : candidate);
        }
      }
    }
  }
  return [...media].map((url) => ({ route: baseRoute, url }));
}

function findNewRoute(route, newRoutes) {
  if (newRoutes.has(route)) return route;
  if (newRoutes.has(`${route}/`)) return `${route}/`;
  const slug = slugFromRoute(route);
  if (route.includes("/collections/")) {
    const direct = `/collections/${slug}`;
    const slash = `/collections/${slug}/`;
    if (newRoutes.has(direct)) return direct;
    if (newRoutes.has(slash)) return slash;
  }
  if (route === "/zh-TW" && newRoutes.has("/zh-TW/")) return "/zh-TW/";
  return "";
}

async function readJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  return JSON.parse(await readFile(file, "utf8"));
}

async function ensureMissingCollectionData(brandRoutes) {
  const existingFiles = await walk(collectionsDir);
  const existingSlugs = new Set();
  for (const file of existingFiles.filter((f) => f.endsWith(".json"))) {
    const data = await readJson(file);
    if (data?.slug) existingSlugs.add(data.slug);
  }

  const collectionRoutes = brandRoutes.filter((route) => route.type === "collection");
  const created = [];
  const defaultImage = "/assets/banners/atelier-service-banner.jpeg";
  for (const route of collectionRoutes) {
    const slug = slugFromRoute(route.route);
    if (existingSlugs.has(slug)) continue;
    const data = {
      name: route.page_name_zh || route.title?.replace(" 鑽之韻", "") || slug,
      slug,
      englishName: route.title?.replace(" 鑽之韻", "") || slug,
      summary: route.description || `${route.page_name_zh || slug}舊站系列資料，已先建立對應入口，待後續補齊完整產品。`,
      description: route.description || `${route.page_name_zh || slug}為舊 CYBERBIZ 網站中的品牌系列頁。此資料已從備份建立新站對應頁，內容狀態仍需逐項核對產品與圖片。`,
      heroImage: { src: defaultImage, alt: route.page_name_zh || slug },
      products: [],
      featured: false,
      seoTitle: route.title || route.page_name_zh || slug,
      seoDescription: route.description || "",
      originalUrl: `https://www.dsdiamond.com.tw${route.route}`,
      originalSource: path.relative(projectRoot, path.join(brandDataRoot, "brand-routes.json")).replace(/\\/g, "/"),
      migrationStatus: "部分缺失",
      migrationNotes: "由舊站 brand-routes 自動補回系列頁入口；產品、圖片與完整區塊仍需人工核對。"
    };
    const target = path.join(collectionsDir, `${slug}.json`);
    await writeFile(target, JSON.stringify(data, null, 2) + "\n", "utf8");
    created.push(target);
    existingSlugs.add(slug);
  }
  return created;
}

async function ensureLegacyFrontmatter() {
  const knowledgeFile = path.join(knowledgeDir, "diamond-symphony-guide.md");
  let changed = false;
  let text = await readFile(knowledgeFile, "utf8");
  if (!text.includes("legacyUrl:")) {
    text = text.replace(
      'originalUrl: "https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide"\n',
      [
        'originalUrl: "https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide"',
        'legacyUrl: "https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide"',
        'legacySource: "../dsdiamond_backup/brand-data/content/blogs__diamond-symphony-guide.md"',
        'migrationStatus: "部分缺失"',
        'migrationNotes: "已建立來源追蹤；需依 ARTICLE_COMPLETENESS_AUDIT 核對完整段落與圖片。"',
        "",
      ].join("\n"),
    );
    changed = true;
  }
  if (changed) await writeFile(knowledgeFile, text, "utf8");

  const productFiles = (await walk(productsDir)).filter((file) => file.endsWith(".json"));
  const changedProducts = [];
  for (const file of productFiles) {
    const data = await readJson(file);
    let touched = false;
    if (!data.originalSource) {
      data.originalSource = "../dsdiamond_backup/brand-data/brand-routes.json";
      touched = true;
    }
    if (!data.migrationStatus) {
      data.migrationStatus = "部分缺失";
      touched = true;
    }
    if (!data.migrationNotes) {
      data.migrationNotes = "現有產品資料為新站初稿；需依 PRODUCT_COMPLETENESS_AUDIT 回補舊站完整產品欄位與圖片。";
      touched = true;
    }
    if (touched) {
      await writeFile(file, JSON.stringify(data, null, 2) + "\n", "utf8");
      changedProducts.push(file);
    }
  }
  return { knowledgeChanged: changed, changedProducts };
}

async function collectNewRoutes() {
  const routes = new Set(["/", "/zh-TW/", "/contact/", "/pages/about-us/", "/pages/qna/", "/pages/custom-service/", "/pages/privacy/", "/pages/terms/", "/blogs/diamond-symphony-guide/"]);
  const collectionFiles = (await walk(collectionsDir)).filter((file) => file.endsWith(".json"));
  for (const file of collectionFiles) {
    const data = await readJson(file);
    if (data?.slug) routes.add(`/collections/${data.slug}/`);
  }
  const productFiles = (await walk(productsDir)).filter((file) => file.endsWith(".json"));
  for (const file of productFiles) {
    const data = await readJson(file);
    if (data?.slug) routes.add(`/products/${data.slug}/`);
  }
  return routes;
}

function parseMarkdownTable(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .slice(1)
    .map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim().replace(/\\\|/g, "|")));
}

async function readRouteMappings() {
  const file = path.join(docsDir, "ROUTE_MAPPING.md");
  if (!existsSync(file)) return [];
  return parseMarkdownTable(await readFile(file, "utf8")).map((row) => ({ from: row[0], to: row[1], reason: row[2], status: row[3] }));
}

async function readProductResolution() {
  const file = path.join(docsDir, "PRODUCT_SOURCE_RESOLUTION.md");
  if (!existsSync(file)) return [];
  return parseMarkdownTable(await readFile(file, "utf8"));
}

async function readMediaMappingRows() {
  const file = path.join(docsDir, "MEDIA_MAPPING.md");
  if (!existsSync(file)) return [];
  return parseMarkdownTable(await readFile(file, "utf8"));
}

async function collectNewTextByRoute() {
  const map = new Map();
  const files = (await walk(path.join(projectRoot, "src"))).filter((file) => /\.(astro|md|json|ts)$/i.test(file));
  for (const file of files) {
    const text = await readFile(file, "utf8");
    const rel = path.relative(projectRoot, file).replace(/\\/g, "/");
    let route = rel;
    if (rel.includes("diamond-symphony-guide")) route = "/blogs/diamond-symphony-guide";
    else if (rel.includes("pages/about-us")) route = "/pages/about-us";
    else if (rel.includes("pages/qna")) route = "/pages/qna";
    else if (rel.includes("pages/custom-service")) route = "/pages/尊榮定製";
    else if (rel.includes("contact.astro")) route = "/contact";
    else if (rel.includes("index.astro")) route = "/";
    else if (rel.includes("zh-TW.astro")) route = "/zh-TW";
    else if (rel.includes("src/content/collections/")) {
      try {
        const data = JSON.parse(text);
        route = `/collections/${data.slug}`;
      } catch {}
    }
    const clean = stripHtml(text.replace(/^---[\s\S]*?---/, ""));
    map.set(route, `${map.get(route) || ""}\n${clean}`);
  }
  return map;
}

async function main() {
  await mkdir(docsDir, { recursive: true });
  await mkdir(outputDir, { recursive: true });

  const brandRoutes = await readJson(path.join(brandDataRoot, "brand-routes.json"), []);
  const generatedCollections = await ensureMissingCollectionData(brandRoutes);
  const legacyFrontmatter = await ensureLegacyFrontmatter();

  const legacyHtmlFiles = (await walk(legacySiteRoot)).filter((file) => htmlExt.test(file));
  const legacyPages = [];
  const allLegacyMedia = [];
  for (const file of legacyHtmlFiles) {
    const html = await readFile(file, "utf8");
    const route = routeFromLegacyHtml(file);
    const title = extractFirst(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || titleFromRoute(route);
    const description = extractFirst(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const text = stripHtml(html);
    const h1 = extractAll(html, /<h1[^>]*>([\s\S]*?)<\/h1>/gi);
    const h2 = extractAll(html, /<h2[^>]*>([\s\S]*?)<\/h2>/gi);
    const media = extractMedia(html, route);
    allLegacyMedia.push(...media);
    legacyPages.push({
      route,
      url: `https://www.dsdiamond.com.tw${route === "/" ? "/" : route}`,
      title,
      description,
      type: pageTypeFromRoute(route),
      source: path.relative(projectRoot, file).replace(/\\/g, "/"),
      text,
      h1,
      h2,
      mediaCount: media.length,
    });
  }

  const newRoutes = await collectNewRoutes();
  const routeMappings = await readRouteMappings();
  for (const mapping of routeMappings) {
    if (mapping.from && mapping.to) newRoutes.add(mapping.from.endsWith("/") ? mapping.from : `${mapping.from}/`);
  }
  const newText = await collectNewTextByRoute();
  const masterRows = legacyPages.map((page, index) => {
    const mappedRedirect = routeMappings.find((mapping) => mapping.from === page.route);
    const newRoute = mappedRedirect?.to || findNewRoute(page.route, newRoutes);
    let status = "無對應新頁面";
    if (mappedRedirect) status = "已建立轉址";
    else if (newRoute) status = "已盤點";
    if (newRoute && textStats(newText.get(newRoute.replace(/\/$/, "")) || newText.get(newRoute) || "").chars < textStats(page.text).chars * 0.65) status = "部分缺失";
    if (mappedRedirect) status = "已建立轉址";
    return [index + 1, page.url, page.title, page.type, page.source, newRoute, status];
  });
  await writeFile(path.join(docsDir, "LEGACY_PAGE_MASTER_LIST.md"), "# Legacy Page Master List\n\n" + mdTable(["編號", "舊網址", "舊頁面名稱", "頁面類型", "原始資料來源", "新網址", "搬遷狀態"], masterRows), "utf8");

  const blockRows = [];
  for (const page of legacyPages) {
    let order = 1;
    if (page.title) blockRows.push([page.url, order++, "SEO Title", "頁面標題", "存在", "待比對", "待確認", "保留於新站 title/seoTitle"]);
    if (page.description) blockRows.push([page.url, order++, "SEO Description", "副標題", "存在", "待比對", "待確認", "保留於新站 description/seoDescription"]);
    for (const heading of page.h1) blockRows.push([page.url, order++, heading, "頁面標題", "存在", "待比對", "待確認", "逐字核對"]);
    for (const heading of page.h2) blockRows.push([page.url, order++, heading, "副標題", "存在", "待比對", "待確認", "逐字核對"]);
    if (page.text) blockRows.push([page.url, order++, "主要文字內容", "文字段落", `${textStats(page.text).chars} 字`, "待比對", "待確認", "依 TEXT_COMPLETENESS_AUDIT 補回"]);
    if (page.mediaCount) blockRows.push([page.url, order++, "媒體資產", "圖片/影片", `${page.mediaCount} 個`, "待比對", "待確認", "依 IMAGE_COMPLETENESS_AUDIT 映射"]);
  }
  await writeFile(path.join(docsDir, "PAGE_CONTENT_BLOCK_AUDIT.md"), "# Page Content Block Audit\n\n" + mdTable(["舊網址", "區塊順序", "區塊名稱", "區塊類型", "舊站內容狀態", "新站內容狀態", "是否完整", "修正方式"], blockRows), "utf8");

  const textRows = legacyPages.map((page) => {
    const newRoute = findNewRoute(page.route, newRoutes);
    const newRouteNoSlash = newRoute.replace(/\/$/, "");
    const oldStats = textStats(page.text);
    const freshNewText = newText.get(newRouteNoSlash) || newText.get(newRoute) || "";
    const ns = textStats(freshNewText);
    const diff = ns.chars - oldStats.chars;
    const result = !newRoute ? "無對應新頁面" : ns.chars < oldStats.chars * 0.65 ? "部分缺失" : "待人工確認";
    return [page.url, oldStats.chars, ns.chars, oldStats.paragraphs, ns.paragraphs, diff, result];
  });
  await writeFile(path.join(docsDir, "TEXT_COMPLETENESS_AUDIT.md"), "# Text Completeness Audit\n\n" + mdTable(["頁面", "舊站字數", "新站字數", "舊站段落數", "新站段落數", "差異", "結果"], textRows), "utf8");

  const newAssetFiles = (await walk(publicDir)).map((file) => path.relative(publicDir, file).replace(/\\/g, "/"));
  const mediaMappingRows = await readMediaMappingRows();
  const migratedByOriginal = new Map(mediaMappingRows.map((row) => [row[0], row]));
  const imageRows = allLegacyMedia.map((item) => {
    const basename = decodeURIComponent(item.url.split("?")[0].split("/").pop() || "");
    const mapped = newAssetFiles.find((asset) => asset.endsWith(basename)) || "";
    const migrated = migratedByOriginal.get(item.url.replace(/^https?:\/\//, "")) || migratedByOriginal.get(item.url);
    const isVideo = videoExt.test(item.url);
    return [`https://www.dsdiamond.com.tw${item.route}`, item.url, isVideo ? "影片" : "圖片", migrated?.[6] || (mapped ? `/assets/${mapped.split("assets/").pop()}` : ""), (migrated || mapped) ? "是" : "否", migrated ? "是" : mapped ? "待人工確認" : "否", migrated ? "已由 MEDIA_MAPPING 實際複製並連接" : mapped ? "需確認用途是否一致" : "新站 public 未找到同檔名"];
  });
  await writeFile(path.join(docsDir, "IMAGE_COMPLETENESS_AUDIT.md"), "# Image Completeness Audit\n\n" + mdTable(["舊網址", "舊圖片路徑", "圖片用途", "新圖片路徑", "是否已使用", "是否正確", "問題"], imageRows), "utf8");

  const newProductFiles = (await walk(productsDir)).filter((file) => file.endsWith(".json"));
  const newProducts = [];
  for (const file of newProductFiles) newProducts.push(await readJson(file));
  const productResolutionRows = await readProductResolution();
  const productRows = productResolutionRows.length
    ? productResolutionRows.map((row) => {
        const slug = row[4];
        const hit = newProducts.find((product) => product.slug === slug);
        return [row[0], row[1], hit ? `/products/${hit.slug}/` : "", hit?.images?.[0]?.src || "", hit?.images?.length || 0, hit?.shortDescription ? "有" : "缺少", hit?.material ? "有" : "缺少", hit?.collection || row[4] || "待確認", hit?.certificate || "待確認", hit ? hit.migrationStatus || "部分搬遷" : row[7]];
      })
    : [];
  await writeFile(path.join(docsDir, "PRODUCT_COMPLETENESS_AUDIT.md"), "# Product Completeness Audit\n\n" + mdTable(["舊產品名稱", "舊網址", "新網址", "主圖", "圖片數量", "簡介", "規格", "系列", "證書", "搬遷結果"], productRows), "utf8");

  const articlePage = legacyPages.find((page) => page.route.includes("/blogs/diamond-symphony-guide"));
  const articleRows = [[
    articlePage?.title || "鑽之韻知識學堂",
    articlePage?.url || "https://www.dsdiamond.com.tw/blogs/diamond-symphony-guide",
    "/blogs/diamond-symphony-guide/",
    "Diamond Guide",
    existsSync(path.join(projectRoot, "public", "assets", "knowledge", "proposal-guide-cover.png")) ? "有" : "缺少",
    "需逐字核對",
    "需依 IMAGE_COMPLETENESS_AUDIT 核對",
    "新站有 publishDate；舊站需人工確認",
    "部分保留",
    "部分缺失",
  ]];
  await writeFile(path.join(docsDir, "ARTICLE_COMPLETENESS_AUDIT.md"), "# Article Completeness Audit\n\n" + mdTable(["舊文章標題", "舊網址", "新網址", "分類", "封面", "內文", "圖片", "日期", "SEO", "搬遷結果"], articleRows), "utf8");

  const rewriteRows = textRows
    .filter((row) => row[6] === "部分缺失")
    .slice(0, 100)
    .map((row) => [row[0], "新站文字顯著少於舊站；先完整補回，再判斷是否重寫。"]);
  await mkdir(path.join(projectRoot, "docs", "content"), { recursive: true });
  await writeFile(path.join(projectRoot, "docs", "content", "CONTENT_REWRITE_CANDIDATES.md"), "# Content Rewrite Candidates\n\n本文件只記錄未來可考慮重寫的內容。本次不得用摘要或新文案取代原始內容。\n\n" + mdTable(["頁面", "原因"], rewriteRows), "utf8");

  const summary = {
    backupSources: [legacyRoot],
    legacyPageCount: legacyPages.length,
    actualAstroOutputPageCount: existsSync(path.join(projectRoot, "dist")) ? (await walk(path.join(projectRoot, "dist"))).filter((file) => file.endsWith(".html")).length : 0,
    contentPageCount: [...newRoutes].filter((route) => !routeMappings.some((mapping) => `${mapping.from}/` === route || mapping.from === route)).length,
    redirectCount: routeMappings.length,
    newPageCount: newRoutes.size,
    mappedPageCount: masterRows.filter((row) => row[5]).length,
    oneToOneMappingCount: Object.values(masterRows.reduce((acc, row) => { if (row[5]) acc[row[5]] = (acc[row[5]] || 0) + 1; return acc; }, {})).filter((count) => count === 1).length,
    manyToOneMappingCount: Object.values(masterRows.reduce((acc, row) => { if (row[5]) acc[row[5]] = (acc[row[5]] || 0) + 1; return acc; }, {})).filter((count) => count > 1).length,
    missingNewPageCount: masterRows.filter((row) => !row[5]).length,
    partialPageCount: masterRows.filter((row) => row[6] === "部分缺失").length,
    completePageCount: masterRows.filter((row) => row[6] === "已完整搬遷").length,
    legacyArticleCount: articlePage ? 1 : 0,
    newArticleCount: existsSync(path.join(knowledgeDir, "diamond-symphony-guide.md")) ? 1 : 0,
    legacyProductCandidateCount: 39,
    productSourceOccurrenceCount: productRows.length,
    confirmedIndependentProductCount: productResolutionRows.filter((row) => row[3] === "確認為獨立產品").length,
    confirmedVariantCount: productResolutionRows.filter((row) => row[3] === "確認為產品變體").length,
    confirmedCategoryCount: productResolutionRows.filter((row) => row[3] === "確認為分類名稱").length,
    newProductCount: newProducts.length,
    legacyImageCount: allLegacyMedia.length,
    uniqueMediaUrlCount: new Set(allLegacyMedia.map((item) => item.url)).size,
    copiedMediaCount: mediaMappingRows.filter((row) => row[7]?.startsWith("已")).length,
    mappedImageCount: imageRows.filter((row) => row[4] === "是").length,
    unmappedImageCount: imageRows.filter((row) => row[4] === "否").length,
    generatedCollections: generatedCollections.map((file) => path.relative(projectRoot, file).replace(/\\/g, "/")),
    legacyFrontmatter,
    criticalFindings: [
      "統計已拆分為內容頁、redirect、一對一映射與多對一映射，修正先前新站頁數與映射數混用問題。",
      "已建立可確認款式的 Astro 產品資料，但多數產品仍缺完整規格與產品圖，因此狀態不得標示完整。",
      "已開始媒體實際複製與映射；未確認產品圖不硬套。"
    ],
  };

  const reportMd = [
    "# Content Migration Audit",
    "",
    `- Legacy pages: ${summary.legacyPageCount}`,
    `- Actual Astro output pages: ${summary.actualAstroOutputPageCount}`,
    `- Content routes: ${summary.contentPageCount}`,
    `- Redirect routes: ${summary.redirectCount}`,
    `- Mapped pages: ${summary.mappedPageCount}`,
    `- One-to-one mappings: ${summary.oneToOneMappingCount}`,
    `- Many-to-one mappings: ${summary.manyToOneMappingCount}`,
    `- Missing new pages: ${summary.missingNewPageCount}`,
    `- Partial pages: ${summary.partialPageCount}`,
    `- Complete pages: ${summary.completePageCount}`,
    `- Legacy image/media references: ${summary.legacyImageCount}`,
    `- Unique media URLs: ${summary.uniqueMediaUrlCount}`,
    `- Copied media: ${summary.copiedMediaCount}`,
    `- Mapped image/media references: ${summary.mappedImageCount}`,
    `- Unmapped image/media references: ${summary.unmappedImageCount}`,
    `- Legacy product candidates: ${summary.legacyProductCandidateCount}`,
    `- Product source occurrences: ${summary.productSourceOccurrenceCount}`,
    `- Confirmed independent products: ${summary.confirmedIndependentProductCount}`,
    `- Confirmed variants: ${summary.confirmedVariantCount}`,
    `- Confirmed categories: ${summary.confirmedCategoryCount}`,
    `- New products: ${summary.newProductCount}`,
    "",
    "## Critical Findings",
    "",
    ...summary.criticalFindings.map((item) => `- ${item}`),
    "",
    "## Generated Collection Files",
    "",
    ...(summary.generatedCollections.length ? summary.generatedCollections.map((item) => `- ${item}`) : ["- 無"]),
    "",
    "## Reports",
    "",
    "- docs/migration/LEGACY_PAGE_MASTER_LIST.md",
    "- docs/migration/PAGE_CONTENT_BLOCK_AUDIT.md",
    "- docs/migration/TEXT_COMPLETENESS_AUDIT.md",
    "- docs/migration/IMAGE_COMPLETENESS_AUDIT.md",
    "- docs/migration/PRODUCT_COMPLETENESS_AUDIT.md",
    "- docs/migration/ARTICLE_COMPLETENESS_AUDIT.md",
    "",
  ].join("\n");
  await writeFile(path.join(outputDir, "content-migration-audit.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");
  await writeFile(path.join(outputDir, "content-migration-audit.md"), reportMd, "utf8");
}

await main();
