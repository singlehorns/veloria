import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const slugs = [
  "luminous-duet",
  "stellar-studs",
  "golden-bloom",
  "akatsuki-dance",
  "aurora-hoops",
  "arc-diamond-sequence",
  "celestial-halo-radiance"
];

const cellWidth = 220;
const cellHeight = 274;
const labelHeight = 42;
const rowGap = 28;
const nameWidth = 260;
const width = nameWidth + cellWidth * 3;
const height = slugs.length * cellHeight + (slugs.length - 1) * rowGap;

function svgText(width, height, text, size = 20) {
  const escaped = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/><text x="12" y="${Math.round(height / 2 + size / 3)}" font-family="Arial, sans-serif" font-size="${size}" fill="#111">${escaped}</text></svg>`
  );
}

const composites = [];
for (let row = 0; row < slugs.length; row += 1) {
  const slug = slugs[row];
  const product = JSON.parse(await readFile(path.join("src", "content", "products", `${slug}.json`), "utf8"));
  const top = row * (cellHeight + rowGap);
  composites.push({
    input: svgText(nameWidth, cellHeight, `${product.legacyProductId} ${product.englishName || slug}`, 17),
    left: 0,
    top
  });

  for (let index = 0; index < 3; index += 1) {
    const image = product.images[index];
    const file = path.join("public", image.src.replace(/^\//, ""));
    const label = svgText(cellWidth, labelHeight, `${index + 1}`, 18);
    const thumb = await sharp(file)
      .resize(cellWidth, cellWidth, { fit: "contain", background: "#fff" })
      .extend({ top: labelHeight, bottom: cellHeight - labelHeight - cellWidth, left: 0, right: 0, background: "#fff" })
      .composite([{ input: label, top: 0, left: 0 }])
      .png()
      .toBuffer();
    composites.push({
      input: thumb,
      left: nameWidth + index * cellWidth,
      top
    });
  }
}

const target = path.resolve("output", "earring-referenced-contact-sheet-after.png");
await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: "#fff"
  }
})
  .composite(composites)
  .png()
  .toFile(target);

await writeFile(path.resolve("output", "earring-referenced-contact-sheet-after.txt"), target, "utf8");
console.log(target);
