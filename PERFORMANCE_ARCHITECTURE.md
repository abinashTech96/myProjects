# Performance and architectural accuracy release

This release implements the six accepted follow-ups on top of the reliability
release. It keeps existing plot/room dimensions and the explicit Render 4D gate.

## 1. Measure the current design on the device

Open **4D → Render 4D → Review → Device → Profile this design**. The opt-in
protocol measures Plot, Building, Floor, Element and Return to building on the
current project. It reports elapsed view settling, sampled render durations,
draw calls and resources, plus recorded source/shader preparation steps. Browsers
that support long-task observation report those separately.

The protocol preserves camera, clipping, selection, history and daylight preview.
Edits, input, hidden tabs, Pause and Stop cancel incomplete measurements. Running
presentation playback must be paused first. Device profiles are stored locally
and keyed to the design/render settings, viewport and quality; **Export device
profile** saves JSON. There is no remote telemetry. Profile advice identifies
measured source/shader pauses or expensive rendering and suggests comparisons.
The developer's software-browser timings are not measurements of your computer.

## 2. Broader incremental updates

Floor count, level datums/heights and shared wall thickness/height now invalidate
their actual room, wall, opening, slab, roof and professional-object dependency
records. Empty-storey changes do not rebuild unaffected room meshes. Removed
floor records are included in invalidation. Ceiling overlays use resolved floor
datums consistently. Existing revision checks, atomic presentation commits and
resource ownership remain in place.

Plot, unit/scale, facade, site and other coordinate/builder changes retain the
safe full-source fallback. Full source preparation is now staged as described
below. This is not a claim that every global operation changes just one mesh.

## 3. Responsive preparation

- A private source group is built with the existing room, wall, fixture, slab,
  parapet and professional builders. Work yields at an eight-millisecond target
  between operations; cancellation leaves the previous valid source in place.
  Live global group/map references are restored after every synchronous step.
- Presentation scene cloning also yields inside nested imported hierarchies; cancelled partial instances are explicitly released.
- Shared roof triangulation and closed shell buffer generation run in the CPU
  worker and transfer their arrays back. The synchronous fallback uses exactly
  the same RoofModel, including courtyards and penetrations.
- Embedded GLB base64 decoding and validation use a shared validator in the
  worker during 4D preparation. GLTF scene construction still uses Three's
  asynchronous loader, with bounded template reuse.
- Shader variants are prepared in yielding batches after Render. Diagnostics
  record the number of variants and the longest measured driver call.
- Nine implementation modules load on demand. Offline installation excludes
  them; used modules are cached normally. Opening the portal starts no worker,
  renderer or shader preparation.

An individual geometry operation, GLTF object construction or graphics-driver
call cannot be interrupted midway. The eight-millisecond value is a yield target,
not a universal upper bound or a frame-rate guarantee. Long calls are measured
rather than hidden behind a cosmetic progress percentage.

## 4. Architectural controls and review

**Roof designer** exposes vertical thickness in the selected project unit, validated from
0.5 to 24 inches internally, with a four-inch default for older files. The same
closed roof is used in 3D, 4D, elevations and IFC; IFC includes ThicknessIn and its vertical direction. Flat-roof parapets start at the configured finished roof elevation.

**Review → Inspect** adds locatable observations for pitched-roof/parapet
intersections, roof-covered shafts/vertical voids, ceiling/roof intersections,
opening heads crossing the roof underside and roof overhang outside the plot.
Roof and Parapet controls are available directly from the inspector. Findings do
not silently move geometry or serve as structural/code certification.

## 5. Calibrated material rendering

Wood, bathroom ceramic, porcelain tile, grass, shingles and paint join the PBR
profiles. Their color maps use sRGB; normal and roughness maps remain linear.
Texture repeat stays tied to physical dimensions. Per-material normal strength
replaces one common exaggerated value. Assigning an opaque finish clears leftover
glass transmission/opacity and physical clearcoat state. Glass uses an IOR of 1.5 and honors the physical-glass toggle; switching to an opaque finish clears its glazing state.
Legacy procedural finishes are deterministic across reloads, as are PBR textures.

## 6. Visual regression checks

The architecture browser suite uses a fixed two-floor design, fixed cameras and
lighting, and reviewed references in `tests/baselines/`. Exterior/daylight,
floor/interior and element/golden-hour views are compared using local image
coverage and luminance metrics that tolerate small edge-antialiasing differences.
An intentionally missing building must fail the comparison. Stable room/floor
identities and bounds provide complementary geometric checks.

Incremental level/count/roof changes are also compared visually against an
independent complete rebuild. Actual captures are written to `/tmp/archcad-visual-*.png`
and included in the CI failure artifacts. To update reviewed references deliberately:

```sh
ARCHITECTURE_ONLY=1 UPDATE_VISUAL_BASELINES=1 npm run test:browser
```

Verify with `npm test`, `npm run check`, `npm run test:benchmark`,
`ARCHITECTURE_ONLY=1 npm run test:browser`, and the complete browser suite.
Independent IFC schema/solid validation remains `python tests/ifc-roundtrip.py`
with ifcopenshell installed. CI runs the complete suite in Chromium, Firefox and
WebKit; image references do not depend on UI fonts or operating-system chrome.
