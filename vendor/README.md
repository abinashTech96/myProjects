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
