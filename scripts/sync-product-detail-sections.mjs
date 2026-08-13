import fs from "node:fs";
import path from "node:path";

const productsDir = path.resolve("src/content/products");
const reportPath = path.resolve("output/product-detail-sections-sync-report.json");

const sectionTitleBySetting = new Map([
  ["product_description_section_spec", "規格說明"],
  ["product_description_section_shipping", "運送方式"],
  ["product_description_section_description", "商品說明"],
]);

function decodeHtml(value = "") {
  return String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function cleanHtml(html = "") {
  return decodeHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\sstyle\s*=\s*"[^"]*"/gi, "")
    .replace(/\sstyle\s*=\s*'[^']*'/gi, "")
    .replace(/<\s*(\/?)\s*(div|span)\b[^>]*>/gi, "")
    .replace(/<\s*p\b[^>]*>/gi, "<p>")
    .replace(/<\s*\/\s*p\s*>/gi, "</p>")
    .replace(/<\s*ul\b[^>]*>/gi, "<ul>")
    .replace(/<\s*\/\s*ul\s*>/gi, "</ul>")
    .replace(/<\s*ol\b[^>]*>/gi, "<ol>")
    .replace(/<\s*\/\s*ol\s*>/gi, "</ol>")
    .replace(/<\s*li\b[^>]*>/gi, "<li>")
    .replace(/<\s*\/\s*li\s*>/gi, "</li>")
    .replace(/<\s*strong\b[^>]*>/gi, "<strong>")
    .replace(/<\s*\/\s*strong\s*>/gi, "</strong>")
    .replace(/<\s*br\s*\/?>/gi, "<br>")
    .replace(/<(?!\/?(p|ul|ol|li|strong|br)\b)[^>]+>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textFromHtml(html = "") {
  return cleanHtml(html)
    .replace(/<br>/gi, "\n")
    .replace(/<\/(p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function productApiUrl(product) {
  const url = product.originalUrl || product.canonicalUrl || product.legacyUrls?.[0] || "";
  if (!url) return "";
  return url.endsWith(".json") ? url : `${url}.json`;
}

function sectionTitle(section) {
  return (
    section.title ||
    sectionTitleBySetting.get(section.setting_name) ||
    section.setting_name?.replace(/^product_description_section_/, "") ||
    "商品資訊"
  );
}

async function fetchProductSections(product) {
  const apiUrl = productApiUrl(product);
  if (!apiUrl) return { apiUrl, sections: [], error: "missing original URL" };

  const response = await fetch(apiUrl, {
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent": "Mozilla/5.0 DS migration checker",
    },
  });
  if (!response.ok) return { apiUrl, sections: [], error: `HTTP ${response.status}` };

  const apiProduct = await response.json();
  const sections = (apiProduct.other_descriptions ?? [])
    .map((section) => ({
      title: sectionTitle(section),
      settingName: section.setting_name || "",
      html: cleanHtml(section.body_html || ""),
    }))
    .filter((section) => section.html && textFromHtml(section.html));

  return { apiUrl, sections, error: "" };
}

const files = fs.readdirSync(productsDir).filter((file) => file.endsWith(".json")).sort();
const report = {
  generatedAt: new Date().toISOString(),
  total: files.length,
  updated: 0,
  withSections: 0,
  withoutSections: 0,
  errors: [],
  items: [],
};

for (const file of files) {
  const filePath = path.join(productsDir, file);
  const product = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const { apiUrl, sections, error } = await fetchProductSections(product);

  if (error) {
    report.errors.push({ slug: product.slug, legacyProductId: product.legacyProductId, apiUrl, error });
  }

  product.productDetailSections = sections;
  fs.writeFileSync(filePath, `${JSON.stringify(product, null, 2)}\n`, "utf8");

  report.updated += 1;
  if (sections.length) report.withSections += 1;
  else report.withoutSections += 1;
  report.items.push({
    slug: product.slug,
    legacyProductId: product.legacyProductId,
    apiUrl,
    sectionCount: sections.length,
    sectionTitles: sections.map((section) => section.title),
    error,
  });
}

fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      total: report.total,
      updated: report.updated,
      withSections: report.withSections,
      withoutSections: report.withoutSections,
      errors: report.errors.length,
      reportPath,
    },
    null,
    2,
  ),
);
