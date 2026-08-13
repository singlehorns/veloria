import fs from "node:fs";
import path from "node:path";

const productDir = path.join(process.cwd(), "src", "content", "products");
const collectionDir = path.join(process.cwd(), "src", "content", "collections");
const pageDir = path.join(process.cwd(), "src", "content", "pages");
const formalCollectionDir = path.join(process.cwd(), "data", "formal-content", "collections");

const accentedLetterPattern = /[À-ÖØ-öø-ÿŒœ]/;
const chinesePattern = /[\u4e00-\u9fff]/;
const ignoredWords = /^(of|in|de)$/i;

function accentWord(word) {
  if (accentedLetterPattern.test(word)) return word;

  const replacements = [
    ["e", "é"],
    ["E", "É"],
    ["a", "à"],
    ["A", "À"],
    ["i", "î"],
    ["I", "Î"],
    ["o", "ô"],
    ["O", "Ô"],
    ["u", "û"],
    ["U", "Û"],
  ];

  for (const [from, to] of replacements) {
    const index = word.indexOf(from);
    if (index !== -1) {
      return `${word.slice(0, index)}${to}${word.slice(index + 1)}`;
    }
  }

  return word;
}

function accentName(name) {
  if (!name || accentedLetterPattern.test(name) || chinesePattern.test(name)) {
    return name;
  }

  const parts = name.split(/(\s+)/);
  const targetIndex = parts.findIndex((part) => /^[A-Za-z][A-Za-z-]*$/.test(part) && !ignoredWords.test(part));

  if (targetIndex === -1) return name;

  parts[targetIndex] = accentWord(parts[targetIndex]);
  return parts.join("");
}

function replaceAllProductNames(value, nameMap) {
  if (typeof value === "string") {
    let next = value;
    for (const [plainName, styledName] of nameMap) {
      next = next.split(plainName).join(styledName);
    }
    return next;
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceAllProductNames(item, nameMap));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceAllProductNames(item, nameMap)]),
    );
  }

  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getJsonFiles(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dir, file));
}

const productFiles = getJsonFiles(productDir);
const nameMap = new Map();

for (const filePath of productFiles) {
  const product = readJson(filePath);
  if (!product.englishName) continue;

  const styledName = accentName(product.englishName);
  if (styledName !== product.englishName) {
    nameMap.set(product.englishName, styledName);
  }
}

const targetFiles = [
  ...productFiles,
  ...getJsonFiles(collectionDir),
  ...getJsonFiles(pageDir),
  ...getJsonFiles(formalCollectionDir),
];

for (const filePath of targetFiles) {
  const originalText = fs.readFileSync(filePath, "utf8");
  const originalJson = JSON.parse(originalText);
  const styledJson = replaceAllProductNames(originalJson, nameMap);
  const styledText = `${JSON.stringify(styledJson, null, 2)}\n`;

  if (styledText !== originalText) {
    fs.writeFileSync(filePath, styledText);
  }
}

console.log(`Styled ${nameMap.size} product English names.`);
for (const [plainName, styledName] of nameMap) {
  console.log(`${plainName} -> ${styledName}`);
}
