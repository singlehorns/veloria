import { readFile } from "node:fs/promises";

const [input] = process.argv.slice(2);

if (!input) {
  console.error("Usage: node scripts/extract-product-media-sources.mjs <url-or-html-file>");
  process.exit(1);
}

function decodeEntities(value = "") {
  return String(value)
    .replace(/\\u0026/g, "&")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeUrl(raw = "") {
  let value = decodeEntities(raw).replace(/\\\//g, "/").trim();
  if (value.startsWith("//")) value = `https:${value}`;
  return value;
}

function decodeMediaToken(src = "") {
  const token = src.match(/\/media\/([^/?#.]+)/)?.[1];
  if (!token) return "";
  try {
    return Buffer.from(token, "base64").toString("utf8");
  } catch {
    return "";
  }
}

async function loadInput(value) {
  if (/^https?:\/\//i.test(value)) {
    const response = await fetch(value, {
      headers: {
        "user-agent": "Mozilla/5.0 product-media-source-audit"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${value}`);
    return response.text();
  }
  return readFile(value, "utf8");
}

const html = await loadInput(input);
const normalizedHtml = decodeEntities(html).replace(/\\\//g, "/");

const matches = [
  ...normalizedHtml.matchAll(/(?:https?:)?\/\/cdn-general\.cybassets\.com\/media\/[^\s"'<>\\)]+/g)
].map((match) => normalizeUrl(match[0]));

const byDecoded = new Map();
for (const src of matches) {
  const decoded = decodeMediaToken(src);
  if (!decoded.includes("/products/")) continue;
  if (!byDecoded.has(decoded)) byDecoded.set(decoded, src);
}

const rows = [...byDecoded.entries()].map(([decoded, src], index) => ({
  index: index + 1,
  decoded,
  src
}));

console.log(JSON.stringify(rows, null, 2));
