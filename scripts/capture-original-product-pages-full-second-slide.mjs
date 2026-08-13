import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sourceManifestPath = path.join(rootDir, 'screenshots', 'original-product-pages', 'manifest-with-urls.json');
const defaultOutputDir = path.join(rootDir, 'screenshots', 'original-product-pages-full-second-slide');
const bundledNodeModules = 'C:\\Users\\U01\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules';

const args = parseArgs(process.argv.slice(2));
const outputDir = path.resolve(rootDir, args.out || defaultOutputDir);
const viewport = {
  width: Number(args.width || process.env.SCREENSHOT_WIDTH || 1920),
  height: Number(args.height || process.env.SCREENSHOT_HEIGHT || 1080),
};

function parseArgs(rawArgs) {
  const parsed = {
    limit: undefined,
    offset: 0,
    out: undefined,
    resume: false,
    width: undefined,
    height: undefined,
  };

  for (const arg of rawArgs) {
    if (arg === '--resume') parsed.resume = true;
    if (arg.startsWith('--limit=')) parsed.limit = Number(arg.slice('--limit='.length));
    if (arg.startsWith('--offset=')) parsed.offset = Number(arg.slice('--offset='.length));
    if (arg.startsWith('--out=')) parsed.out = arg.slice('--out='.length);
    if (arg.startsWith('--width=')) parsed.width = Number(arg.slice('--width='.length));
    if (arg.startsWith('--height=')) parsed.height = Number(arg.slice('--height='.length));
  }

  return parsed;
}

function loadPlaywright() {
  const localRequire = createRequire(import.meta.url);

  try {
    return localRequire('playwright');
  } catch {
    const runtimeRequire = createRequire(path.join(bundledNodeModules, 'runtime-entry.js'));
    return runtimeRequire('playwright');
  }
}

function safeFilePart(value, fallback) {
  const text = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  return text || fallback;
}

function sourceOrder(item, fallbackIndex) {
  const fromFile = String(item.screenshotFile || '').match(/^(\d+)-/);
  if (fromFile) return Number(fromFile[1]);
  return fallbackIndex + 1;
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function preparePage(page) {
  await page.keyboard.press('Escape').catch(() => {});

  await page.addStyleTag({
    content: `
      .fb_dialog,
      iframe[src*="facebook"],
      iframe[src*="messenger"],
      iframe[src*="line"],
      iframe[src*="chat"],
      .grecaptcha-badge {
        visibility: hidden !important;
      }
    `,
  }).catch(() => {});

  await page.evaluate(() => {
    const closeTexts = ['關閉', '知道了', '我知道了', '同意', '接受', 'OK', 'Close'];
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));

    for (const button of buttons) {
      const text = (button.textContent || '').trim();
      const label = button.getAttribute('aria-label') || '';
      const className = button.getAttribute('class') || '';
      const looksClosable = closeTexts.some((entry) => text.includes(entry) || label.includes(entry));
      const isIconClose = /\b(close|dismiss|modal-close|popup-close)\b/i.test(className);
      const rect = button.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0;

      if (isVisible && (looksClosable || isIconClose)) {
        button.click();
      }
    }
  }).catch(() => {});
}

async function scrollToLoadLazyContent(page) {
  await page.evaluate(async () => {
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(500, Math.floor(window.innerHeight * 0.75));
    const maxY = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );

    for (let y = 0; y <= maxY; y += step) {
      window.scrollTo(0, y);
      await sleep(120);
    }

    window.scrollTo(0, 0);
  });

  await wait(350);
}

async function selectSecondCarouselImage(page) {
  const result = await page.evaluate(() => {
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        Number(style.opacity || 1) > 0.05 &&
        rect.width >= 20 &&
        rect.height >= 20
      );
    };

    const getIdentity = (element) => {
      const rect = element.getBoundingClientRect();
      return [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
      ].join(':');
    };

    const descriptor = (element) => {
      const chunks = [];
      let current = element;
      let depth = 0;
      while (current && current instanceof HTMLElement && depth < 4) {
        chunks.push(current.tagName);
        chunks.push(current.id || '');
        chunks.push(current.className || '');
        chunks.push(current.getAttribute('aria-label') || '');
        current = current.parentElement;
        depth += 1;
      }
      return chunks.join(' ');
    };

    const isControlArrow = (element) => {
      const text = descriptor(element).toLowerCase();
      return /\b(prev|next|arrow|slick-prev|slick-next|swiper-button|caret|angle)\b/.test(text);
    };

    const isThumbnailLike = (element) => {
      const text = descriptor(element).toLowerCase();
      return /thumb|thumbnail|pager|pagination|gallery|photo|swiper-slide|slick-slide|product/.test(text);
    };

    const resolveClickable = (element) => {
      return (
        element.closest('button, a, [role="button"], li, .swiper-slide, .slick-slide') ||
        element
      );
    };

    const rawCandidates = Array.from(
      document.querySelectorAll(
        [
          '[class*="thumb"] img',
          '[class*="thumbnail"] img',
          '[class*="gallery"] img',
          '[class*="photo"] img',
          '.swiper-slide img',
          '.slick-slide img',
          '.swiper-pagination-bullet',
          '.slick-dots li',
          'button',
          'a',
          '[role="button"]',
        ].join(',')
      )
    );

    const unique = [];
    const seen = new Set();

    for (const candidate of rawCandidates) {
      if (!visible(candidate)) continue;

      const clickable = resolveClickable(candidate);
      if (!visible(clickable)) continue;
      if (isControlArrow(clickable)) continue;
      if (!isThumbnailLike(candidate) && !isThumbnailLike(clickable)) continue;

      const rect = clickable.getBoundingClientRect();
      const area = rect.width * rect.height;
      const compactEnough = rect.width <= 240 && rect.height <= 240 && area <= 45000;
      const paginationDot = /pagination|dot|bullet/.test(descriptor(clickable).toLowerCase());

      if (!compactEnough && !paginationDot) continue;

      const identity = getIdentity(clickable);
      if (seen.has(identity)) continue;
      seen.add(identity);

      unique.push({
        element: clickable,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
        text: descriptor(clickable).slice(0, 160),
      });
    }

    unique.sort((a, b) => {
      const topDelta = a.top - b.top;
      if (Math.abs(topDelta) > 12) return topDelta;
      return a.left - b.left;
    });

    const target = unique[1] || unique[0];
    if (target?.element) {
      target.element.scrollIntoView({ block: 'center', inline: 'center' });
      target.element.click();
      return {
        ok: true,
        method: unique[1] ? 'thumbnail-index-2' : 'thumbnail-index-1-fallback',
        candidateCount: unique.length,
        clicked: {
          left: Math.round(target.left),
          top: Math.round(target.top),
          width: Math.round(target.width),
          height: Math.round(target.height),
          text: target.text,
        },
      };
    }

    return {
      ok: false,
      method: 'no-thumbnail-candidate',
      candidateCount: unique.length,
      clicked: null,
    };
  });

  if (result.ok) {
    await wait(700);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    return result;
  }

  const fallback = await page.evaluate(() => {
    const bullets = Array.from(document.querySelectorAll('.swiper-pagination-bullet, .slick-dots li button, .slick-dots li'));
    const visibleBullets = bullets.filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden';
    });

    if (visibleBullets[1]) {
      visibleBullets[1].click();
      return { ok: true, method: 'pagination-index-2', candidateCount: visibleBullets.length };
    }

    return { ok: false, method: 'no-pagination-candidate', candidateCount: visibleBullets.length };
  }).catch(() => ({ ok: false, method: 'pagination-error', candidateCount: 0 }));

  if (fallback.ok) {
    await wait(700);
    await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
    return fallback;
  }

  await page.keyboard.press('ArrowRight').catch(() => {});
  await wait(700);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  return {
    ok: true,
    method: 'keyboard-arrow-right-fallback',
    candidateCount: result.candidateCount,
    clicked: null,
  };
}

async function captureProduct(page, item, position) {
  const baseName = [
    String(position).padStart(3, '0'),
    safeFilePart(item.legacyProductId, `product-${position}`),
    safeFilePart(item.legacyCyberbizId, 'source'),
  ].join('-');
  const screenshotFile = `${baseName}.png`;
  const screenshotPath = path.join(outputDir, screenshotFile);

  if (args.resume) {
    try {
      await fs.access(screenshotPath);
      return {
        status: 'skipped',
        screenshotFile,
        screenshotPath,
        selectedSecondSlide: null,
        selectedSecondSlideMethod: 'resume-existing-file',
      };
    } catch {
      // Continue and capture when the target does not exist.
    }
  }

  await page.goto(item.originalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForLoadState('networkidle', { timeout: 18000 }).catch(() => {});
  await preparePage(page);
  await scrollToLoadLazyContent(page);
  const selection = await selectSecondCarouselImage(page);
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await wait(400);

  const pageSize = await page.evaluate(() => ({
    width: Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    title: document.title,
  }));

  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: 'disabled',
  });

  return {
    status: 'ok',
    screenshotFile,
    screenshotPath,
    selectedSecondSlide: Boolean(selection.ok),
    selectedSecondSlideMethod: selection.method,
    carouselCandidateCount: selection.candidateCount,
    clickedTarget: selection.clicked || null,
    pageWidth: pageSize.width,
    pageHeight: pageSize.height,
    pageTitle: pageSize.title,
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const sourceManifest = JSON.parse(await fs.readFile(sourceManifestPath, 'utf8'));
  const allItems = sourceManifest.items
    .filter((item) => item.originalUrl)
    .map((item, index) => ({
      ...item,
      sourceOrder: sourceOrder(item, index),
      manifestIndex: index + 1,
    }))
    .sort((a, b) => a.sourceOrder - b.sourceOrder);

  const start = Math.max(0, Number(args.offset || 0));
  const end = args.limit ? Math.min(allItems.length, start + Number(args.limit)) : allItems.length;
  const items = allItems.slice(start, end);

  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'zh-TW',
    reducedMotion: 'reduce',
  });
  context.setDefaultTimeout(15000);

  const page = await context.newPage();
  const results = [];

  console.log(`Output: ${outputDir}`);
  console.log(`Capturing ${items.length} / ${allItems.length} product pages at ${viewport.width}x${viewport.height}.`);

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const position = start + i + 1;
    const label = `${String(position).padStart(3, '0')}/${allItems.length} ${item.legacyProductId || ''} ${item.originalUrl}`;

    try {
      console.log(`[${new Date().toISOString()}] ${label}`);
      const result = await captureProduct(page, item, position);
      results.push({
        index: position,
        sourceOrder: item.sourceOrder,
        manifestIndex: item.manifestIndex,
        slug: item.slug,
        legacyProductId: item.legacyProductId,
        legacyCyberbizId: item.legacyCyberbizId,
        name: item.name,
        originalUrl: item.originalUrl,
        ...result,
      });
      console.log(`  -> ${result.status} ${result.screenshotFile} (${result.selectedSecondSlideMethod})`);
    } catch (error) {
      const failure = {
        index: position,
        sourceOrder: item.sourceOrder,
        manifestIndex: item.manifestIndex,
        slug: item.slug,
        legacyProductId: item.legacyProductId,
        legacyCyberbizId: item.legacyCyberbizId,
        name: item.name,
        originalUrl: item.originalUrl,
        status: 'failed',
        error: error?.stack || error?.message || String(error),
      };
      results.push(failure);
      console.error(`  -> failed ${error?.message || error}`);
    }
  }

  await browser.close();

  const ok = results.filter((item) => item.status === 'ok').length;
  const skipped = results.filter((item) => item.status === 'skipped').length;
  const failed = results.filter((item) => item.status === 'failed').length;
  const manifest = {
    generatedAt: new Date().toISOString(),
    source: sourceManifest.source || 'https://www.dsdiamond.com.tw/zh-TW/',
    sourceManifestPath,
    outputDir,
    mode: {
      fullPage: true,
      preferredCarouselSlide: 2,
      viewport,
    },
    totalProductsInSourceManifest: allItems.length,
    requestedCount: items.length,
    ok,
    skipped,
    failed,
    items: results,
  };

  await fs.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Done. ok=${ok}, skipped=${skipped}, failed=${failed}`);
  console.log(`Manifest: ${path.join(outputDir, 'manifest.json')}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
