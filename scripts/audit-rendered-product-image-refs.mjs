import { readFile } from "node:fs/promises";
import path from "node:path";

const checks = [
  ["blush-kiss", "DSP-0006"],
  ["blossom-reverie", "DSP-0085"],
  ["azure-bloom-halo", "DSP-0102"],
  ["rose-whisper", "DSP-0069"]
];

const results = [];

for (const [slug, idPrefix] of checks) {
  const html = await readFile(path.join(process.cwd(), "dist", "products", slug, "index.html"), "utf8");
  const matches = [...html.matchAll(/\/assets\/migrated\/products\/([^/]+)\/localized\/([^"']+)/g)];
  const uniqueRefs = [...new Set(matches.map((match) => `${match[1]}/${match[2]}`))];
  const wrongRefs = uniqueRefs.filter((ref) => !ref.startsWith(`${idPrefix}-`));
  results.push({ slug, refs: uniqueRefs.length, wrongRefs });
}

console.log(JSON.stringify(results, null, 2));

if (results.some((result) => result.wrongRefs.length)) {
  process.exit(1);
}
