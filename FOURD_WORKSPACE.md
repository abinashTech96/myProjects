# 4D workspace lifecycle and performance

The progressive-rendering and in-session view-recovery extension is documented in
[PROGRESSIVE_4D.md](PROGRESSIVE_4D.md). A valid core can be visible while furniture,
garden and trim are still preparing; await the start promise for a complete scene.

## Starting and leaving

1. Choose 4D. The lightweight shell displays Render 4D and a device-quality choice. No new 3D prerequisite scene, 4D WebGL renderer, render loop, HDR environment or building compilation starts on this action.
2. Click Render 4D. Rendering libraries load, the architectural source is prepared, then owned presentation geometry/materials are compiled. The loading card names the actual preparation stages and offers Cancel. It does not invent a completion percentage.
3. Use the compact toolbar. Single click selects; the small inspector provides Focus element and Finishes. Double click also focuses on desktop. Full view restores all rooms/floors, clears temporary labels/dimensions/selection, and fits the building without recompiling its geometry.
4. Pause retains the displayed frame but stops interactive rendering, stage playback, walking and photo accumulation. Resume requests a fresh frame. Stop cancels outstanding work and releases 4D-owned geometry, textures, render targets and the renderer/context. Entering again requires Render 4D.

Moving to another mode stops and releases 4D. The editor's source scene is a bounded reusable cache; its hidden framebuffer shrinks to 1×1. The next editor mode restores its viewport size and tools. While 4D is running, the source canvas carries camera input and coordinates but its renderer does not draw a second hidden view. Hidden tabs stop the animation loop and cancel photo/stage work; unfinished startup is cancelled. A graphics-context restoration can recover an already requested rendering session. Failed startup/rendering reveals the retry card rather than trapping the user on an empty canvas.

The controller and lightweight API definitions remain available to navigation and existing tools. Nine runtime implementation modules load only after Render 4D; the service worker excludes them and rendering libraries from initial precaching. Failed runtime loads can be retried without executing successful modules twice. Libraries requested by an online rendering session are subsequently available in its ordinary application cache; an uncached first rendering session needs network access.

## Device quality

| Profile | Maximum render pixels | Device ratio cap | Shadow map | Room-light limit |
| --- | ---: | ---: | ---: | ---: |
| Eco | 650,000 | 1 | Off | 1 |
| Balanced | 1,100,000 | 1.25 | 1024 | 4 |
| High | 1,800,000 | 1.5 | 2048 | 8 |

Eco disables ambient occlusion and local reflection probes. Navigation lowers pixel density and suspends AO; settled views restore the bounded detail setting. Measured render durations can further reduce the navigation resolution. Point lights are active only for interior/room/ceiling inspection; exterior overviews use the environment and directional rig. Depth-of-field targets are created only when requested for a photo. Mirrors and local probes retain their existing bounded sizes/counts.

The idle scene has no continuous frame loop. Input, an actual model/lighting change, playback or explicit still refinement can request frames. The status bar reports render duration and triangle count; duration is not monitor FPS. Views → Rendering diagnostics reports first-view latency, scene builds, observed long tasks, draw calls, owned geometry and renderer textures. Performance depends on the project, quality, device and graphics driver.

## Updates and annotations

Camera/focus, selection, annotation, sunlight and environment changes reuse prepared geometry. Saved finish changes and finish previews replace materials only on affected owners, including their ceilings and paired window panes. Material ownership is isolated from editable 3D resources. An imported template becoming ready invalidates its source representation, so a cached proxy cannot remain permanently after GLB loading.

Undo/redo preserves the active workspace instead of restoring a historical mode and restarting graphics. The 4D inspector blocks drafting shortcuts such as Delete, duplicate, rotate and arrow-key nudging; normal form input, saving and undo/redo remain available. Narrow-screen plan/model review uses the vertical Split workspace rather than placing a drafting canvas inside 4D. Views retains room lighting, sun/location, camera views, opening animations, exploded floors, measurements and clean-view controls alongside the six-tab Studio.

Local structural updates now compare stable room, wall, opening, floor/roof and professional-object dependency records. Changed source objects and owned presentation buffers are prepared off-scene, yielding between jobs, and published together after checking the current session/project revision. Unaffected meshes and GPU resources remain in place. Rapid input is coalesced; obsolete jobs dispose their staged resources. Room deletion updates ID/index metadata and ceiling ownership. The displayed scene reads its matching project snapshot until the next scene commits, so a partially edited project cannot invalidate the visible scene's old room indices.

Floor count, level datums/heights and shared wall settings now participate in local dependency updates. Coordinate and builder changes such as plot, scale/unit, facade and site retain a full-source fallback, prepared in cancellable batches before owned presentation staging. Source-only legacy roof data is regenerated on return to the editor. The bounded cache retains the current source, current presented snapshot and in-flight patch; replaced GPU resources are disposed rather than accumulating historical scene versions. Some source-builder geometry operations and driver shader compilation remain synchronous and cannot be interrupted mid-call; worker-delivered calculations are described below. This release does not promise that all large-project main-thread stalls have been eliminated.

Labels default to Off. Selected shows a short name for the selected room; All shows up to 16 prioritized, visible room labels. Bounded ray checks respect geometry visibility and clipping. Labels avoid the toolbar, inspector, dialogs, orientation controls, edges and previously placed labels; a crowded-label summary replaces labels that cannot fit. Full configurations stay in the inspector. Dimensions have their own explicit toggle in Views; legacy editor measurement captions are hidden otherwise. Text labels are HTML overlays and are not part of the PNG canvas.

PNG capture excludes selection, clearance and measurement overlays by default. Photo provides an explicit Include inspection overlays in PNG option for canvas-based overlays. Capture restores interactive state, and leaving/stopping during capture invalidates the pending result.

## Presentation navigation and realism

The toolbar's **Present** button opens one compact presentation panel. **Views** also links these tools.

- **Plot**, **Building**, **Floor** and **Focus element** use the same camera controller. Breadcrumbs show the current context; **Back** restores a previous camera/filter state (up to 24 entries). Single click still selects without moving the camera.
- Normal and Gentle transitions interpolate camera position/target and cutaway planes. A direct camera route crossing a wall uses raised travel where possible. Off/reduced motion switches immediately. Manual input, a newer target, model commit, Pause, Stop, tab hiding and mode exit cancel obsolete motion. Navigation never waits for a geometry rebuild.
- **Reveal focused interiors** temporarily fades intersecting wall surfaces. It restores original material opacity, transparency, depth writing and shadow flags; the project geometry remains intact.
- **Daylight preview** uses saved latitude, longitude, date and UTC offset. Scrub the local hour or Play/Pause. Reset discards the preview; Apply hour creates a normal undoable project edit. Playback is throttled to 10 solar samples/second and stops when inactive.
- **Finish close-up** uses the selected element's real floor/wall/ceiling surface and temporary neutral lighting. Back restores the earlier view. Editing the finish opens the established material workflow; no second material store is introduced.
- **Guided tour** saves up to 24 named stops in model inches. Reorder/remove/visit stops or use Play/Resume, Pause, Stop and 0.5–3× speed. Project validation bounds coordinates, names and counts and handles removed targets. Stops survive JSON import/export and undo/redo. Travel uses the shared interruptible controller; this does not replace the existing collision-aware manual walk mode.
- Existing lighting presets are exposed as Daylight / Warm interior / Soft overcast moods. Architectural polygon/extrusion UVs use normalized projections, PBR timber includes plank joints/grain and roughness variation, and the shadow camera uses bounded bias/softness. Imported mesh UVs and saved material colours are preserved.
- Navigation uses lower-cost preview rendering; shadows/reflections and optionally refined raster stills settle through the existing quality/Photo settings. Refinement is optional and cancellable, not continuous GPU work while idle.

## Architectural audit of the supplied test building

The raised surface above the roof belongs to saved parapet geometry. The cyan glazed surface and coloured site objects are intentional material/demo objects in the all-features test layout. They are preserved along with the original plot and room footprints.

A real opening-animation error was found: door/window code replaced original local positions and rotations with offsets relative to zero. Window halves now preserve the original transformed centre and combined dimensions; sliding and hinged doors apply offsets relative to their source pose without rotating an unrelated parent. Closed openings keep their entered location. Exterior room lighting is suppressed to reduce both shader cost and excessive illumination.

The existing occupied-footprint slabs, roof profiles, shafts, openings and datum logic remain covered by model tests. The geometry audit excludes malformed render buffers without editing the project. A finite-geometry audit cannot certify every architectural junction or guarantee photographic realism for arbitrary imported content.

## Verification

- `npm test` includes synchronous/asynchronous scene ownership, cancellation/disposal, floor/roof geometry and portable model/API tests.
- `npm run check` validates syntax, entry points, offline assets and vendored renderer integrity.
- `FOURD_LIFECYCLE_ONLY=1 npm run test:browser` tests cold-entry gating, cancellation, selection/focus reuse, incremental finishes, transformed window placement, pause/resume, Eco, failure/retry, graphics-context recovery, mobile, stop/reentry and unchanged architectural coordinates.
- `FOURD_PRESENTATION_ONLY=1 npm run test:browser` checks local updates, shared-wall/opening edits, professional objects/voids, deletion, rapid changes, history, stale-work cancellation, stable resource counts, roof/global-floor updates, camera navigation/Back, tour persistence, daylight, close-ups, reduced motion and mobile controls.
- `FOURD_ONLY=1 npm run test:browser` tests the existing HDR/PBR/reflection/photo/comparison/staging workflows through the explicit gate.
- `npm run test:browser` checks existing workspace, form, theme, panel, garden and editor workflows alongside 4D. CI runs lifecycle and full 4D checks in fresh pages for Chromium, Firefox and WebKit.

For the supplied three-storey building, compare all exterior orientations, each inspected floor, focused rooms and materials. Check diagnostics while alternating Full view and Focus: the scene-build count must stay unchanged. Stop must remove the 4D renderer and leave the Render 4D card. Repeat entry/exit and confirm the original plot and all 23 original room coordinates/dimensions remain unchanged.

## Architectural review release (4D-057–070)

Open **4D → Render 4D → Review**. This is one dock with Tools, Lights, Align,
Views, Changes, Inspect and Device tabs. The mobile dock is a bottom sheet; usable-area framing updates on resize and respects the selected presentation lens. Tools follows the active element, floor,
plot or building view. Existing Present, Studio and inspector controls remain.

- **Architectural detail:** presentation-only skirting omits floor-level door spans;
  thin opening architraves and window sills follow actual position, direction,
  sill and wall thickness. Pitched roofs gain a two-inch underside and edge faces.
  Procedural furniture gets bounded bevels while retaining its exact bounding box;
  imported authored geometry is preserved. Trim is bounded to 300/900/1600 strips in the three profiles; omitted detail is reported. Plant crown variation is deterministic,
  with fewer leaf instances in Eco and additional detail in High. These refinements
  do not repair arbitrary imported geometry or certify all roof/wall junctions.
- **Solid sections:** CPU workers intersect visible solid meshes with the settled
  cutting planes, assemble closed contours and triangulate nested holes. Caps have
  their own owned buffers and restore/dispose on changes. Open or non-manifold
  contours are reported rather than filled speculatively. One preparation is
  bounded to 350,000 input vertices across intersecting planes; over-budget meshes
  are counted in Device diagnostics. Caps wait until camera motion settles.
- **Lights:** add ceiling, spot or wall fixtures with room-relative position,
  height in inches, beam direction/spread, intensity and 2000–6500 K temperature.
  Expand a fixture to edit it. Save/import and undo/redo preserve settings. The
  nearest 1/4/8 eligible fixtures are active in Eco/Balanced/High. Extra shadow maps
  are disabled. Explicit fixtures replace automatic room fill when active.
- **Worker preparation:** workers start only after Render 4D. Wall/dependency
  descriptions, footprint unions, slab triangulation/extrusion,
  furniture bevels and section contour triangulation run off the UI thread.
  Geometry snapshots omit embedded GLB/image/HDR payloads. Typed buffers cross the boundary; workers own no DOM,
  renderer or scene. Revision checks reject stale results. Pause/Stop/exit terminate
  pending worker jobs. If workers are unavailable, the verified synchronous kernel
  is used. Individual source-builder operations, GLTF object construction and driver shader linking can still
  pause the main thread; global edits retain the full-rebuild fallback.
- **Texture budgets:** owned image textures start at up to 256 px, refine in
  two-texture batches after navigation and are capped at 512/1024/2048 px in the
  three profiles. Scene-owned image residency has conservative 32/64/128 MiB
  budgets; lower quality downsizes existing residents. Disposal removes pending
  work. These estimates cover these owned image textures, not total process/GPU
  memory, render targets, project-embedded data or editor-owned originals. Existing
  template caching remains capped at eight imported templates.
- **Linked plan review:** Tools → Linked plan review enters Split with shared
  selection, a visible model outline and Locate in plan/model controls. Clicking
  the model selects the same source ID as the plan. This uses the Split modelling
  surface; returning to the isolated 4D portal still requires Render 4D.
- **Revision review:** Changes compares the current design with a saved workbench
  alternative by stable element/opening ID and surface assignment. Added, moved,
  resized, removed and other changed objects have coloured extents; dashed extents
  show the prior state. Highlights are capped at 200 changes, with 100 review rows per page. Expand a row for exact saved/current values. No model
  geometry is edited. A new project edit clears obsolete comparison overlays.
- **Material continuity:** Ctrl/⌘ select target rooms, choose the reference room,
  then Align → Floor/Ceiling. A common plan-space origin, physical repeat and
  rotation align texture joints through adjoining surfaces. Assignments are
  undoable and saved in JSON. Locked targets are rejected. This does not unwrap
  differently oriented wall surfaces or change construction tile quantities.
- **Section bookmarks:** Views saves up to 24 camera poses, clipping planes,
  section-box bounds, floor context and annotations in portable model inches.
  Visit restores that context. Bookmarks and light fixtures are validated on import.
- **Render queue:** Views → Render saved views captures bookmarks sequentially into
  one PNG ZIP, avoiding concurrent renderers. Progress and Cancel remain available;
  navigation, project edits, hiding the tab, Pause, Stop and exit cancel work. The
  completed queue restores the previous view. Output is bounded to 128 MiB before
  ZIP packaging. PNG export itself remains available through Photo.
- **Visual inspection:** Inspect checks finite positions, missing texture images,
  missing UVs, exact coincident meshes and nearby disconnected wall endpoints.
  Findings have source-selection/focus actions and temporary highlight boxes.
  Possible gaps/layering require human review; this is not exhaustive mesh repair.
- **Ambient occlusion:** higher-precision depth, tighter focused-view bounds, independent deterministic tangent vectors, physical thresholds and bounded contrast address the depth-quantization bands found on plain walls during visual review.
- **Device:** shows startup, p95 sampled render cost, latest edit time, resource
  counts, estimated owned texture residency, worker jobs and cap diagnostics.
  Save device baseline records the current browser/viewport/quality combination.
  It is not an FPS meter or a universal device performance guarantee.

`npm test` adds kernel tests for section holes, non-manifold inputs, roof shells,
exact furniture bounds, revision changes and portable fixture/bookmark/origin data.
`FOURD_REVIEW_ONLY=1 npm run test:browser` covers the new workflows, real PNG/ZIP
output, repeated edit/resource stability, worker lifecycle and narrow layouts.
The full browser suite includes this test for every configured engine. CI publishes
`/tmp/archcad-performance-<engine>.json` as a separate artifact on successful or
failed runs. The fixed four-element/two-floor review fixture flags software-browser
startup over 30 s, individual structural edits over 8 s, sampled p95 render cost over
2.5 s and Eco-owned image textures above 32 MiB. These are broad CI failure limits;
real-device baselines in Device must guide interactive performance tuning.


### Parapet studio and realism themes

Open **Views → Parapet studio** in 4D, or **Floors → Parapet studio** in the
editor. The original Roof / parapet selector is retained. Search 26 choices,
select an edge on the numbered outline, and edit dimensions in inches. Front
means the bottom of the plan, independent of the current orbit camera.

Use Preview, then Apply or Cancel. Apply is undoable; presets and unit rates are
saved with project JSON. Scuppers and terrace gates validate against the selected
edge and each other. Custom openings work best on individual numbered segments.
Quantities export as CSV and dimensioned concept elevations as SVG. The privacy
section offers estimated screening and a street camera; **Full view** returns.

Choose **Limestone** or **Courtyard** under Appearance for the two new workspace
palettes and associated lighting. The lighting moods are also independently
available as **Golden hour** and **Courtyard daylight** under 4D presentation;
the environment selector offers both. Materials and plan dimensions are preserved.

Run `npm test`, `npm run check`, and `npm run test:parapet` to validate this
workflow. The focused browser suite is also included in the normal regression
suite. A local browser can be selected with `BROWSER_EXECUTABLE`.

See [AUDIT_FIXES.md](AUDIT_FIXES.md) for the reliability changes, ownership rules and regression commands.

See [PERFORMANCE_ARCHITECTURE.md](PERFORMANCE_ARCHITECTURE.md) for device profiling, staged preparation, roof controls, expanded PBR profiles and visual regression checks.
