# Three.js runtime

These files are copied without modification from the npm `three@0.128.0` package, under the included MIT license. Helpers match the core renderer version. Keeping them local makes startup and GLB export independent of CDN availability.

- `build/three.min.js`
- `examples/js/controls/OrbitControls.js`
- `examples/js/controls/PointerLockControls.js`
- `examples/js/utils/BufferGeometryUtils.js`
- `examples/js/exporters/GLTFExporter.js`

Refresh all files together if changing Three.js versions and run both browser suites.

## Geometry and archive runtimes

- `geometry/polygon-clipping.js`: `polygon-clipping@0.15.7`, UMD distribution, MIT. License included.
- `geometry/clipper.js`: `clipper-lib@6.4.2`, original source with author notices, Boost Software License. License included.
- `fflate/fflate.js`: `fflate@0.8.2`, UMD distribution, MIT. License included.

These files are copied unmodified from the pinned npm packages. Browser startup does not fetch them from a CDN.

## Import and editing runtimes

- `three/TransformControls.js` and `three/GLTFLoader.js`: unmodified matching `three@0.128.0` helpers, MIT.
- `pdfjs/pdf.min.mjs` and `pdfjs/pdf.worker.min.mjs`: unmodified browser distribution from `pdfjs-dist@6.4.299`, Apache-2.0; LICENSE included.
- `ocr/tesseract.min.js` and `ocr/worker.min.js`: unmodified `tesseract.js@7.0.0` distribution, Apache-2.0, with bundled third-party notice files.
- `ocr/tesseract-core-lstm.wasm.js`: unmodified embedded-WASM LSTM runtime from `tesseract.js-core@7.0.0`, Apache-2.0 (CORE-LICENSE).
- `ocr/eng.traineddata.gz`: English LSTM data from `@tesseract.js-data/eng@1.0.0`, `4.0.0_best_int/eng.traineddata.gz`, Apache-2.0. The checksum is verified by `npm run check`.

PDF/OCR modules load only when requested. All workers, model data and import assets are same-origin and included in the offline manifest. Refresh vendored files with their pinned npm distributions and retain licenses; never replace just the renderer core or worker independently.

The 4D presentation pipeline lazily loads matching Three.js r128 examples: EffectComposer, Pass, ShaderPass, SSAOPass, CopyShader, SSAOShader, GammaCorrectionShader, FXAAShader and SimplexNoise. These files retain the Three.js MIT license above and are checked byte-for-byte against the pinned npm package by `npm run check`.
