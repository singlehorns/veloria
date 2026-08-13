import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const legacyRoot = path.join(root, 'data', 'legacy-content');
const outRoot = path.join(root, 'data', 'formal-content');

const footerNoise = new Set([
  '您好！',
  '目前的購物車是空的！',
  '聯絡資訊',
  '關於我們',
  '其他資訊',
  '搜尋',
  '經典男戒 轉運男戒',
  '項鍊 耳環 手鍊',
  '黃鑽 粉鑽 藍鑽 紅鑽 綠鑽 其他彩鑽',
  '請選擇${modalOption.name}',
  '你的瀏覽器不支援 HTML 5 video',
  '目前搶購人潮眾多，請耐心等候',
  '若離開此頁面，可能會延長等待時間。',
  '交易安全說明',
  '會員登入 註冊新會員',
  '我的帳戶 訂單查詢 專屬優惠券 收藏清單 會員登出',
  '立即購買 前往收藏清單'
]);

const pageMappings = [
  { key: 'home', input: ['pages', 'PAGE-0024-home.json'], newUrl: '/', kind: 'home' },
  { key: 'zh-tw', input: ['pages', 'PAGE-0047-home.json'], newUrl: '/zh-TW/', kind: 'home' },
  { key: 'contact', input: ['pages', 'PAGE-0023-contact.json'], newUrl: '/contact/', kind: 'contact' },
  { key: 'privacy', input: ['pages', 'PAGE-0026-pages-privacy.json'], newUrl: '/pages/privacy/', kind: 'legal' },
  { key: 'qna', input: ['pages', 'PAGE-0027-pages-qna.json'], newUrl: '/pages/qna/', kind: 'faq' },
  { key: 'terms', input: ['pages', 'PAGE-0028-pages-terms.json'], newUrl: '/pages/terms/', kind: 'legal' },
  { key: 'custom-service', input: ['pages', 'PAGE-0029-pages-尊榮定製.json'], newUrl: '/pages/custom-service/', kind: 'content' },
  { key: 'diamond-symphony-guide', input: ['knowledge', 'PAGE-0003-blogs-diamond-symphony-guide.json'], newUrl: '/blogs/diamond-symphony-guide/', kind: 'content' }
];

const collectionSlugAliases = new Map([
  ['求婚', 'proposal'],
  ['彩色鑽石專區', 'color-diamond']
]);

function readJson(parts) {
  return JSON.parse(fs.readFileSync(path.join(legacyRoot, ...parts), 'utf8'));
}

function readSourceHtml(page) {
  const source = page.sourceFiles?.find((file) => file.endsWith('.html'));
  if (!source || !fs.existsSync(source)) return '';
  return fs.readFileSync(source, 'utf8');
}

function absoluteUrl(src = '') {
  if (src.startsWith('//')) return `https:${src}`;
  return src;
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function extractHtmlSectionMedia(page) {
  const html = readSourceHtml(page);
  const images = uniqueBy(
    [...html.matchAll(/"dict_(?:tablet_|mobile_)?image_url":"([^"]+)"/g)]
      .map((match) => absoluteUrl(match[1]))
      .filter((src) => src && src !== 'null' && !src.startsWith('/theme_src'))
      .map((src) => ({ src, alt: pageTitle(page), sourceType: 'section-settings' })),
    (image) => image.src
  );
  const videos = uniqueBy(
    [...html.matchAll(/"video_editor_section_dict_video_link":"([^"]+)"/g)]
      .map((match) => match[1])
      .filter((src) => src && src !== 'null')
      .map((src) => ({ src, sourceType: 'section-settings' })),
    (video) => video.src
  );
  return { images, videos };
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

function cleanText(value = '') {
  return value.replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();
}

function usefulBlock(block) {
  const text = cleanText(block.text);
  if (!text) return false;
  if (footerNoise.has(text)) return false;
  if (text.startsWith('主選單 ')) return false;
  if (text.startsWith('首頁 ')) return false;
  if (text.startsWith('客服專線：')) return false;
  if (text.startsWith('查詢 關於我們')) return false;
  if (text.startsWith('首頁 求婚戒指 結婚對戒')) return false;
  if (text.includes('會員登入') && text.includes('會員登出')) return false;
  if (text.includes('${') || text.includes('modalOption')) return false;
  if (/^00000/.test(text)) return false;
  if (/^NT\$/.test(text)) return false;
  return true;
}

function usefulImage(image) {
  const src = image.src || image.imageSource || '';
  if (!src) return false;
  if (src.startsWith('block.settings')) return false;
  if (src.includes('.large') || src.includes('thumbnail.url')) return false;
  if (src.includes('no-image-large')) return false;
  if (src.includes('game_assets')) return false;
  if (src.includes('DS%20LOGO') || src.includes('X0RTIExPR09')) return false;
  return true;
}

function normalizeLinks(links = [], legacyUrl) {
  const seen = new Set();
  return links
    .filter((link) => link.href && link.text && !link.href.includes('/account') && !link.href.includes('/cart'))
    .filter((link) => {
      const key = `${link.href}|${link.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .filter((link) => link.href !== legacyUrl || link.text !== '')
    .map((link) => ({
      label: cleanText(link.text),
      href: link.href,
      type: link.type || (link.href.startsWith('http') ? 'external' : 'internal')
    }));
}

function pageTitle(page) {
  return cleanText(page.title || '').replace(/\s*鑽之韻.*$/, '') || cleanText(page.title || '');
}

function buildFaq(page) {
  const questions = page.headings?.h3 || [];
  const answers = page.contentBlocks.filter((block) => block.blockType === 'Paragraph' && usefulBlock(block)).map((block) => cleanText(block.text));
  const items = questions.map((question, index) => ({
    question,
    answer: answers[index] || '',
    sourceFile: page.sourceFiles?.[0] || ''
  }));
  return [
    {
      order: 1,
      type: 'faq',
      heading: page.headings?.h2?.[0] || pageTitle(page),
      body: '',
      items,
      images: [],
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    }
  ];
}

function buildLegal(page) {
  const paragraphs = page.contentBlocks.filter((block) => block.blockType === 'Paragraph' && usefulBlock(block)).map((block) => cleanText(block.text));
  const lists = page.contentBlocks.filter((block) => block.blockType === 'List' && usefulBlock(block)).map((block) => cleanText(block.text));
  const headings = page.headings?.h2 || [];
  if (page.pageId === 'PAGE-0026') {
    const byOrder = Object.fromEntries(page.contentBlocks.map((block) => [block.blockOrder, cleanText(block.text)]));
    return [
      { heading: page.headings?.h1?.[0] || pageTitle(page), body: byOrder[3], type: 'paragraph' },
      { heading: headings[0], body: `${byOrder[4]}\n${byOrder[26]}`, type: 'list' },
      { heading: headings[1], body: `${byOrder[5]}\n${byOrder[27]}`, type: 'list' },
      { heading: headings[2], body: byOrder[6], type: 'paragraph' },
      { heading: headings[3], body: byOrder[7], type: 'paragraph' },
      { heading: headings[4], body: byOrder[8], type: 'paragraph' },
      { heading: headings[5], body: `${byOrder[9]}\n${byOrder[28]}\n${byOrder[10]}`, type: 'list' },
      { heading: headings[6], body: `${byOrder[11]}\n${byOrder[12]}`, type: 'paragraph' }
    ].filter((block) => block.body).map((block, index) => ({
      order: index + 1,
      ...block,
      images: [],
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    }));
  }
  if (page.pageId === 'PAGE-0028') {
    const byOrder = Object.fromEntries(page.contentBlocks.map((block) => [block.blockOrder, cleanText(block.text)]));
    return [
      { heading: page.headings?.h1?.[0] || pageTitle(page), body: byOrder[3], type: 'paragraph' },
      { heading: headings[0], body: byOrder[20], type: 'list' },
      { heading: headings[1], body: byOrder[21], type: 'list' },
      { heading: headings[2], body: byOrder[22], type: 'list' },
      { heading: headings[3], body: byOrder[23], type: 'list' },
      { heading: headings[4], body: byOrder[4], type: 'paragraph' },
      { heading: headings[5], body: byOrder[24], type: 'list' },
      { heading: headings[6], body: `${byOrder[5]}\n${byOrder[6]}`, type: 'paragraph' }
    ].filter((block) => block.body).map((block, index) => ({
      order: index + 1,
      ...block,
      images: [],
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    }));
  }
  const blocks = [];
  if (paragraphs[0]) {
    blocks.push({
      order: blocks.length + 1,
      type: 'paragraph',
      heading: page.headings?.h1?.[0] || pageTitle(page),
      body: paragraphs[0],
      images: [],
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    });
  }
  headings.forEach((heading, index) => {
    const bodyParts = [];
    const list = lists[index + 1] || lists[index] || '';
    const paragraph = paragraphs[index + 1] || '';
    if (list && !list.startsWith('首頁 ')) bodyParts.push(list);
    if (paragraph) bodyParts.push(paragraph);
    blocks.push({
      order: blocks.length + 1,
      type: list ? 'list' : 'paragraph',
      heading,
      body: bodyParts.join('\n'),
      images: [],
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    });
  });
  return blocks.filter((block) => block.body || block.heading);
}

function buildSimple(page, kind) {
  if (kind === 'contact') {
    const contactBlock = page.contentBlocks.find((block) => cleanText(block.text).startsWith('客服專線：'));
    const body = cleanText(contactBlock?.text || '').replace(/ 客服時間：/g, '\n客服時間：').replace(/ 信箱：/g, '\n信箱：').replace(/ 地址：/g, '\n地址：').replace(/ 統一編號：/g, '\n統一編號：');
    return body
      ? [{
          order: 1,
          type: 'list',
          heading: '聯絡資訊',
          body,
          images: [],
          video: null,
          links: [],
          sourceFile: page.sourceFiles?.[0] || ''
        }]
      : [];
  }
  const textBlocks = page.contentBlocks.filter((block) => usefulBlock(block));
  const contentBlocks = textBlocks.map((block, index) => ({
    order: index + 1,
    type: block.blockType === 'List' ? 'list' : 'paragraph',
    heading: '',
    body: cleanText(block.text),
    images: [],
    video: null,
    links: [],
    sourceFile: page.sourceFiles?.[0] || ''
  }));
  const images = (page.images || []).filter(usefulImage).map((image) => ({
    src: image.src,
    alt: image.alt || image.title || pageTitle(page),
    sourceType: image.sourceType || 'image'
  }));
  if (images.length && (kind === 'home' || kind === 'content')) {
    contentBlocks.splice(1, 0, {
      order: 2,
      type: 'media',
      heading: '',
      body: '',
      images,
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    });
  }
  return contentBlocks.map((block, index) => ({ ...block, order: index + 1 }));
}

function buildFormalPage(mapping) {
  const page = readJson(mapping.input);
  let contentBlocks;
  if (mapping.kind === 'faq') contentBlocks = buildFaq(page);
  else if (mapping.kind === 'legal') contentBlocks = buildLegal(page);
  else contentBlocks = buildSimple(page, mapping.kind);

  const sectionMedia = page.pageId === 'PAGE-0029' ? extractHtmlSectionMedia(page) : { images: [], videos: [] };
  const images = uniqueBy((page.images || []).filter(usefulImage).map((image) => ({
    src: image.src,
    alt: image.alt || image.title || pageTitle(page),
    sourceType: image.sourceType || 'image'
  })).concat(sectionMedia.images), (image) => image.src);

  if (!contentBlocks.length && images.length) {
    contentBlocks = [{
      order: 1,
      type: 'media',
      heading: pageTitle(page),
      body: '',
      images,
      video: null,
      links: [],
      sourceFile: page.sourceFiles?.[0] || ''
    }];
  }

  return {
    legacyUrl: page.legacyUrl,
    newUrl: mapping.newUrl,
    title: pageTitle(page),
    metaTitle: pageTitle(page),
    metaDescription: page.metaDescription || pageTitle(page),
    kind: mapping.kind,
    headings: page.headings,
    contentBlocks,
    images,
    links: normalizeLinks(page.links, page.legacyUrl),
    videos: uniqueBy(sectionMedia.videos, (video) => video.src),
    sourceFiles: page.sourceFiles || [],
    migrationStatus: 'formal-content-ready',
    migrationNotes: ['Generated from legacy backup. Do not render notes on the formal site.']
  };
}

function collectionKeyFromFile(file) {
  const match = file.match(/^PAGE-\d+-collections-(.+)\.json$/);
  if (!match) return null;
  const legacySlug = match[1];
  return collectionSlugAliases.get(legacySlug) || legacySlug;
}

function buildCollections() {
  const dir = path.join(legacyRoot, 'collections');
  const files = fs.readdirSync(dir).filter((file) => /^PAGE-\d+-collections-/.test(file));
  const outputs = [];
  for (const file of files) {
    const key = collectionKeyFromFile(file);
    if (!key) continue;
    const page = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const contentBlocks = buildSimple(page, 'collection');
    const sectionMedia = { images: [], videos: [] };
    const images = uniqueBy((page.images || []).filter(usefulImage).map((image) => ({
      src: image.src,
      alt: image.alt || image.title || pageTitle(page),
      sourceType: image.sourceType || 'image'
    })).concat(sectionMedia.images), (image) => image.src);
    if (!contentBlocks.length && images.length) {
      contentBlocks.push({
        order: 1,
        type: 'media',
        heading: pageTitle(page),
        body: '',
        images,
        video: null,
        links: [],
        sourceFile: page.sourceFiles?.[0] || ''
      });
    }
    outputs.push({
      key,
      data: {
        legacyUrl: page.legacyUrl,
        newUrl: `/collections/${key}/`,
        legacySlug: file.replace(/^PAGE-\d+-collections-/, '').replace(/\.json$/, ''),
        title: pageTitle(page),
        metaTitle: pageTitle(page),
        metaDescription: page.metaDescription || pageTitle(page),
        kind: 'collection',
        headings: page.headings,
        contentBlocks,
        images,
        links: normalizeLinks(page.links, page.legacyUrl),
        videos: [],
        sourceFiles: page.sourceFiles || [],
        migrationStatus: 'formal-content-ready',
        migrationNotes: ['Generated from legacy backup. Do not render notes on the formal site.']
      }
    });
  }
  return outputs;
}

for (const mapping of pageMappings) {
  writeJson(path.join(outRoot, 'pages', `${mapping.key}.json`), buildFormalPage(mapping));
}

for (const { key, data } of buildCollections()) {
  writeJson(path.join(outRoot, 'collections', `${key}.json`), data);
}

const summary = {
  generatedAt: new Date().toISOString(),
  pages: pageMappings.length,
  collections: buildCollections().length,
  outputRoot: outRoot
};
writeJson(path.join(outRoot, 'FORMAL_CONTENT_GENERATION_SUMMARY.json'), summary);
console.log(JSON.stringify(summary, null, 2));
