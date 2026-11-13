import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const excludedPaths = /^\/(?:legacy-content|search|account|cart|zh-TW)(?:\/|$)|^\/(?:404|500)(?:\.html|\/|$)/i;

function attribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1];
}

// Astro calls this after rendering pages. Inspect the actual HTML so redirects,
// noindex pages and aliases cannot accidentally enter the generated sitemap.
export function isSitemapPage(page, outputDirectory) {
  const url = new URL(page);
  if (excludedPaths.test(url.pathname) || /\.[a-z0-9]+$/i.test(url.pathname)) return false;

  const file = path.join(
    fileURLToPath(outputDirectory),
    decodeURIComponent(url.pathname).replace(/^\/+/, ''),
    'index.html'
  );
  const html = readFileSync(file, 'utf8');
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? '';

  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    if (attribute(tag, 'http-equiv')?.toLowerCase() === 'refresh') return false;
    if (/^(?:robots|googlebot)$/i.test(attribute(tag, 'name') ?? '') &&
        /\b(?:noindex|none)\b/i.test(attribute(tag, 'content') ?? '')) return false;
  }

  const canonical = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => tag)
    .find((tag) => attribute(tag, 'rel')?.toLowerCase() === 'canonical');
  const href = canonical && attribute(canonical, 'href');
  return Boolean(href && new URL(href, url).href === url.href);
}
