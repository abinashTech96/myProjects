# Progressive 4D and view recovery

This release implements the six accepted performance and architectural-review
follow-ups without changing saved plot, room or opening dimensions.

## Device profiling

Open **4D → Render 4D → Review → Device → Profile this design** on your largest
project. The report now includes room/furniture/fitout/import counts, triangles,
first visible building and completed-scene times, furniture/garden/detail timings,
motion samples, substitutions and full-frame draw calls. Composer passes previously
reset draw-call counters individually; counters now cover the complete pipeline.
Reduced motion may produce no moving samples. Results describe observed browser
work, not a monitor FPS guarantee.

Run the same project, quality and viewport again to compare its slowest settled
render with the previous matching report. **Export device profile** saves JSON.
Reports include adaptive/detail settings and remain in the current browser. No
telemetry is sent. Profiling waits until scene preparation and structural updates
finish, and preserves the existing input/edit/Pause/Stop cancellation behavior.
The automated software-browser runs do not measure the user's computer.

## Building first

A cold Render prepares rooms, walls, openings, slabs, roof and structural objects
first. It displays that valid scene and enables camera navigation before native
furniture, imported placements and professional fitouts are prepared. Furniture
is appended with separately owned buffers; the core meshes are retained.
The garden and bounded trim then prepare in yielding batches, followed by shader
preparation for the added surfaces. A small status strip names the current stage
and offers **Cancel loading**. It does not cover the model. Pause enables after
preparation completes; Stop/exit/tab hiding and project changes cancel obsolete
startup work. PNG capture waits for the complete scene.
Still refinement also waits; publishing furnishings advances the scene version
and clears cached refined frames, so an unfinished view cannot survive as a still.

Each staged group is checked against the active session before publication.
Cancelled resources are disposed, and reentry cannot mistake an incomplete source
for a finished cache. An unchanged, already complete source can be reused directly.
Texture resolution continues to refine under the existing residency budget after
the geometry is complete. Individual geometry, import-loader and driver calls
still cannot be interrupted midway; eight milliseconds remains a yield target.

## Navigation detail

**Review → Device → Simplify furniture while moving** is a device-local switch.
With adaptive rendering enabled, complex furniture uses bounds-matched proxies
during camera movement. Dense scenes also substitute multi-mesh simple furniture.
The focused furniture retains its actual geometry. Proxy picks resolve to the
original stable element ID. Full detail returns after movement settles; original
geometry, dimensions and saved finishes remain intact.

Foliage instance counts are temporarily lowered and trim/section caps are hidden
while moving. Settled rendering and PNG capture restore their normal detail.
Existing distance-based detail and Eco/Balanced/High controls remain available.

## Renderer recovery

Context loss or a renderer failure captures the camera/projection, floor/element
context, history, selection, clipping, section box, explosion, annotations,
dimensions and daylight/material preview state. A restored graphics context, or
**Retry Render 4D**, rebuilds only graphics and restores that view. The project and
undo history are never replaced, so unsaved edits remain. Stop intentionally
discards recovery state. This is in-session recovery; project autosave remains
the separate protection against closing the browser.

## Architectural close-ups

**Review → Inspect** adds categories for openings, walls, roofs, stairs and
surfaces. New observations identify near-corner jamb/reveal clearance, opening
heads above the wall, connected walls with different elevations, parametric
stairs outside their saved footprint, stair arrivals differing from the next
datum, and short configured landings. Existing roof/parapet and shaft checks stay.

Selecting a locatable finding frames its actual plan position and elevation.
The close-up respects usable viewport space and survives resize/history/recovery.
Checks are geometric observations, not structural, accessibility or code
certification. They do not move or repair the design automatically.

## Regression references

Four additional fixed scenes cover an irregular plot, a real courtyard hole,
three storeys with custom datums, and sixty mixed furniture placements plus a
professional fitout. Reviewed PNG/signature references are in `tests/baselines/`.
They complement the existing exterior/floor/element and incremental/full checks.

`PROGRESSIVE_ONLY=1 npm run test:browser` checks visible core ordering, custom
fitouts, reduced actual movement draw calls, selectable proxies, restoration,
context recovery with unsaved edits/history, profile JSON, categorized close-ups,
cancellation/reentry and the four references. `npm test`, `npm run check`,
`npm run test:benchmark` and the complete browser suite remain required. Existing
interaction tests now wait for full preparation when they require furniture or
ancillary geometry; the new test explicitly checks the earlier visible core.

Deliberate reference updates use:

```sh
PROGRESSIVE_ONLY=1 UPDATE_VISUAL_BASELINES=1 npm run test:browser
```

Inspect the resulting PNGs before accepting them. Chromium, Firefox and WebKit
run the same assertions in CI. Existing plot/scale/global edits retain their
safe full-source fallback; this release does not make every operation incremental.
