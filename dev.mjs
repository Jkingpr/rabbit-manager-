import { resolve, dirname } from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const candidates = [
  resolve(__dirname, "node_modules/@cloudflare/workerd-linux-64/bin/workerd"),
  resolve(process.cwd(), "node_modules/@cloudflare/workerd-linux-64/bin/workerd"),
];

for (const p of candidates) {
  if (existsSync(p)) {
    process.env.MINIFLARE_WORKERD_PATH = p;
    break;
  }
}

await import("vite/bin/vite.js");
