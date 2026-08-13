import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const sourceDir = path.join(root, 'output', 'live-knowledge-source', 'articles');
const contentDir = path.join(root, 'src', 'content', 'knowledge');
const publicCoverDir = path.join(root, 'public', 'assets', 'knowledge', 'covers');
const manifestPath = path.join(root, 'output', 'knowledge-cover-image-manifest.json');

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited ${code}: ${stderr}`));
    });
  });
}

function normalizeUrl(value = '') {
  let url = value.trim().replace(/&amp;/g, '&').replace(/\\"/g, '"');
  if (url.startsWith('//')) url = `https:${url}`;
  if (url.startsWith('https://cdn-general.cybassets.com//')) {
    url = url.replace('https://cdn-general.cybassets.com//', 'https://');
  }
  return url;
}

function extensionFor(url = '') {
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.jpg')) return '.jpg';
  if (clean.endsWith('.jpeg')) return '.jpeg';
  if (clean.endsWith('.webp')) return '.webp';
  return '.png';
}

function firstMatch(source, patterns) {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) return normalizeUrl(match[1]);
  }
  return '';
}

function extractCoverUrl(html) {
  return firstMatch(html, [
    /"image"\s*:\s*"([^"]+)"/,
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    /<div[^>]+class="[^"]*article_cover[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i,
    /<div[^>]+class="[^"]*article_img[^"]*"[\s\S]*?<img[^>]+src="([^"]+)"/i
  ]);
}

function updateCoverImage(markdown, localPath) {
  return markdown.replace(/^coverImage:\s*".*"$/m, `coverImage: "${localPath}"`);
}

await fs.mkdir(publicCoverDir, { recursive: true });
await fs.mkdir(path.dirname(manifestPath), { recursive: true });

const htmlFiles = (await fs.readdir(sourceDir)).filter((file) => file.endsWith('.html')).sort();
const manifest = [];

for (const htmlFile of htmlFiles) {
  const slug = htmlFile.replace(/\.html$/, '');
  const html = await fs.readFile(path.join(sourceDir, htmlFile), 'utf8');
  const remoteUrl = extractCoverUrl(html);

  if (!remoteUrl) {
    manifest.push({ slug, status: 'missing-source-url' });
    continue;
  }

  const fileName = `${slug}${extensionFor(remoteUrl)}`;
  const outputFile = path.join(publicCoverDir, fileName);
  const localPath = `/assets/knowledge/covers/${fileName}`;

  await run('curl.exe', ['-L', '--fail', '--silent', '--show-error', remoteUrl, '-o', outputFile]);

  const markdownFile = path.join(contentDir, `${slug}.md`);
  const markdown = await fs.readFile(markdownFile, 'utf8');
  await fs.writeFile(markdownFile, updateCoverImage(markdown, localPath));

  manifest.push({ slug, remoteUrl, localPath, status: 'localized' });
}

await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const localizedCount = manifest.filter((item) => item.status === 'localized').length;
const missingCount = manifest.length - localizedCount;
console.log(`Localized ${localizedCount} knowledge cover images.`);
if (missingCount > 0) console.log(`Missing source URLs: ${missingCount}`);
