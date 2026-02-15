import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SOURCES_PATH = path.join(ROOT, "badwords-sources.json");
const EXTRA_PATH = path.join(ROOT, "badwords-extra.txt");
const OUTPUT_PATH = path.join(ROOT, "badwords.json");

const DEFAULT_SOURCES = [
  "https://raw.githubusercontent.com/web-mech/badwords/master/lib/lang.json",
  "https://raw.githubusercontent.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words/master/en"
];

function loadSources() {
  if (!fs.existsSync(SOURCES_PATH)) return DEFAULT_SOURCES;
  const raw = fs.readFileSync(SOURCES_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) return DEFAULT_SOURCES;
  return parsed.filter(item => typeof item === "string" && item.trim().length > 0);
}

function loadExtraWords() {
  if (!fs.existsSync(EXTRA_PATH)) return [];
  const raw = fs.readFileSync(EXTRA_PATH, "utf8");
  return raw.split(/\r?\n/);
}

function normalizeWords(words) {
  return words
    .map(word => (typeof word === "string" ? word.trim().toLowerCase() : ""))
    .filter(word => word.length > 0)
    .filter(word => !word.startsWith("#") && !word.startsWith("//"));
}

function parsePayload(text, url) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.words)) return data.words;
  }

  return text.split(/\r?\n/);
}

async function fetchWords(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  const text = await res.text();
  return parsePayload(text, url);
}

async function main() {
  const sources = loadSources();
  const allWords = [];

  for (const url of sources) {
    try {
      const words = await fetchWords(url);
      allWords.push(...words);
    } catch (err) {
      console.warn("[badwords] Source failed:", url, err.message);
    }
  }

  allWords.push(...loadExtraWords());

  const normalized = normalizeWords(allWords);
  const unique = Array.from(new Set(normalized)).sort((a, b) => a.localeCompare(b));

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(unique, null, 2) + "\n", "utf8");
  console.log(`[badwords] Wrote ${unique.length} words.`);
}

main().catch(err => {
  console.error("[badwords] Update failed:", err);
  process.exit(1);
});
