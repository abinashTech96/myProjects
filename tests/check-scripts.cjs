const fs = require("node:fs"),
  cp = require("node:child_process"),
  path = require("node:path");
let failed = false;
for (const dir of ["js", "ProNavBar", "api", "server"])
  for (const file of fs.readdirSync(dir).filter((f) => /\.c?js$/.test(f))) {
    const name = path.join(dir, file),
      result = cp.spawnSync(
        process.execPath,
        [
          dir === "api" ? "--input-type=module" : "--input-type=commonjs",
          "--check",
        ],
        { input: fs.readFileSync(name), encoding: "utf8" },
      );
    if (result.status) {
      failed = true;
      console.error(name, result.stderr);
    }
  }
const html = ["index.html", "review.html"]
  .map((name) => fs.readFileSync(name, "utf8"))
  .join("\n");
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^https?:/.test(match[1]) && !fs.existsSync(match[1])) {
    failed = true;
    console.error("Missing local asset:", match[1]);
  }
}
if (failed) process.exitCode = 1;
else
  console.log("All JavaScript syntax and local entry-point references passed.");

const manifest = JSON.parse(fs.readFileSync("offline-assets.json", "utf8"));
for (const name of manifest) {
  if (name !== "./" && !fs.existsSync(name)) {
    failed = true;
    console.error("Missing offline asset:", name);
  }
}
const worker = cp.spawnSync(process.execPath, ["--check", "sw.js"], {
  encoding: "utf8",
});
if (worker.status) {
  failed = true;
  console.error(worker.stderr);
}
for (const [name, original] of Object.entries({
  "three.min.js": "build/three.min.js",
  "OrbitControls.js": "examples/js/controls/OrbitControls.js",
  "PointerLockControls.js": "examples/js/controls/PointerLockControls.js",
  "BufferGeometryUtils.js": "examples/js/utils/BufferGeometryUtils.js",
  "GLTFExporter.js": "examples/js/exporters/GLTFExporter.js",
})) {
  const source = fs.readFileSync(
    path.join(path.dirname(require.resolve("three/package.json")), original),
  );
  if (!source.equals(fs.readFileSync(path.join("vendor/three", name)))) {
    failed = true;
    console.error("Vendor bundle mismatch:", name);
  }
}
if (failed) process.exitCode = 1;
else
  console.log(
    "Offline manifest, service worker and bundled renderer integrity passed.",
  );

for (const [bundled, source] of Object.entries({
  "vendor/geometry/polygon-clipping.js":
    "node_modules/polygon-clipping/dist/polygon-clipping.umd.js",
  "vendor/geometry/clipper.js": "node_modules/clipper-lib/clipper.js",
  "vendor/fflate/fflate.js": "node_modules/fflate/umd/index.js",
})) {
  if (!fs.readFileSync(bundled).equals(fs.readFileSync(source))) {
    console.error("Geometry/archive vendor mismatch:", bundled);
    process.exitCode = 1;
  }
}
