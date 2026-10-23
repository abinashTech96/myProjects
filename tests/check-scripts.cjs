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
  "GLTFLoader.js": "examples/js/loaders/GLTFLoader.js",
  "TransformControls.js": "examples/js/controls/TransformControls.js",
  "CopyShader.js": "examples/js/shaders/CopyShader.js",
  "SSAOShader.js": "examples/js/shaders/SSAOShader.js",
  "GammaCorrectionShader.js": "examples/js/shaders/GammaCorrectionShader.js",
  "FXAAShader.js": "examples/js/shaders/FXAAShader.js",
  "Pass.js": "examples/js/postprocessing/Pass.js",
  "ShaderPass.js": "examples/js/postprocessing/ShaderPass.js",
  "EffectComposer.js": "examples/js/postprocessing/EffectComposer.js",
  "SSAOPass.js": "examples/js/postprocessing/SSAOPass.js",
  "RGBELoader.js": "examples/js/loaders/RGBELoader.js",
  "Reflector.js": "examples/js/objects/Reflector.js",
  "BokehShader.js": "examples/js/shaders/BokehShader.js",
  "BokehPass.js": "examples/js/postprocessing/BokehPass.js",
  "SimplexNoise.js": "examples/js/math/SimplexNoise.js",

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
  "vendor/pdfjs/pdf.min.mjs": "node_modules/pdfjs-dist/build/pdf.min.mjs",
  "vendor/pdfjs/pdf.worker.min.mjs":
    "node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
  "vendor/ocr/tesseract.min.js":
    "node_modules/tesseract.js/dist/tesseract.min.js",
  "vendor/ocr/worker.min.js": "node_modules/tesseract.js/dist/worker.min.js",
  "vendor/ocr/tesseract-core-lstm.wasm.js":
    "node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js",
})) {
  if (!fs.readFileSync(bundled).equals(fs.readFileSync(source))) {
    console.error("Geometry/archive vendor mismatch:", bundled);
    process.exitCode = 1;
  }
}

const crypto = require("node:crypto");
const ocrHash = crypto
  .createHash("sha256")
  .update(fs.readFileSync("vendor/ocr/eng.traineddata.gz"))
  .digest("hex");
if (
  ocrHash !== "45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91"
) {
  console.error("English OCR data checksum mismatch");
  process.exitCode = 1;
}
