import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const productRoot = path.join(projectRoot, "src", "content", "products");
const distRoot = path.join(projectRoot, "dist", "products");
const productFiles = readdirSync(productRoot).filter((file) => file.endsWith(".json"));
const problems = [];

for (const fileName of productFiles) {
  const product = JSON.parse(readFileSync(path.join(productRoot, fileName), "utf8"));
  const htmlPath = path.join(distRoot, product.slug, "index.html");

  if (!existsSync(htmlPath)) {
    problems.push({ slug: product.slug, reason: "missing-rendered-page" });
    continue;
  }

  const html = readFileSync(htmlPath, "utf8");
  const renderedMedia = [...html.matchAll(/<figure class="product-media-frame[^>]*>[\s\S]*?<img src="([^"]+)"/g)].map(
    (match) => match[1]
  );
  const expectedMainImage = product.images?.[0]?.src || "";

  if (renderedMedia.length !== 1 || renderedMedia[0] !== expectedMainImage) {
    problems.push({
      slug: product.slug,
      expectedMainImage,
      renderedMedia
    });
  }
}

console.log(
  JSON.stringify(
    {
      checked: productFiles.length,
      problemCount: problems.length,
      problems: problems.slice(0, 20)
    },
    null,
    2
  )
);
