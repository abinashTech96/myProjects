# 4D workspace lifecycle and performance

## Starting and leaving

1. Choose 4D. The lightweight shell displays Render 4D and a device-quality choice. No new 3D prerequisite scene, 4D WebGL renderer, render loop, HDR environment or building compilation starts on this action.
2. Click Render 4D. Rendering libraries load, the architectural source is prepared, then owned presentation geometry/materials are compiled. The loading card names the actual preparation stages and offers Cancel. It does not invent a completion percentage.
3. Use the compact toolbar. Single click selects; the small inspector provides Focus element and Finishes. Double click also focuses on desktop. Full view restores all rooms/floors, clears temporary labels/dimensions/selection, and fits the building without recompiling its geometry.
4. Pause retains the displayed frame but stops interactive rendering, stage playback, walking and photo accumulation. Resume requests a fresh frame. Stop cancels outstanding work and releases 4D-owned geometry, textures, render targets and the renderer/context. Entering again requires Render 4D.

Moving to another mode stops and releases 4D. The editor's source scene is a bounded reusable cache; its hidden framebuffer shrinks to 1×1. The next editor mode restores its viewport size and tools. While 4D is running, the source canvas carries camera input and coordinates but its renderer does not draw a second hidden view. Hidden tabs stop the animation loop and cancel photo/stage work; unfinished startup is cancelled. A graphics-context restoration can recover an already requested rendering session. Failed startup/rendering reveals the retry card rather than trapping the user on an empty canvas.

The controller and lightweight API definitions remain available to navigation and existing tools. Rendering libraries are not eagerly precached by the service worker. Libraries requested by an online rendering session are subsequently available in its ordinary application cache; an uncached first rendering session needs network access.

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

Architectural geometry edits still use the existing complete editor-source rebuild and an atomic owned 4D scene replacement. Initial presentation compilation yields between bounded batches; cancellation disposes partially prepared resources. Individual source-building operations, polygon operations and driver shader compilation are synchronous and cannot be interrupted mid-call. Fully incremental structural geometry preparation remains a follow-up; this release does not claim all large-project main-thread stalls have been eliminated.

Labels default to Off. Selected shows a short name for the selected room; All shows up to 16 prioritized, visible room labels. Bounded ray checks respect geometry visibility and clipping. Labels avoid the toolbar, inspector, dialogs, orientation controls, edges and previously placed labels; a crowded-label summary replaces labels that cannot fit. Full configurations stay in the inspector. Dimensions have their own explicit toggle in Views; legacy editor measurement captions are hidden otherwise. Text labels are HTML overlays and are not part of the PNG canvas.

PNG capture excludes selection, clearance and measurement overlays by default. Photo provides an explicit Include inspection overlays in PNG option for canvas-based overlays. Capture restores interactive state, and leaving/stopping during capture invalidates the pending result.

## Architectural audit of the supplied test building

The raised surface above the roof belongs to saved parapet geometry. The cyan glazed surface and coloured site objects are intentional material/demo objects in the all-features test layout. They are preserved along with the original plot and room footprints.

A real opening-animation error was found: door/window code replaced original local positions and rotations with offsets relative to zero. Window halves now preserve the original transformed centre and combined dimensions; sliding and hinged doors apply offsets relative to their source pose without rotating an unrelated parent. Closed openings keep their entered location. Exterior room lighting is suppressed to reduce both shader cost and excessive illumination.

The existing occupied-footprint slabs, roof profiles, shafts, openings and datum logic remain covered by model tests. The geometry audit excludes malformed render buffers without editing the project. A finite-geometry audit cannot certify every architectural junction or guarantee photographic realism for arbitrary imported content.

## Verification

- `npm test` includes synchronous/asynchronous scene ownership, cancellation/disposal, floor/roof geometry and portable model/API tests.
- `npm run check` validates syntax, entry points, offline assets and vendored renderer integrity.
- `FOURD_LIFECYCLE_ONLY=1 npm run test:browser` tests cold-entry gating, cancellation, selection/focus reuse, incremental finishes, transformed window placement, pause/resume, Eco, failure/retry, graphics-context recovery, mobile, stop/reentry and unchanged architectural coordinates.
- `FOURD_ONLY=1 npm run test:browser` tests the existing HDR/PBR/reflection/photo/comparison/staging workflows through the explicit gate.
- `npm run test:browser` checks existing workspace, form, theme, panel, garden and editor workflows alongside 4D. CI runs lifecycle and full 4D checks in fresh pages for Chromium, Firefox and WebKit.

For the supplied three-storey building, compare all exterior orientations, each inspected floor, focused rooms and materials. Check diagnostics while alternating Full view and Focus: the scene-build count must stay unchanged. Stop must remove the 4D renderer and leave the Render 4D card. Repeat entry/exit and confirm the original plot and all 23 original room coordinates/dimensions remain unchanged.
