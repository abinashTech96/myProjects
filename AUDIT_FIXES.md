# Reliability audit fixes

This release fixes the reproduced defects without resizing plot or room geometry.

| Defect | Result | Regression coverage |
| --- | --- | --- |
| Folded-metal parapets crash on short segments | Omit a folded detail when its usable width is zero; retain the wall/coping | All 26 designs on 12, 13 and 14-inch segments; finite buffers |
| Roof dimensions disagree across outputs | Shared RoofModel clips pitch planes to the occupied footprint and uses actual storey datums | 3D/4D/elevation width comparison; islands, courtyards, empty upper floors; independent IFC validation |
| Removed instances retain GPU buffers | Track instance ownership during staging/reconciliation and dispose removed instances in both renderers | Incremental parapet replacement and exact-once instance disposal with shared geometry |
| Corrupt fallback blocks valid recovery | Parse and validate stores independently, then select the newest valid candidate | Malformed JSON and schema, unavailable IndexedDB, browser recovery |
| Rotated GLB placement shifts off its footprint | Position imported assets using the same rotated bounds as native furniture | Rendered bounds at 0°, 90°, 180° and 270° |
| Brick/terracotta finishes show concrete | Distinct masonry bond and ceramic tile generators | Pixel output differs; finish edits preserve geometry |
| Realism preset is lost on reload | Store rendering style in portable 4D settings; restore it independently from the device UI theme | Save/reload plus existing theme and history checks |
| Floors parapet shortcut is unreachable | Add a visible shortcut to the active compact Floors panel | Browser checks the actual accessible button |
| Tool presentation depends on click origin | Central dialog policy and named lifecycle hooks; explicit modal overrides | Toolbar/tool entry consistency; modal override; existing mobile/tool suites |
| Collaboration merge loses parapet configuration | Three-way merge architectural parapet fields and reject conflicting edits | Remote room rename plus local parapet edit; competing parapet edits |
| Malformed URL crashes optional Node service | Parse URL inside the request error boundary and return HTTP 400 | Malformed target followed by a successful health request |

## Loading and ownership

- The original seven implementation modules (geometry, scene compilation, landscapes, textures,
  comparison scenes, render services and details) load after **Render 4D**. The
  controller, navigation APIs and project validators remain available at startup.
  Failed module loads can retry without re-executing completed modules.
- The service worker excludes the deferred runtime and postprocessing libraries
  from initial precaching. Successfully used modules are cached on demand. The
  first uncached rendering session needs a connection; a previously used engine
  can be reused from the application cache.
- CPU workers receive geometry metadata without embedded GLB, underlay-image or
  HDR payloads. Immutable strings are retained by reference in project snapshot
  clones; mutable containers remain independent. JSON export and recovery retain
  complete embedded assets.
- A named dialog-hook registry replaces six stacked dialog wrappers. Unit adapters,
  widget decoration, footer dismissal, docking, compact layout and 4D inspection
  still participate in one shared lifecycle. Presentation options reach that owner.

The shared roof was introduced as a closed four-inch shell; the next release makes thickness configurable. Flat roofs sit above their structural
cap and retain shaft penetrations; pitched roofs extend downward from their pitch
surface. Overhang follows the occupied building, including disconnected islands,
rather than the plot rectangle. These are architectural visualization/export
surfaces; the release does not introduce structural roof engineering rules.

Global structural changes still use the existing full-rebuild fallback. Source
builders, shared roof triangulation, GLB parsing and shader compilation can still
occupy the main thread. This release does not promise a fixed frame rate or replace
the raster renderer with path tracing.

## Verify locally

```sh
npm ci
npm test
npm run check
npm run test:benchmark
npx playwright install chromium
RELIABILITY_ONLY=1 npm run test:browser
npm run test:browser
```

Optional independent IFC validation:

```sh
python -m pip install ifcopenshell==0.9.0.post1
python tests/ifc-roundtrip.py
```

For a manual check, open a project with a room smaller than its plot. Compare the
roof in 3D, 4D and an exported elevation. Opening 4D should show the start card and
leave the heavy runtime, worker and GPU asleep until **Render 4D**. Apply a parapet
finish/height, return with **Full view**, then Stop. Check Floors → Parapet studio,
rotate an imported furnishing, and save/reload a realism style. Test recovery using
a disposable browser profile rather than editing your only saved project.

The follow-up performance and architectural changes are documented in [PERFORMANCE_ARCHITECTURE.md](PERFORMANCE_ARCHITECTURE.md).
