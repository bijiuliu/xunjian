import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const layout = read("src/app/layout.tsx");
const manifestText = read("public/manifest.webmanifest");
const manifest = JSON.parse(manifestText);

assert.doesNotMatch(`${layout}\n${manifestText}`, /time-calculator|时间计算器/i, "cross-project icon reference found");
assert.match(layout, /manifest: `\$\{basePath\}\/manifest\.webmanifest`/);
for (const path of ["favicon.ico", "apple-touch-icon.png", "icons/xunjian-pwa-192.png", "icons/xunjian-pwa-512.png"]) {
  assert.ok(layout.includes(`${basePathToken(path)}`), `${path} is not explicitly declared in root metadata`);
}

function basePathToken(path) {
  return `\${basePath}/${path}`;
}

for (const oldConventionPath of ["src/app/favicon.ico", "src/app/icon.png", "src/app/apple-icon.png"]) {
  assert.ok(!existsSync(resolve(root, oldConventionPath)), `${oldConventionPath} would create route-dependent metadata`);
}

const dimensions = (path) => {
  const bytes = readFileSync(resolve(root, path));
  assert.equal(bytes.toString("ascii", 1, 4), "PNG", `${path} is not PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
};

const pngContract = new Map([
  ["public/apple-touch-icon.png", [180, 180]],
  ["public/icons/xunjian-pwa-192.png", [192, 192]],
  ["public/icons/xunjian-pwa-512.png", [512, 512]],
  ["public/icons/xunjian-pwa-1024.png", [1024, 1024]],
]);

assert.ok(existsSync(resolve(root, "public/favicon.ico")), "public/favicon.ico is missing");
for (const [path, expected] of pngContract) assert.deepEqual(dimensions(path), expected, `${path} has wrong dimensions`);

assert.equal(manifest.id, "./");
assert.equal(manifest.start_url, "./");
assert.equal(manifest.scope, "./");
assert.deepEqual(manifest.icons.map(({ src, sizes }) => [src.split("?")[0], sizes]), [
  ["./icons/xunjian-pwa-192.png", "192x192"],
  ["./icons/xunjian-pwa-512.png", "512x512"],
  ["./icons/xunjian-pwa-1024.png", "1024x1024"],
]);

console.log("xunjian icon contract: OK");
