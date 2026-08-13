import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const [slug] = process.argv.slice(2);
if (!slug) {
  console.error("Usage: node scripts/make-product-contact-sheet.mjs <slug>");
  process.exit(1);
}

const product = JSON.parse(await readFile(path.join("src", "content", "products", `${slug}.json`), "utf8"));
const files = (product.images || []).map((image) => path.join("public", image.src.replace(/^\//, "")));
const thumbs = await Promise.all(
  files.map(async (file, index) => {
    const label = Buffer.from(
      `<svg width="220" height="34"><text x="10" y="24" font-size="22" fill="#111">${index + 1}</text></svg>`
    );
    return sharp(file)
      .resize(220, 220, { fit: "contain", background: "#fff" })
      .extend({ top: 34, bottom: 6, left: 6, right: 6, background: "#fff" })
      .composite([{ input: label, top: 0, left: 0 }])
      .png()
      .toBuffer();
  })
);

const target = path.resolve("output", `${slug}-contact.png`);
await sharp({
  create: {
    width: thumbs.length * 232,
    height: 260,
    channels: 3,
    background: "#fff"
  }
})
  .composite(thumbs.map((input, index) => ({ input, left: index * 232, top: 0 })))
  .png()
  .toFile(target);

console.log(target);
