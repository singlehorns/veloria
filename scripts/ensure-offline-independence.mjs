import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const mediaRoot = path.join(projectRoot, "public", "assets", "migrated");
const productMediaRoot = path.join(mediaRoot, "products");
const offlineCdnRoot = path.join(mediaRoot, "offline-cdn");
const reportPath = path.join(projectRoot, "data", "migration", "offline-independence-report.json");
const fallbackImage = "/assets/brand/brand-logo-primary.png";
const externalMediaPattern = /https:\/\/cdn-general\.cybassets\.com\/[^"'\s)<>]+/g;

const filesToRewrite = [
  ...(await listFiles(path.join(projectRoot, "src", "content", "products"), [".json"])),
  ...(await listFiles(path.join(projectRoot, "src", "content", "pages"), [".json"])),
  ...(await listFiles(path.join(projectRoot, "src", "components"), [".astro", ".ts", ".js"])),
  ...(await listFiles(path.join(projectRoot, "src", "pages"), [".astro", ".ts", ".js"]))
];

function normalizeSlash(value) {
  return value.replace(/\\/g, "/");
}

function publicPathFromProjectRelative(file) {
  return `/${normalizeSlash(file).replace(/^public\//, "")}`;
}

async function listFiles(root, extensions) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full, extensions)));
    else if (extensions.includes(path.extname(entry.name))) out.push(full);
  }
  return out;
}

async function readKnownDownloadedMedia() {
  const map = new Map();
  if (!existsSync(productMediaRoot)) return map;

  for (const folder of await readdir(productMediaRoot, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    const manifestPath = path.join(productMediaRoot, folder.name, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      for (const item of manifest.downloadedFiles || []) {
        if (!item.file) continue;
        const absolute = path.join(projectRoot, item.file);
        if (!existsSync(absolute)) continue;
        const localPath = publicPathFromProjectRelative(item.file);
        if (item.originalUrl) map.set(item.originalUrl, localPath);
        if (item.usedUrl) map.set(item.usedUrl, localPath);
      }
    } catch {
      // Keep going; a broken manifest should not block other media.
    }
  }

  return map;
}

function extensionFromUrl(url) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".mp4"].includes(ext)) return ext;
  } catch {
    // Fall through.
  }
  return ".bin";
}

async function downloadToLocal(url) {
  await mkdir(offlineCdnRoot, { recursive: true });
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 24);
  const target = path.join(offlineCdnRoot, `${hash}${extensionFromUrl(url)}`);
  const relTarget = normalizeSlash(path.relative(projectRoot, target));

  if (existsSync(target)) {
    const info = await stat(target);
    if (info.size > 0) return publicPathFromProjectRelative(relTarget);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length) throw new Error("empty response");
    await writeFile(target, bytes);
    return publicPathFromProjectRelative(relTarget);
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const knownMedia = await readKnownDownloadedMedia();
  const fileTexts = new Map();
  const urls = new Set();

  for (const file of filesToRewrite) {
    const text = await readFile(file, "utf8");
    fileTexts.set(file, text);
    for (const match of text.matchAll(externalMediaPattern)) urls.add(match[0]);
  }

  const replacements = new Map();
  const downloaded = [];
  const reused = [];
  const failed = [];

  for (const url of urls) {
    if (knownMedia.has(url)) {
      replacements.set(url, knownMedia.get(url));
      reused.push({ url, localPath: knownMedia.get(url) });
      continue;
    }

    try {
      const localPath = await downloadToLocal(url);
      replacements.set(url, localPath);
      downloaded.push({ url, localPath });
    } catch (error) {
      replacements.set(url, fallbackImage);
      failed.push({ url, fallbackPath: fallbackImage, error: error.message });
    }
  }

  const changedFiles = [];
  for (const [file, original] of fileTexts) {
    let next = original;
    for (const [from, to] of replacements) {
      next = next.split(from).join(to);
    }
    if (next !== original) {
      await writeFile(file, next, "utf8");
      changedFiles.push(normalizeSlash(path.relative(projectRoot, file)));
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scannedFiles: filesToRewrite.length,
    externalMediaUrlsFound: urls.size,
    reusedExistingDownloads: reused.length,
    newlyDownloaded: downloaded.length,
    replacedWithFallback: failed.length,
    changedFiles,
    failed
  };
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(report, null, 2));
}

await main();
