import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const productsDir = path.join(root, "src", "content", "products");
const screenshotsDir = path.join(root, "screenshots", "original-product-pages");
const manifestPath = path.join(screenshotsDir, "manifest-with-urls.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function productUrl(product) {
  return product.originalUrl || product.canonicalUrl || product.legacyUrls?.[0] || "";
}

const products = fs
  .readdirSync(productsDir)
  .filter((file) => file.endsWith(".json"))
  .map((file) => {
    const slug = file.replace(/\.json$/, "");
    const data = readJson(path.join(productsDir, file));
    return {
      slug,
      legacyProductId: data.legacyProductId || "",
      legacyCyberbizId: data.legacyCyberbizId || "",
      name: data.originalDisplayName || data.name || slug,
      originalUrl: productUrl(data),
    };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

const screenshotFiles = fs.existsSync(screenshotsDir)
  ? fs.readdirSync(screenshotsDir).filter((file) => file.toLowerCase().endsWith(".png"))
  : [];

function exactSlugMatch(file, product) {
  const stem = file.replace(/\.png$/i, "");
  return stem === product.slug || stem.endsWith(`-${product.slug}`);
}

function idMatch(file, product) {
  return Boolean(product.legacyProductId && file.includes(product.legacyProductId));
}

const mapped = products.map((product) => {
  const exactMatches = screenshotFiles.filter((file) => exactSlugMatch(file, product));
  const idMatches = screenshotFiles.filter((file) => idMatch(file, product));
  const selected = exactMatches[0] || (idMatches.length === 1 ? idMatches[0] : "");

  let status = "ok";
  const reasons = [];
  if (!product.originalUrl) {
    status = "missing-url";
    reasons.push("product has no originalUrl/canonicalUrl/legacyUrl");
  }
  if (!selected) {
    status = "missing-screenshot";
    reasons.push("no screenshot could be matched");
  }
  if (selected && !exactMatches.length) {
    status = "needs-rescreenshot";
    reasons.push("matched by product id only; filename does not preserve slug");
  }
  if (idMatches.length > 1 && !exactMatches.length) {
    status = "needs-rescreenshot";
    reasons.push("product id matches more than one screenshot and slug match is unavailable");
  }

  return {
    ...product,
    screenshotFile: selected,
    screenshotPath: selected ? path.join(screenshotsDir, selected) : "",
    status,
    reasons,
  };
});

const summary = {
  generatedAt: new Date().toISOString(),
  source: "https://www.dsdiamond.com.tw/zh-TW/",
  totalProducts: products.length,
  totalScreenshots: screenshotFiles.length,
  ok: mapped.filter((item) => item.status === "ok").length,
  needsRescreenshot: mapped.filter((item) => item.status === "needs-rescreenshot").length,
  missingScreenshot: mapped.filter((item) => item.status === "missing-screenshot").length,
  missingUrl: mapped.filter((item) => item.status === "missing-url").length,
  items: mapped,
};

fs.writeFileSync(manifestPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      manifestPath,
      totalProducts: summary.totalProducts,
      totalScreenshots: summary.totalScreenshots,
      ok: summary.ok,
      needsRescreenshot: summary.needsRescreenshot,
      missingScreenshot: summary.missingScreenshot,
      missingUrl: summary.missingUrl,
      needs: mapped
        .filter((item) => item.status !== "ok")
        .map(({ slug, legacyProductId, originalUrl, status, screenshotFile, reasons }) => ({
          slug,
          legacyProductId,
          originalUrl,
          status,
          screenshotFile,
          reasons,
        })),
    },
    null,
    2,
  ),
);
