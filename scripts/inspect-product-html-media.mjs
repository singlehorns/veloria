const [url] = process.argv.slice(2);
if (!url) {
  console.error("Usage: node scripts/inspect-product-html-media.mjs <url>");
  process.exit(1);
}

const html = await (
  await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 product-html-media-inspect"
    }
  })
).text();

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

const normalizedHtml = decodeEntities(html).replace(/\\\//g, "/");
const matches = [
  ...normalizedHtml.matchAll(/(?:https?:)?\/\/cdn-general\.cybassets\.com\/media\/[^\s"'<>\\)]+/g)
].map((match) => normalizeUrl(match[0]));

const rows = matches
  .map((src) => ({ src, decoded: decodeMediaToken(src) }))
  .filter((row) => row.decoded.includes("/products/"));

const byDecoded = new Map();
for (const row of rows) {
  if (!byDecoded.has(row.decoded)) byDecoded.set(row.decoded, row.src);
}

console.log(
  JSON.stringify(
    [...byDecoded.entries()].map(([decoded, src]) => ({ decoded, src })),
    null,
    2
  )
);
