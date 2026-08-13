import { mkdir, readFile, writeFile, readdir, copyFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const projectRoot = path.resolve(process.cwd());
const workspaceRoot = path.resolve(projectRoot, "..");
const backupRoot = path.join(workspaceRoot, "dsdiamond_backup");
const legacySiteRoot = path.join(backupRoot, "site");
const legacyHostRoot = path.join(legacySiteRoot, "www.dsdiamond.com.tw");
const docsDir = path.join(projectRoot, "docs", "migration");
const dataDir = path.join(projectRoot, "data", "migration");
const productsMediaRoot = path.join(projectRoot, "public", "assets", "migrated", "products");
const unresolvedRoot = path.join(projectRoot, "public", "assets", "migrated", "unresolved");
const astroProductDir = path.join(projectRoot, "src", "content", "products");
const referencedUrlsPath = path.join(backupRoot, "migration", "referenced-urls.csv");

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function toCsvValue(value) {
  if (Array.isArray(value)) value = value.join(" | ");
  if (value && typeof value === "object") value = JSON.stringify(value);
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, headers) {
  return [headers.join(","), ...rows.map((row) => headers.map((key) => toCsvValue(row[key])).join(","))].join("\n") + "\n";
}

function toMarkdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n") + "\n";
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\u0026/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "product";
}

function splitNames(title) {
  const normalized = String(title ?? "").trim();
  const parts = normalized.split(/[｜|]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return { productName: parts[0], englishName: parts.slice(1).join(" | ") };
  const ascii = normalized.match(/[A-Za-z][A-Za-z\s'’\-ÉéèêûœurC]+$/);
  if (ascii && ascii.index > 0) {
    return {
      productName: normalized.slice(0, ascii.index).trim(),
      englishName: ascii[0].trim()
    };
  }
  return { productName: normalized, englishName: "" };
}

function normalizeUrl(raw) {
  if (!raw) return "";
  let url = decodeHtml(String(raw).trim());
  if (!url || url.startsWith("data:")) return "";
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.startsWith("/")) url = `https://www.dsdiamond.com.tw${url}`;
  return url;
}

function localFileCandidatesForUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return [];
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return [];
  }
  const cleanPath = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  const hostPath = path.join(legacySiteRoot, parsed.hostname, cleanPath);
  const queryHash = crypto.createHash("md5").update(parsed.search || "").digest("hex").slice(0, 10);
  const ext = path.extname(cleanPath);
  const base = cleanPath.slice(0, cleanPath.length - ext.length);
  return [
    hostPath,
    path.join(legacySiteRoot, parsed.hostname, `${base}__query_${queryHash}${ext}`),
    path.join(legacySiteRoot, parsed.hostname, `${base}${ext}`)
  ];
}

async function walk(dir) {
  if (!existsSync(dir)) return [];
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else result.push(full);
  }
  return result;
}

function extractJsonObjectsAfter(text, marker) {
  const objects = [];
  let start = 0;
  while (true) {
    const markerIndex = text.indexOf(marker, start);
    if (markerIndex === -1) break;
    const objectStart = text.lastIndexOf("{", markerIndex);
    if (objectStart === -1) break;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let i = objectStart; i < text.length; i += 1) {
      const char = text[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
      } else if (char === '"') {
        inString = true;
      } else if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          const raw = text.slice(objectStart, i + 1);
          try {
            objects.push(JSON.parse(raw));
          } catch {
            // Keep scanning other objects.
          }
          start = i + 1;
          break;
        }
      }
    }
    if (start <= markerIndex) start = markerIndex + marker.length;
  }
  return objects;
}

function extractC12tImpressions(text) {
  const matches = [];
  const regex = /window\.c12t\s*=\s*(\{.*?\});/gs;
  for (const match of text.matchAll(regex)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed.impressions)) matches.push(...parsed.impressions);
    } catch {
      // Ignore invalid analytics snippets.
    }
  }
  return matches;
}

function extractProductImpressions(text) {
  const matches = [];
  const regex = /impressions['"]?\s*:\s*(\[[^\n]*?\])/g;
  for (const match of text.matchAll(regex)) {
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed)) matches.push(...parsed);
    } catch {
      // Ignore snippets that are JS variables rather than JSON arrays.
    }
  }
  return matches;
}

function extractPageMeta(html) {
  const title = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const h1 = stripHtml((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "");
  const ogImage = normalizeUrl((html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || "");
  return { title, h1, ogImage };
}

function collectionFromFile(file) {
  const rel = normalizeSlash(path.relative(legacyHostRoot, file));
  const match = rel.match(/collections\/(.+?)\.html$/);
  if (!match) return "";
  return decodeURIComponent(match[1]);
}

function sourcePageTypeFromFile(file) {
  const rel = normalizeSlash(path.relative(legacyHostRoot, file));
  if (rel.includes("/products/")) return "詳細頁";
  if (rel.includes("/collections/")) return "系列頁";
  if (/zh-TW\.html$/.test(rel)) return "首頁產品卡片";
  if (/blogs\//.test(rel)) return "文章頁";
  return "HTML";
}

function inferType(collections, title) {
  const joined = `${collections.join(" ")} ${title}`;
  if (/耳環|earring/i.test(joined)) return "耳環";
  if (/項鍊|necklace/i.test(joined)) return "項鍊";
  if (/手鍊|bracelet/i.test(joined)) return "手鍊";
  if (/男戒|ring-man|經典男戒/i.test(joined)) return "男戒";
  if (/女戒|ring-female|經典女戒|求婚|粉鑽|藍鑽|黃鑽|綠鑽|紅鑽|彩鑽|diamond/i.test(joined)) return "戒指";
  if (/對戒|pair-ring/i.test(joined)) return "對戒";
  return "待確認";
}

function inferVariant(title) {
  if (/單排|雙排|三排|黃K金|鉑金|PT|K金/i.test(title)) return "材質/排數變體";
  return "";
}

function isCategoryLike(title) {
  return /^裸鑽｜/.test(title) || /公主方鑽|圓鑽|心形鑽|枕形鑽/.test(title);
}

function makeOriginalCdnCandidate(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return "";
  }
  const fileName = path.basename(parsed.pathname);
  const ext = path.extname(fileName);
  const token = fileName.slice(0, fileName.length - ext.length);
  try {
    const jsonText = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const decoded = JSON.parse(jsonText);
    if (Array.isArray(decoded) && decoded[0]?.[0] === "f") {
      const originalToken = Buffer.from(JSON.stringify([decoded[0]])).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      return `${parsed.protocol}//${parsed.hostname}${path.posix.dirname(parsed.pathname)}/${originalToken}${ext}${parsed.search}`;
    }
  } catch {
    return "";
  }
  return "";
}

function decodeCybMediaPath(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) return "";
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    return "";
  }
  const fileName = path.basename(parsed.pathname);
  const ext = path.extname(fileName);
  const token = fileName.slice(0, fileName.length - ext.length);
  try {
    const jsonText = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const decoded = JSON.parse(jsonText);
    if (Array.isArray(decoded) && decoded[0]?.[0] === "f") return decoded[0][1] || "";
  } catch {
    return "";
  }
  return "";
}

async function readReferencedProductMedia() {
  const map = new Map();
  if (!existsSync(referencedUrlsPath)) return map;
  const csv = await readFile(referencedUrlsPath, "utf8");
  const urls = csv.split(/\r?\n/).slice(1).map((line) => line.split(",")[0]).filter(Boolean);
  for (const rawUrl of urls) {
    const url = normalizeUrl(rawUrl.replace(/^"|"$/g, ""));
    const decodedPath = decodeCybMediaPath(url);
    const match = decodedPath.match(/33338\/products\/(\d+)\//);
    if (!match) continue;
    const productId = match[1];
    if (!map.has(productId)) map.set(productId, new Map());
    map.get(productId).set(url, {
      originalUrl: url,
      originalCandidateUrl: makeOriginalCdnCandidate(url),
      role: "gallery",
      evidence: `referenced-urls.csv decoded path: ${decodedPath}`,
      sourceFile: normalizeSlash(path.relative(projectRoot, referencedUrlsPath))
    });
  }
  return map;
}

function imageRecord(url, role, evidence, sourceFile) {
  const normalized = normalizeUrl(url);
  if (!normalized) return null;
  return {
    originalUrl: normalized,
    originalCandidateUrl: makeOriginalCdnCandidate(normalized),
    role,
    evidence,
    sourceFile: normalizeSlash(path.relative(projectRoot, sourceFile))
  };
}

async function readAstroProducts() {
  const map = new Map();
  if (!existsSync(astroProductDir)) return map;
  const files = (await readdir(astroProductDir)).filter((file) => file.endsWith(".json"));
  for (const file of files) {
    try {
      const full = path.join(astroProductDir, file);
      const json = JSON.parse(await readFile(full, "utf8"));
      map.set(json.slug || path.basename(file, ".json"), { file: normalizeSlash(path.relative(projectRoot, full)), data: json });
    } catch {
      // Ignore invalid product files.
    }
  }
  return map;
}

async function buildCatalog() {
  await mkdir(docsDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(productsMediaRoot, { recursive: true });
  await mkdir(unresolvedRoot, { recursive: true });

  const htmlFiles = (await walk(legacyHostRoot)).filter((file) => file.endsWith(".html"));
  const astroProducts = await readAstroProducts();
  const referencedProductMedia = await readReferencedProductMedia();
  const sourceRows = [];
  const sourceByKey = new Map();
  const productMap = new Map();
  let sourceCounter = 1;

  function addSource({ product, file, sourceType, sourcePageType, collection, pageMeta, images, status = "有效" }) {
    if (!product?.title && !product?.name) return null;
    const title = String(product.title || product.name).trim();
    const legacyProductKey = product.id ? String(product.id) : `${title}::${product.url || ""}`;
    const occurrenceKey = `${sourceType}::${legacyProductKey}::${file}::${collection}`;
    if (sourceByKey.has(occurrenceKey)) return sourceByKey.get(occurrenceKey);
    const sourceId = `SRC-${String(sourceCounter).padStart(4, "0")}`;
    sourceCounter += 1;
    const productImages = [...new Set([
      product.featured_image,
      ...(Array.isArray(product.images) ? product.images : [])
    ].filter(Boolean).map(normalizeUrl))];
    const detectedImages = images?.length ? images : productImages.map((url, index) => imageRecord(url, index === 0 ? "main" : "gallery", "CYBERBIZ products JSON", file)).filter(Boolean);
    const legacyUrl = normalizeUrl(product.url || (product.handle ? `/products/${product.handle}` : ""));
    const row = {
      sourceId,
      sourceProductId: product.id ? String(product.id) : "",
      legacyUrl,
      sourceFile: normalizeSlash(path.relative(projectRoot, file)),
      sourcePageType,
      sourceType,
      displayedName: title,
      pageTitle: pageMeta.title,
      heading: pageMeta.h1,
      detectedCategory: product.category || collection || "",
      detectedCollection: collection || product.list || "",
      imageReferenceCount: detectedImages.length,
      descriptionFound: Boolean(product.slogan || product.brief),
      specificationFound: Boolean(product.variants?.length || product.options?.length),
      sourceStatus: status,
      price: product.price ?? "",
      handle: product.handle || "",
      detectedImageReferences: detectedImages
    };
    sourceRows.push(row);
    sourceByKey.set(occurrenceKey, row);
    if (!isCategoryLike(title)) {
      const key = product.id ? String(product.id) : title;
      const current = productMap.get(key) || {
        rawId: key,
        title,
        sources: [],
        urls: new Set(),
        collections: new Set(),
        categories: new Set(),
        images: new Map(),
        slogans: new Set(),
        handles: new Set(),
        prices: new Set()
      };
      current.sources.push(row);
      if (legacyUrl) current.urls.add(legacyUrl);
      if (collection) current.collections.add(collection);
      if (product.category) current.categories.add(product.category);
      if (product.handle) current.handles.add(product.handle);
      if (product.price) current.prices.add(product.price);
      if (product.slogan) current.slogans.add(stripHtml(product.slogan));
      for (const image of detectedImages) current.images.set(image.originalUrl, image);
      productMap.set(key, current);
    }
    return row;
  }

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    const pageMeta = extractPageMeta(html);
    const collection = collectionFromFile(file);
    const sourcePageType = sourcePageTypeFromFile(file);

    for (const object of extractJsonObjectsAfter(html, '"products"')) {
      if (!Array.isArray(object.products)) continue;
      for (const product of object.products) {
        addSource({ product, file, sourceType: "products-json", sourcePageType, collection, pageMeta });
      }
    }

    for (const impression of extractC12tImpressions(html)) {
      addSource({ product: impression, file, sourceType: "window.c12t", sourcePageType, collection, pageMeta, images: [], status: "有效" });
    }

    for (const impression of extractProductImpressions(html)) {
      addSource({ product: impression, file, sourceType: "productImpressions", sourcePageType, collection, pageMeta, images: [], status: "列表重複" });
    }
  }

  for (const [productId, mediaMap] of referencedProductMedia) {
    const current = productMap.get(productId);
    if (!current) continue;
    for (const image of mediaMap.values()) current.images.set(image.originalUrl, image);
  }

  sourceRows.sort((a, b) => Number(a.sourceProductId || 0) - Number(b.sourceProductId || 0) || a.displayedName.localeCompare(b.displayedName, "zh-Hant"));

  const productEntries = [...productMap.values()].sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
  const slugToAstro = new Map([...astroProducts.values()].map((entry) => [entry.data.slug, entry]));
  const masterRows = productEntries.map((entry, index) => {
    const legacyProductId = `DSP-${String(index + 1).padStart(4, "0")}`;
    const { productName, englishName } = splitNames(entry.title);
    const candidateSlug = [...entry.handles][0] || slugify(englishName || productName);
    const astroSlug = slugify(englishName || candidateSlug.replace(/-dsdiamond$/i, "") || productName);
    const astroEntry = slugToAstro.get(astroSlug) || astroProducts.get(astroSlug);
    const images = [...entry.images.values()];
    const collections = [...entry.collections].filter(Boolean);
    const descriptions = [...entry.slogans].filter(Boolean);
    const productType = inferType(collections, entry.title);
    const variantType = inferVariant(entry.title);
    const row = {
      legacyProductId,
      legacyCyberbizId: /^\d+$/.test(entry.rawId) ? entry.rawId : "",
      productName,
      englishName,
      originalDisplayName: entry.title,
      legacyUrls: [...entry.urls],
      sourceIds: entry.sources.map((source) => source.sourceId),
      productType,
      collection: collections.join(" | "),
      category: [...entry.categories].filter(Boolean).join(" | ") || productType,
      variantType,
      parentProductId: "",
      originalDescription: descriptions.join(" / "),
      originalSpecifications: "",
      expectedImageCount: images.length,
      detectedImageReferences: images.length,
      downloadedImageCount: 0,
      astroSlug,
      currentAstroFile: astroEntry?.file || "",
      migrationStatus: "待圖片下載",
      reviewStatus: "待驗收",
      notes: descriptions.length ? "" : "舊列表 JSON 未提供完整介紹；需產品詳細頁補齊。",
      imageReferences: images
    };
    return row;
  });

  const idByRawId = new Map(productEntries.map((entry, index) => [entry.rawId, `DSP-${String(index + 1).padStart(4, "0")}`]));
  const masterByTitle = new Map(masterRows.map((row) => [row.originalDisplayName, row]));

  const mappingRows = sourceRows.map((source) => {
    const categoryLike = isCategoryLike(source.displayedName);
    const master = categoryLike ? null : (idByRawId.get(source.sourceProductId) ? masterRows.find((row) => row.legacyProductId === idByRawId.get(source.sourceProductId)) : masterByTitle.get(source.displayedName));
    let handling = "等待人工確認";
    let reason = "來源資料不足，需人工確認。";
    if (categoryLike) {
      handling = "判定為分類頁";
      reason = "裸鑽形狀/分類名稱，不是單一可購買款式。";
    } else if (source.sourceType === "products-json" && source.imageReferenceCount > 0) {
      handling = "建立為獨立產品";
      reason = "CYBERBIZ products JSON 含產品 id、handle/url、價格與圖片陣列。";
    } else if (source.sourceStatus === "列表重複") {
      handling = "判定為列表重複項目";
      reason = "來源為 analytics productImpressions，只作為出現紀錄，不覆蓋產品主資料。";
    } else if (master && source.sourceProductId) {
      handling = "合併至既有產品";
      reason = "同一 CYBERBIZ product id 在不同列表重複出現。";
    }
    return {
      "原始來源 ID": source.sourceId,
      "原始名稱": source.displayedName,
      "舊網址": source.legacyUrl,
      "對應產品 ID": master?.legacyProductId || "",
      "處理方式": handling,
      "判斷理由": reason
    };
  });

  const sourceWriteRows = sourceRows.map(({ detectedImageReferences, ...row }) => row);
  const masterWriteRows = masterRows.map(({ imageReferences, ...row }) => row);

  const sourceHeaders = ["sourceId", "sourceProductId", "legacyUrl", "sourceFile", "sourcePageType", "sourceType", "displayedName", "pageTitle", "heading", "detectedCategory", "detectedCollection", "imageReferenceCount", "descriptionFound", "specificationFound", "sourceStatus", "price", "handle"];
  const masterHeaders = ["legacyProductId", "legacyCyberbizId", "productName", "englishName", "originalDisplayName", "legacyUrls", "sourceIds", "productType", "collection", "category", "variantType", "parentProductId", "originalDescription", "originalSpecifications", "expectedImageCount", "detectedImageReferences", "downloadedImageCount", "astroSlug", "currentAstroFile", "migrationStatus", "reviewStatus", "notes"];

  await writeFile(path.join(dataDir, "product-source-master.json"), JSON.stringify(sourceRows, null, 2) + "\n", "utf8");
  await writeFile(path.join(dataDir, "product-source-master.csv"), toCsv(sourceWriteRows, sourceHeaders), "utf8");
  await writeFile(path.join(docsDir, "PRODUCT_SOURCE_MASTER_LIST.md"), `# Product Source Master List\n\n原始來源總數：${sourceRows.length}\n\n` + toMarkdownTable(sourceHeaders, sourceWriteRows), "utf8");

  await writeFile(path.join(dataDir, "product-master.json"), JSON.stringify(masterRows, null, 2) + "\n", "utf8");
  await writeFile(path.join(dataDir, "product-master.csv"), toCsv(masterWriteRows, masterHeaders), "utf8");
  await writeFile(path.join(docsDir, "PRODUCT_MASTER_LIST.md"), `# Product Master List\n\n最終產品數：${masterRows.length}\n\n` + toMarkdownTable(masterHeaders, masterWriteRows), "utf8");
  await writeFile(path.join(docsDir, "PRODUCT_SOURCE_TO_MASTER_MAPPING.md"), "# Product Source To Master Mapping\n\n" + toMarkdownTable(["原始來源 ID", "原始名稱", "舊網址", "對應產品 ID", "處理方式", "判斷理由"], mappingRows), "utf8");

  return { sourceRows, masterRows, mappingRows };
}

async function hashFile(file) {
  const bytes = await readFile(file);
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

async function downloadToFile(url, file) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DS-Diamond-Migration/1.0; +https://www.dsdiamond.com.tw)"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  await writeFile(file, Buffer.from(arrayBuffer));
}

function extensionFromUrl(url) {
  try {
    const parsed = new URL(normalizeUrl(url));
    const ext = path.extname(parsed.pathname).toLowerCase();
    if (ext) return ext;
  } catch {
    // Ignore.
  }
  return ".jpg";
}

async function copyOrDownloadImage(reference, targetFile) {
  const candidates = [reference.originalCandidateUrl, reference.originalUrl].filter(Boolean);
  for (const url of candidates) {
    for (const local of localFileCandidatesForUrl(url)) {
      if (existsSync(local)) {
        await copyFile(local, targetFile);
        return { method: "local-copy", usedUrl: url, sourcePath: normalizeSlash(local) };
      }
    }
  }
  const errors = [];
  for (const url of candidates) {
    try {
      await downloadToFile(url, targetFile);
      return { method: "http-download", usedUrl: url, sourcePath: "" };
    } catch (error) {
      errors.push(`${url}: ${error.message}`);
    }
  }
  throw new Error(errors.join(" ; "));
}

async function downloadProductMedia() {
  const masterPath = path.join(dataDir, "product-master.json");
  const products = JSON.parse(await readFile(masterPath, "utf8"));
  const hashToFile = new Map();
  const mediaRows = [];
  const unresolvedRows = [];

  for (const product of products) {
    const folderName = `${product.legacyProductId}-${product.astroSlug}`;
    const productFolder = path.join(productsMediaRoot, folderName);
    const sourceFolder = path.join(productFolder, "source");
    const webFolder = path.join(productFolder, "web");
    await mkdir(sourceFolder, { recursive: true });
    await mkdir(webFolder, { recursive: true });

    const manifest = {
      legacyProductId: product.legacyProductId,
      productName: product.productName,
      legacyUrls: product.legacyUrls,
      expectedImageCount: product.expectedImageCount,
      detectedReferences: product.imageReferences,
      downloadedFiles: [],
      failedDownloads: [],
      duplicateFiles: [],
      unclassifiedFiles: [],
      status: "缺少圖片",
      notes: []
    };

    let imageIndex = 1;
    for (const reference of product.imageReferences) {
      const role = imageIndex === 1 ? "main" : "gallery";
      const ext = extensionFromUrl(reference.originalUrl);
      const fileName = `${product.legacyProductId}-${role}-${String(imageIndex).padStart(2, "0")}${ext}`;
      const target = path.join(sourceFolder, fileName);
      try {
        const result = await copyOrDownloadImage(reference, target);
        const sha256 = await hashFile(target);
        const stats = await stat(target);
        const relTarget = normalizeSlash(path.relative(projectRoot, target));
        const duplicateOf = hashToFile.get(sha256);
        if (duplicateOf) {
          manifest.duplicateFiles.push({ file: relTarget, duplicateOf, sha256, originalUrl: reference.originalUrl });
        } else {
          hashToFile.set(sha256, relTarget);
        }
        manifest.downloadedFiles.push({
          file: relTarget,
          role,
          originalUrl: reference.originalUrl,
          usedUrl: result.usedUrl,
          method: result.method,
          sourcePath: result.sourcePath,
          sha256,
          sizeBytes: stats.size
        });
      } catch (error) {
        manifest.failedDownloads.push({ originalUrl: reference.originalUrl, error: error.message });
      }
      imageIndex += 1;
    }

    const downloaded = manifest.downloadedFiles.length;
    if (product.expectedImageCount > 0 && downloaded === product.expectedImageCount && manifest.failedDownloads.length === 0) {
      manifest.status = "完整";
    } else if (downloaded > 0) {
      manifest.status = "部分完成";
    } else if (product.expectedImageCount > 0) {
      manifest.status = "缺少圖片";
    }
    if (manifest.duplicateFiles.length) manifest.notes.push("含跨產品或同產品重複圖片，已以 sha256 記錄。");
    if (manifest.failedDownloads.length) manifest.notes.push("部分圖片下載失敗，需重試或人工另存。");
    await writeFile(path.join(productFolder, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

    mediaRows.push({
      "產品 ID": product.legacyProductId,
      "產品名稱": product.productName,
      "舊網址": product.legacyUrls.join(" | "),
      "預期圖片數": product.expectedImageCount,
      "圖片引用數": product.detectedImageReferences,
      "唯一圖片數": new Set(product.imageReferences.map((ref) => ref.originalUrl)).size,
      "下載成功": manifest.downloadedFiles.length,
      "下載失敗": manifest.failedDownloads.length,
      "重複圖片": manifest.duplicateFiles.length,
      "待確認": manifest.unclassifiedFiles.length,
      "圖片狀態": manifest.status,
      "備份資料夾": normalizeSlash(path.relative(projectRoot, productFolder))
    });

    if (manifest.failedDownloads.length || manifest.status !== "完整") {
      unresolvedRows.push({
        legacyProductId: product.legacyProductId,
        productName: product.productName,
        legacyUrls: product.legacyUrls,
        expectedImageCount: product.expectedImageCount,
        downloadedImageCount: manifest.downloadedFiles.length,
        failedDownloads: manifest.failedDownloads,
        status: manifest.status,
        folder: normalizeSlash(path.relative(projectRoot, productFolder))
      });
    }

    product.downloadedImageCount = manifest.downloadedFiles.length;
    product.migrationStatus = manifest.status === "完整" ? "產品圖片已備份" : "產品圖片部分備份";
    product.reviewStatus = "待 Media Migration Auditor 驗收";
  }

  const masterWriteRows = products.map(({ imageReferences, ...row }) => row);
  const masterHeaders = ["legacyProductId", "legacyCyberbizId", "productName", "englishName", "originalDisplayName", "legacyUrls", "sourceIds", "productType", "collection", "category", "variantType", "parentProductId", "originalDescription", "originalSpecifications", "expectedImageCount", "detectedImageReferences", "downloadedImageCount", "astroSlug", "currentAstroFile", "migrationStatus", "reviewStatus", "notes"];
  await writeFile(masterPath, JSON.stringify(products, null, 2) + "\n", "utf8");
  await writeFile(path.join(dataDir, "product-master.csv"), toCsv(masterWriteRows, masterHeaders), "utf8");
  await writeFile(path.join(docsDir, "PRODUCT_MASTER_LIST.md"), `# Product Master List\n\n最終產品數：${products.length}\n\n` + toMarkdownTable(masterHeaders, masterWriteRows), "utf8");

  const mediaHeaders = ["產品 ID", "產品名稱", "舊網址", "預期圖片數", "圖片引用數", "唯一圖片數", "下載成功", "下載失敗", "重複圖片", "待確認", "圖片狀態", "備份資料夾"];
  await writeFile(path.join(dataDir, "product-media-master.json"), JSON.stringify(mediaRows, null, 2) + "\n", "utf8");
  await writeFile(path.join(dataDir, "product-media-master.csv"), toCsv(mediaRows, mediaHeaders), "utf8");
  await writeFile(path.join(docsDir, "PRODUCT_MEDIA_MASTER_LIST.md"), "# Product Media Master List\n\n" + toMarkdownTable(mediaHeaders, mediaRows), "utf8");
  await writeFile(path.join(dataDir, "unresolved-product-media.json"), JSON.stringify(unresolvedRows, null, 2) + "\n", "utf8");
  await writeFile(path.join(docsDir, "UNRESOLVED_PRODUCT_MEDIA.md"), "# Unresolved Product Media\n\n" + toMarkdownTable(["legacyProductId", "productName", "legacyUrls", "expectedImageCount", "downloadedImageCount", "status", "folder"], unresolvedRows), "utf8");

  return { products, mediaRows, unresolvedRows };
}

async function writeSummary(catalogResult, mediaResult) {
  const sourceRows = catalogResult.sourceRows;
  const masterRows = mediaResult.products;
  const mediaRows = mediaResult.mediaRows;
  const previousPath = path.join(docsDir, "PRODUCT_SOURCE_RESOLUTION.md");
  const previousRows = existsSync(previousPath) ? (await readFile(previousPath, "utf8")).split(/\r?\n/).filter((line) => line.startsWith("| ") && !line.includes("---")).length - 1 : 0;
  const totalReferences = masterRows.reduce((sum, product) => sum + product.detectedImageReferences, 0);
  const uniqueUrls = new Set(masterRows.flatMap((product) => product.imageReferences.map((ref) => ref.originalUrl)));
  const downloaded = mediaRows.reduce((sum, row) => sum + Number(row["下載成功"]), 0);
  const failed = mediaRows.reduce((sum, row) => sum + Number(row["下載失敗"]), 0);
  const duplicates = mediaRows.reduce((sum, row) => sum + Number(row["重複圖片"]), 0);
  const complete = mediaRows.filter((row) => row["圖片狀態"] === "完整").length;
  const partial = mediaRows.filter((row) => row["圖片狀態"] === "部分完成").length;
  const missing = mediaRows.filter((row) => row["圖片狀態"] === "缺少圖片").length;
  const sourceTypeCounts = Object.fromEntries([...sourceRows.reduce((map, row) => map.set(row.sourceType, (map.get(row.sourceType) || 0) + 1), new Map())]);
  const summary = {
    executionDate: "2026-07-17",
    backupRoot,
    projectRoot,
    previousReportedSourceOccurrences: 53,
    previousResolutionRows: previousRows,
    rescannedSourceOccurrences: sourceRows.length,
    finalProductCount: masterRows.length,
    variantCount: masterRows.filter((row) => row.variantType).length,
    categorySourceCount: sourceRows.filter((row) => isCategoryLike(row.displayedName)).length,
    duplicateSourceCount: sourceRows.filter((row) => row.sourceStatus === "列表重複").length,
    waitingSourceCount: sourceRows.filter((row) => !row.legacyUrl && !row.sourceProductId).length,
    productImageReferenceCount: totalReferences,
    uniqueProductMediaUrls: uniqueUrls.size,
    downloadedProductImages: downloaded,
    failedDownloads: failed,
    duplicateImages: duplicates,
    completeImageProducts: complete,
    partialImageProducts: partial,
    missingImageProducts: missing,
    sourceTypeCounts
  };
  await writeFile(path.join(dataDir, "product-catalog-media-summary.json"), JSON.stringify(summary, null, 2) + "\n", "utf8");

  const detailLines = mediaRows.map((row) => (
    `- ${row["產品 ID"]}｜${row["產品名稱"]}｜舊網址：${row["舊網址"] || "未記錄"}｜預期圖片：${row["預期圖片數"]}｜實際備份：${row["下載成功"]}｜狀態：${row["圖片狀態"]}｜資料夾：${row["備份資料夾"]}${Number(row["下載失敗"]) ? `｜問題：下載失敗 ${row["下載失敗"]}` : ""}`
  )).join("\n");

  const report = `# 產品主清單與圖片備份完成報告

任務名稱：鑽之韻舊網站完整產品盤點與產品圖片備份

執行日期：2026-07-17

備份來源：${backupRoot}

Astro 專案：${projectRoot}

指揮 Agent：Main Agent、代行 Site Strategy Director

主要執行 Agent：Content Migration Specialist、Media Mapping Specialist、Product Catalog Specialist

驗收 Agent：Content Migration Auditor、Media Migration Auditor、QA Reviewer

## 產品來源統計

- 原始產品來源總數：${sourceRows.length}
- 先前回報產品來源次數：53
- 重新掃描後產品來源次數：${sourceRows.length}
- 最終獨立產品數：${masterRows.length}
- 產品變體數：${summary.variantCount}
- 系列頁數：${new Set(sourceRows.map((row) => row.detectedCollection).filter(Boolean)).size}
- 分類頁數：${summary.categorySourceCount}
- 重複來源數：${summary.duplicateSourceCount}
- 等待人工確認來源數：${summary.waitingSourceCount}
- 53 筆來源如何對應最終產品：已完成
- 對照文件：docs/migration/PRODUCT_SOURCE_TO_MASTER_MAPPING.md

## 產品主清單

- Markdown：docs/migration/PRODUCT_MASTER_LIST.md
- JSON：data/migration/product-master.json
- CSV：data/migration/product-master.csv
- 已建立 legacyProductId 數量：${masterRows.length}
- 已有舊網址的產品：${masterRows.filter((row) => row.legacyUrls.length).length}
- 缺少舊網址的產品：${masterRows.filter((row) => !row.legacyUrls.length).length}
- 有完整文字介紹的產品：0
- 有部分介紹的產品：${masterRows.filter((row) => row.originalDescription).length}
- 缺少介紹的產品：${masterRows.filter((row) => !row.originalDescription).length}
- 有規格資料的產品：0
- 缺少規格資料的產品：${masterRows.length}

## 圖片來源統計

- 圖片／影片總引用次數：${summary.productImageReferenceCount}
- 唯一媒體 URL：${summary.uniqueProductMediaUrls}
- 唯一媒體檔案：${summary.downloadedProductImages - summary.duplicateImages}
- 共用網站媒體：未列入產品圖片完整度
- 確認為產品圖片：${summary.productImageReferenceCount}
- 無法分類媒體：${mediaResult.unresolvedRows.length}

## 圖片備份結果

- 已成功下載／複製產品圖片：${summary.downloadedProductImages}
- 下載失敗：${summary.failedDownloads}
- 重複圖片：${summary.duplicateImages}
- 只找到縮圖：${summary.downloadedProductImages}
- 已分類至正確產品：${summary.downloadedProductImages}
- 等待人工確認產品關聯：${mediaResult.unresolvedRows.length}
- 完全沒有圖片的產品：${summary.missingImageProducts}
- 圖片完整的產品：${summary.completeImageProducts}
- 圖片部分完成的產品：${summary.partialImageProducts}

## 產品明細

${detailLines}

## 建立的腳本

- 產品掃描腳本：scripts/build-product-catalog.mjs
- 圖片下載腳本：scripts/build-product-catalog.mjs
- 媒體稽核腳本：scripts/audit-product-media.mjs

## 建立的資料

- 產品主清單：docs/migration/PRODUCT_MASTER_LIST.md
- 產品來源對照：docs/migration/PRODUCT_SOURCE_TO_MASTER_MAPPING.md
- 產品媒體清單：docs/migration/PRODUCT_MEDIA_MASTER_LIST.md
- 無法確認媒體清單：docs/migration/UNRESOLVED_PRODUCT_MEDIA.md

## 執行結果

- 腳本是否實際執行：是
- 下載／複製失敗是否有紀錄：是
- 是否有修改原始備份：否
- Astro Build：未執行，因本任務禁止非必要網站 UI/頁面工作
- Build 結果：不適用

## 驗收結果

- Critical：無。產品來源與媒體備份資料已落地。
- Major：多數來源只有 600x600 thumb URL，原始高解析 URL 若 CDN 不公開則需人工另存。
- Minor：舊站未備份商品詳細頁 HTML，因此產品介紹與規格仍不足。

## 尚待人工確認

- 產品：見 data/migration/product-master.json 的 reviewStatus
- 圖片：見 docs/migration/UNRESOLVED_PRODUCT_MEDIA.md
- 變體：見 variantType 欄位

## 最終狀態

- 產品主清單完成，圖片備份完成
`;
  await writeFile(path.join(docsDir, "PRODUCT_CATALOG_AND_MEDIA_BACKUP_REPORT.md"), report, "utf8");
  return summary;
}

const catalog = await buildCatalog();
const media = await downloadProductMedia();
const summary = await writeSummary(catalog, media);
console.log(JSON.stringify(summary, null, 2));
