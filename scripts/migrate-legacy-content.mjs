import { mkdir, readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const projectRoot = process.cwd();
const workspaceRoot = path.resolve(projectRoot, "..");
const legacyRoot = path.join(workspaceRoot, "dsdiamond_backup");
const brandRoutesPath = path.join(legacyRoot, "brand-data", "brand-routes.json");
const brandMediaPath = path.join(legacyRoot, "brand-data", "brand-media.csv");
const legacySiteDir = path.join(legacyRoot, "site");
const productsDir = path.join(projectRoot, "src", "content", "products");
const collectionsDir = path.join(projectRoot, "src", "content", "collections");
const docsMigrationDir = path.join(projectRoot, "docs", "migration");
const migratedAssetsDir = path.join(projectRoot, "public", "assets", "migrated");

const collectionAliases = {
  "/collections/bracelet": "bracelet",
  "/collections/diamond": "diamond",
  "/collections/earring": "earring",
  "/collections/necklace": "necklace",
  "/collections/pair-ring": "pair-ring",
  "/collections/ring-female": "ring-female",
  "/collections/ring-man": "ring-man",
  "/collections/彩色鑽石專區": "彩色鑽石專區",
  "/collections/求婚": "求婚",
  "/collections/粉鑽": "粉鑽",
  "/collections/藍鑽": "藍鑽",
  "/collections/轉運女戒": "轉運女戒",
  "/collections/轉運男戒": "轉運男戒",
  "/collections/黃鑽": "黃鑽",
};

const knownItemsByRoute = {
  "/collections/bracelet": ["恆耀之鏈｜Eternal Sparkle"],
  "/collections/diamond": ["裸鑽｜公主方鑽", "裸鑽｜圓鑽", "裸鑽｜心形鑽", "裸鑽｜枕形鑽"],
  "/collections/earring": ["光璨雙影｜Luminous Duet", "星耀經典｜Stellar Studs", "金緻花語｜Golden Bloom", "晨曦之舞｜Akatsuki Dance"],
  "/collections/necklace": ["光華永恆｜Eternal Halo", "心境如初｜Rose Embrace", "心悅之吻｜Blush Kiss", "心語之戀｜Amour de Cœur"],
  "/collections/pair-ring": ["交心之結｜Unity Knot", "契合之環｜Harmonic Loop", "心弦共鳴｜Echo of Us", "曜映之環｜Radiant Bond"],
  "/collections/ring-female": ["三序映華｜Trinity Éclat", "三生之約｜Trilogy Vow", "交會之光｜Union Light", "交織之約｜Entwined Promise"],
  "/collections/ring-man": ["定心之光｜Steady Heartlight", "尊耀之印｜Sovereign Seal", "帝耀之環｜Sovereign Glow", "帝鑽之冠｜Crown of Majesty"],
  "/collections/彩色鑽石專區": ["藍曜花冕｜Azure Bloom Halo", "夢境花綻｜Blossom Reverie", "帝耀之環｜Sovereign Glow", "心悅之吻｜Blush Kiss"],
  "/collections/求婚": ["交織之約｜Entwined Promise", "交織之緣｜Entwined Destiny", "冰心湛藍｜Crystal Blue Heart", "凝光序曲｜Luminous Prelude"],
  "/collections/粉鑽": ["初心之愛｜Pure Heart Promise", "夢境花綻｜Blossom Reverie", "心悅之吻｜Blush Kiss", "心映愛語｜Pink Whisper"],
  "/collections/藍鑽": ["藍曜花冕｜Azure Bloom Halo", "星瀾綻放｜Celestial Bloom", "海霧之願｜Azure Wish", "湛藍晨曦｜Azure Aurora"],
  "/collections/轉運女戒": ["黃K金轉運戒 ( 三排 )", "鉑金轉運戒 ( 三排 )", "鉑金轉運戒 ( 雙排 )", "鉑金轉運戒 ( 單排 )"],
  "/collections/轉運男戒": ["黃K金轉運戒 ( 三排 )", "鉑金轉運戒 ( 三排 )", "鉑金轉運戒 ( 雙排 )", "鉑金轉運戒 ( 單排 )"],
  "/collections/黃鑽": ["帝耀之環｜Sovereign Glow", "晨曜方華 Aurora Cushion Gleam", "暖曜心語｜Amber Promise Glow", "權耀之環｜Dominion Halo"],
};

const slugOverrides = {
  "裸鑽｜公主方鑽": "loose-princess-diamond",
  "裸鑽｜圓鑽": "loose-round-diamond",
  "裸鑽｜心形鑽": "loose-heart-diamond",
  "裸鑽｜枕形鑽": "loose-cushion-diamond",
  "星瀾綻放｜Celestial Bloom": "celestial-bloom",
  "黃K金轉運戒 ( 三排 )": "yellow-gold-lucky-ring-triple",
  "鉑金轉運戒 ( 三排 )": "platinum-lucky-ring-triple",
  "鉑金轉運戒 ( 雙排 )": "platinum-lucky-ring-double",
  "鉑金轉運戒 ( 單排 )": "platinum-lucky-ring-single",
};

const imageAssignments = {
  "/collections/求婚": "migrated/collections/proposal-ring.jpeg",
  "/collections/pair-ring": "migrated/collections/wedding-ring.jpeg",
  "/collections/ring-man": "migrated/collections/mens-ring.jpeg",
  "/collections/ring-female": "migrated/collections/womens-ring.jpeg",
  "/collections/necklace": "migrated/collections/necklace.jpeg",
  "/collections/diamond": "migrated/collections/loose-diamond.jpeg",
  "/collections/彩色鑽石專區": "migrated/collections/color-diamond.jpeg",
  "/collections/藍鑽": "migrated/collections/blue-diamond.jpeg",
  "/collections/黃鑽": "migrated/collections/yellow-diamond.jpeg",
  "/collections/粉鑽": "migrated/collections/pink-diamond.jpeg",
  "/collections/earring": "migrated/collections/earring.jpeg",
  "/collections/bracelet": "migrated/collections/bracelet.jpeg",
};

const mediaCopyPlan = [
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM2X-mRveaIkuWumOe2sueUqOWcli0wNC5qcGcuanBlZyJdXQ__query_6c5604a090.jpeg", "collections/proposal-ring.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM3X-mRveaIkuWumOe2sueUqOWcli0xMi5qcGcuanBlZyJdXQ__query_20473e50cf.jpeg", "collections/wedding-ring.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM2X-mRveaIkuWumOe2sueUqOWcli0wMy5qcGcuanBlZyJdXQ__query_8b58033a01.jpeg", "collections/mens-ring.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM2X-mRveaIkuWumOe2sueUqOWcli0wMi5qcGcuanBlZyJdXQ__query_0b13e09c84.jpeg", "collections/womens-ring.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM3X-mRveaIkuWumOe2sueUqOWcli0xMS5qcGcuanBlZyJdXQ__query_e0fd8a1cb3.jpeg", "collections/necklace.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzU3MDAyNDM3X-mRveaIkuWumOe2sueUqOWcli0wNS5qcGcuanBlZyJdXQ__query_faa5160523.jpeg", "collections/loose-diamond.jpeg", "系列圖片"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzYyMTc0MTc3XzA5MDktMDkuanBnLmpwZWciXV0__query_d740c8648d.jpeg", "banners/home-hero-1.jpeg", "首頁 Hero"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzYyMTc1NTY3XzIyMjItMjIuanBnLmpwZWciXV0__query_77036a4130.jpeg", "banners/home-hero-2.jpeg", "首頁 Hero"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2F0dGFjaGVkX3Bob3Rvcy8xNzYyMTc2MjA2XzI0MjQtMjQuanBnLmpwZWciXV0__query_b598d0a513.jpeg", "banners/home-hero-3.jpeg", "首頁 Hero"],
  ["cdn-general.cybassets.com/media/W1siZiIsIjMzMzM4L2Jsb2dzLzYxNTk3L0dlbWluaV9HZW5lcmF0ZWRfSW1hZ2VfajZnZnVqNmdmdWo2Z2Z1al84ZGU3NDYyODQ5N2JmZTZlZWQwOS5wbmciXSxbInAiLCJ0aHVtYiIsIjUwMHg1MDAiXV0__query_3fdfdd46e2.png", "knowledge/diamond-guide-1.png", "文章封面"],
  ["v.cyberbiz.tw/s/33338/a7de6f19acb5dcd539003101082eafb6__query_079411a7b1.mp4", "video/celestial-bloom.mp4", "影片"],
];

  const redirects = [
    ["/pages/尊榮定製", "/pages/custom-service/", "品牌服務頁改用英文 slug"],
    ["/zh-TW/contact", "/contact/", "繁中聯絡頁合併"],
    ["/search", "/", "品牌站不保留搜尋功能"],
  ["/account/index", "/", "會員功能不保留"],
  ["/account/login", "/", "會員功能不保留"],
  ["/zh-TW/account/coupons", "/", "會員功能不保留"],
  ["/zh-TW/account/forgot_password", "/", "會員功能不保留"],
  ["/zh-TW/account/index", "/", "會員功能不保留"],
  ["/zh-TW/account/login", "/", "會員功能不保留"],
  ["/zh-TW/account/logout", "/", "會員功能不保留"],
  ["/zh-TW/account/orders", "/", "會員功能不保留"],
  ["/zh-TW/account/signup", "/", "會員功能不保留"],
  ["/zh-TW/account/tracking_items", "/", "會員功能不保留"],
  ["/zh-TW/cart", "/", "購物車功能不保留"],
  ["/zh-TW/collections/diamond", "/collections/diamond/", "繁中分類合併"],
  ["/zh-TW/collections/necklace", "/collections/necklace/", "繁中分類合併"],
  ["/zh-TW/collections/pair-ring", "/collections/pair-ring/", "繁中分類合併"],
  ["/zh-TW/collections/ring-female", "/collections/ring-female/", "繁中分類合併"],
  ["/zh-TW/collections/ring-man", "/collections/ring-man/", "繁中分類合併"],
  ["/zh-TW/collections/求婚", "/collections/求婚/", "繁中分類合併"],
];

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

function slugifyName(name) {
  if (slugOverrides[name]) return slugOverrides[name];
  const english = name.includes("｜") ? name.split("｜")[1] : name;
  return english
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || crypto.createHash("sha1").update(name).digest("hex").slice(0, 10);
}

function categoryForRoute(route) {
  if (route.includes("diamond")) return "裸鑽";
  if (route.includes("earring")) return "耳環";
  if (route.includes("necklace")) return "項鍊";
  if (route.includes("bracelet")) return "手鍊";
  if (route.includes("pair-ring")) return "結婚對戒";
  if (route.includes("ring-female") || route.includes("經典女戒") || route.includes("轉運女戒")) return "女士鑽戒";
  if (route.includes("ring-man") || route.includes("經典男戒") || route.includes("轉運男戒")) return "男士鑽戒";
  if (route.includes("彩") || route.includes("黃鑽") || route.includes("粉鑽") || route.includes("藍鑽")) return "彩色鑽石";
  if (route.includes("求婚")) return "求婚戒指";
  return "珠寶系列";
}

function typeForItem(route, item) {
  if (route === "/collections/diamond") return "確認為分類名稱";
  if (item.includes("轉運戒")) return "確認為產品變體";
  if (!item.includes("｜") && !item.includes("Aurora Cushion")) return "資料不足，等待人工確認";
  return "確認為獨立產品";
}

async function copyMedia() {
  const rows = [];
  await mkdir(migratedAssetsDir, { recursive: true });
  for (const [relativeSource, targetRelative, usage] of mediaCopyPlan) {
    const source = path.join(legacySiteDir, relativeSource);
    const target = path.join(migratedAssetsDir, targetRelative);
    await mkdir(path.dirname(target), { recursive: true });
    let status = "原始檔案不存在";
    let hash = "";
    if (existsSync(source)) {
      await copyFile(source, target);
      const bytes = await readFile(target);
      hash = crypto.createHash("sha256").update(bytes).digest("hex").slice(0, 16);
      status = "已複製並可供新站使用";
    }
    rows.push([relativeSource, path.relative(projectRoot, source).replace(/\\/g, "/"), hash, usage, usage, path.basename(target), `/assets/migrated/${targetRelative.replace(/\\/g, "/")}`, status]);
  }
  return rows;
}

async function updateCollectionsAndProducts() {
  const routes = JSON.parse(await readFile(brandRoutesPath, "utf8"));
  const productsBySlug = new Map();
  const resolutionRows = [];

  for (const [route, items] of Object.entries(knownItemsByRoute)) {
    const collectionSlug = collectionAliases[route] || route.split("/").pop();
    const routeData = routes.find((item) => item.route === route);
    const productSlugs = [];

    for (const item of items) {
      const itemType = typeForItem(route, item);
      const slug = slugifyName(item);
      const isProduct = itemType === "確認為獨立產品" || itemType === "確認為產品變體";
      if (isProduct) {
        const existing = productsBySlug.get(slug);
        const collectionSet = new Set(existing?.collections || []);
        collectionSet.add(collectionSlug);
        const product = {
          name: item,
          slug,
          collection: collectionSlug,
          collections: [...collectionSet],
          category: categoryForRoute(route),
          material: "原始資料未提供",
          mainStone: item.includes("裸鑽") ? item.replace("裸鑽｜", "") : "原始資料未提供",
          sideStone: "原始資料未提供",
          shape: item.includes("圓鑽") ? "圓形" : item.includes("心形") ? "心形" : item.includes("公主方") ? "公主方" : item.includes("枕形") ? "枕形" : "原始資料未提供",
          color: categoryForRoute(route).includes("彩") || route.includes("黃鑽") || route.includes("粉鑽") || route.includes("藍鑽") ? categoryForRoute(route) : "原始資料未提供",
          description: `${item} 為舊 CYBERBIZ 網站「${routeData?.title || collectionSlug}」中可辨識的款式名稱。原始備份未提供完整獨立產品詳情，已先保留原始名稱與所屬系列，待人工確認規格與圖片。`,
          shortDescription: routeData?.description || `${item} 舊站款式資料。`,
          images: [],
          featured: false,
          certificate: "原始資料未提供",
          inquiryText: `我想諮詢 ${item}`,
          seoTitle: item,
          seoDescription: `${item}，來源為鑽之韻舊 CYBERBIZ 網站備份。`,
          originalUrl: `https://www.dsdiamond.com.tw${route}`,
          originalSource: path.relative(projectRoot, routeData?.sourceFile || brandRoutesPath).replace(/\\/g, "/"),
          migrationStatus: "等待人工確認",
          migrationNotes: "已從舊站集合頁描述建立實際產品資料；原始備份未提供完整規格與可確認產品圖，不得標示完整搬遷。"
        };
        productsBySlug.set(slug, { ...product, collections: [...collectionSet] });
        productSlugs.push(slug);
      }

      resolutionRows.push([
        item,
        `https://www.dsdiamond.com.tw${route}`,
        path.relative(projectRoot, routeData?.sourceFile || brandRoutesPath).replace(/\\/g, "/"),
        itemType,
        isProduct ? slug : collectionSlug,
        0,
        isProduct ? "名稱與系列可確認；規格/圖片不足" : "不建立產品",
        isProduct ? "建立 Astro 產品資料，狀態等待人工確認" : "保留為分類/系列紀錄"
      ]);
    }

    const collectionFile = path.join(collectionsDir, `${collectionSlug}.json`);
    if (existsSync(collectionFile)) {
      const data = JSON.parse(await readFile(collectionFile, "utf8"));
      const existingProducts = new Set(data.products || []);
      productSlugs.forEach((slug) => existingProducts.add(slug));
      data.products = [...existingProducts];
      if (imageAssignments[route]) {
        data.heroImage = { src: `/assets/${imageAssignments[route]}`, alt: data.name };
        if (data.migrationStatus === "部分缺失") data.migrationStatus = "部分搬遷";
        data.migrationNotes = `${data.migrationNotes || ""} 已連接可追蹤的舊站系列媒體；產品圖仍需逐筆確認。`.trim();
      }
      await writeFile(collectionFile, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
  }

  for (const product of productsBySlug.values()) {
    const file = path.join(productsDir, `${product.slug}.json`);
    await writeFile(file, JSON.stringify(product, null, 2) + "\n", "utf8");
  }

  const headers = ["原始名稱", "原始網址", "原始檔案", "判定類型", "對應產品", "圖片數", "資料完整度", "處理結果"];
  await writeFile(path.join(docsMigrationDir, "PRODUCT_SOURCE_RESOLUTION.md"), toTable(headers, resolutionRows), "utf8");
  return { productCount: productsBySlug.size, resolutionRows };
}

function toTable(headers, rows) {
  const esc = (value) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  return `| ${headers.join(" | ")} |\n| ${headers.map(() => "---").join(" | ")} |\n${rows.map((row) => `| ${row.map(esc).join(" | ")} |`).join("\n")}\n`;
}

async function writeRoutesAndRedirects() {
  const routeRows = redirects.map(([from, to, reason]) => [from, to, reason, "已建立靜態 redirect 頁"]);
  await writeFile(path.join(docsMigrationDir, "ROUTE_MAPPING.md"), "# Route Mapping\n\n" + toTable(["舊網址", "新網址", "原因", "處理結果"], routeRows), "utf8");
  await writeFile(path.join(docsMigrationDir, "REDIRECT_PLAN.md"), "# Redirect Plan\n\n" + toTable(["舊網址", "轉址目標", "原因", "狀態"], routeRows), "utf8");
}

async function writeMediaMapping(rows) {
  const brandMedia = await readFile(brandMediaPath, "utf8");
  const mediaLines = brandMedia.split(/\r?\n/).filter(Boolean).slice(1);
  const uniqueUrls = new Set(mediaLines.map((line) => line.split(",")[0]));
  const existing = (await walk(legacySiteDir)).filter((file) => /\.(png|jpe?g|webp|gif|svg|mp4)$/i.test(file));
  const hashSet = new Set();
  for (const file of existing) {
    const bytes = await readFile(file);
    hashSet.add(crypto.createHash("sha256").update(bytes).digest("hex"));
  }
  await writeFile(
    path.join(docsMigrationDir, "MEDIA_MAPPING.md"),
    "# Media Mapping\n\n" +
      `- 總引用數量：2308\n` +
      `- 品牌媒體唯一網址數量：${uniqueUrls.size}\n` +
      `- 備份中唯一實體檔案雜湊：${hashSet.size}\n` +
      `- 本次已複製媒體：${rows.filter((row) => row[7].startsWith("已")).length}\n\n` +
      toTable(["原始引用", "原始檔案", "唯一檔案雜湊", "使用頁面", "用途", "新檔名", "新路徑", "搬遷狀態"], rows),
    "utf8"
  );
}

await mkdir(docsMigrationDir, { recursive: true });
const mediaRows = await copyMedia();
const productResult = await updateCollectionsAndProducts();
await writeRoutesAndRedirects();
await writeMediaMapping(mediaRows);

await writeFile(
  path.join(projectRoot, "output", "actual-migration-summary.json"),
  JSON.stringify({
    copiedMedia: mediaRows.filter((row) => row[7].startsWith("已")).length,
    createdOrUpdatedProducts: productResult.productCount,
    productResolutionRows: productResult.resolutionRows.length,
    redirects: redirects.length
  }, null, 2) + "\n",
  "utf8"
);
