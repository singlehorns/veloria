import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const productContentRoot = path.join(projectRoot, "src", "content", "products");
const reportPath = path.join(projectRoot, "data", "migration", "product-api-id-match-audit.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function apiUrlFromProductUrl(rawUrl = "") {
  if (!rawUrl) return "";
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/$/, "") + ".json";
    return url.toString();
  } catch {
    return "";
  }
}

async function fetchJsonWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "application/json",
          "user-agent": "Mozilla/5.0 product-api-id-audit"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await sleep(400 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  await mkdir(path.dirname(reportPath), { recursive: true });
  const productFiles = (await readdir(productContentRoot)).filter((file) => file.endsWith(".json"));
  const rows = [];

  for (const fileName of productFiles) {
    const file = path.join(productContentRoot, fileName);
    const product = JSON.parse(await readFile(file, "utf8"));
    const apiUrl = apiUrlFromProductUrl(product.originalUrl || product.canonicalUrl || "");
    const expectedId = String(product.legacyCyberbizId || "");

    if (!apiUrl) {
      rows.push({ fileName, slug: product.slug, expectedId, status: "missing-api-url" });
      continue;
    }

    try {
      const apiProduct = await fetchJsonWithRetry(apiUrl);
      const apiId = String(apiProduct.id || "");
      rows.push({
        fileName,
        slug: product.slug,
        name: product.originalDisplayName || product.name || product.englishName || "",
        expectedId,
        apiId,
        apiTitle: apiProduct.title || "",
        apiUrl,
        imageCount: Array.isArray(product.images) ? product.images.length : 0,
        status: expectedId && apiId === expectedId ? "matched" : "id-mismatch"
      });
    } catch (error) {
      rows.push({ fileName, slug: product.slug, expectedId, apiUrl, status: "failed", error: error.message });
    }

    await sleep(60);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    productFiles: productFiles.length,
    matched: rows.filter((row) => row.status === "matched").length,
    mismatched: rows.filter((row) => row.status === "id-mismatch").length,
    failed: rows.filter((row) => row.status === "failed").length,
    missingApiUrl: rows.filter((row) => row.status === "missing-api-url").length,
    rows
  };
  await writeFile(reportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(summary, null, 2));
}

await main();
