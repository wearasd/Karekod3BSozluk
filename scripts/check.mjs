import { readFile, access } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = ["index.html", "styles.css", "data.js", "app.js", "manifest.webmanifest", "sw.js", "assets/icon.svg", "vendor/model-viewer.min.js"];
for (const file of files) await access(join(root, "dist", file));
const dataSource = await readFile(join(root, "dist", "data.js"), "utf8");
const slugs = [...dataSource.matchAll(/slug: "([^"]+)"/g)].map(match => match[1]);
if (slugs.length !== 8 || new Set(slugs).size !== slugs.length) throw new Error("Sözlük verisi geçersiz.");
for (const slug of slugs) await access(join(root, "dist", "assets", "qr", `${slug}.svg`));
for (const slug of slugs) await access(join(root, "dist", "assets", "models", `${slug}.glb`));
JSON.parse(await readFile(join(root, "dist", "manifest.webmanifest"), "utf8"));
console.log(`TeknoSöz kontrolü başarılı: ${files.length} temel dosya, ${slugs.length} sözlük maddesi.`);
