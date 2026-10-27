import QRCode from "qrcode";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = process.env.TEKNO_BASE_URL || "https://teknosoz-3b.example/";
const dataSource = await readFile(join(root, "dist", "data.js"), "utf8");
const slugs = [...dataSource.matchAll(/slug: "([^"]+)"/g)].map(match => match[1]);
const outDir = join(root, "dist", "assets", "qr");
await mkdir(outDir, { recursive: true });
for (const slug of slugs) {
  const url = new URL(baseUrl);
  url.searchParams.set("terim", slug);
  const svg = await QRCode.toString(url.href, { type: "svg", errorCorrectionLevel: "H", margin: 2, color: { dark: "#07131fff", light: "#fffefaff" } });
  await writeFile(join(outDir, `${slug}.svg`), svg, "utf8");
}
console.log(`${slugs.length} QR kod oluşturuldu: ${baseUrl}`);
