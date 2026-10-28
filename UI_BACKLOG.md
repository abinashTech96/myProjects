# UI arrangement backlog

These changes were accepted for the backlog on 22 October 2026. All **23 items are implemented** in the consolidated footer/navigation release.

| ID | Accepted change | Expected behavior |
| --- | --- | --- |
| UI-001 | Transparent workspace-mode container | Remove the enclosing background, border, shadow and outer padding around 2D / Split / 3D / 4D. Keep individual compact buttons with a filled selected state and adequate touch targets. |
| UI-002 | Cross-shaped camera orientation controls | Put Top above, Left–ISO–Right across the middle and Front below. The enclosing container is fully transparent; individual buttons remain readable against the model. |
| UI-003 | Separate directional 2D pan pad | Arrange Up / Down / Left / Right around a central Fit action. Keep the meanings of plan panning and camera orientation distinct. |
| UI-004 | Appearance entry in the footer | Add a footer button that opens an appearance panel attached directly above the footer, while keeping the drawing visible. |
| UI-005 | Consolidated theme and spacing settings | Make the attached Appearance panel the primary home for theme previews and Compact / Comfortable control spacing. |
| UI-006 | More workspace appearance options | Include canvas backgrounds/contrast, grid visibility/intensity and drawing-label visibility/size in Appearance. Model materials remain element properties; lighting and rendering quality remain in rendering controls. |
| UI-007 | Predictable panel dismissal | Close Appearance on outside click or Escape, restore focus to its opener, and preserve the current drawing view and saved preferences. |
| UI-008 | Mobile footer-attached appearance sheet | Keep the panel attached to the footer on narrow screens, bound its height and allow internal scrolling so all settings remain reachable. |
| UI-009 | One Appearance workflow | Remove visible duplicate theme controls from other panels. Legacy callable aliases route to footer Appearance and use the same saved preferences. |
| UI-010 | Compact header arrangement | Keep file/history actions left, transparent modes centered, and the current-floor selector right. |
| UI-011 | Stable left tool rail | Place Build, Objects, Tools, Widgets and the remaining workspace tools on a slim rail. The tool dock expands to show labels. Enabled widget icons occupy a separate vertical strip at the left edge of the workspace. |
| UI-012 | Consolidated floor selector | Replace the visible G / floor-tab row plus Floors button with one current-floor selector, preserving floor-management actions. |
| UI-013 | One footer zoom control | Keep minus, percentage/reset and plus together in the footer; remove duplicate zoom readouts. |
| UI-014 | Pinned or temporary panels | Allow Build and Properties to be pinned. Temporary panels dismiss on canvas interaction without clearing the current selection. |
| UI-015 | Fit the usable canvas | Frame models in the unobstructed portion of the viewport when floating panels are open. |
| UI-016 | Smooth hold-to-pan | Clicking moves one step; holding continues smoothly; Shift provides larger movements. |
| UI-017 | Remember layouts per mode | Preserve separate drafting, modeling and presentation panel choices and split proportions. |
| UI-018 | Stable positions, relevant tools | Keep navigation and tool access in predictable locations while showing the controls relevant to the active mode. |
| UI-019 | Restore layout | Offer a reset in Appearance to recover the default panel arrangement. |
| UI-020 | Compact 4D launcher | A small icon + 4D control opens the bounded advanced panel; the collapsed launcher has no panel-sized wrapper. |
| UI-021 | Footer Sunlight presets | A footer icon opens 0%, 25%, 50%, 75% and 100% direct-sun brightness choices. Ambient light remains available at 0%. |
| UI-022 | Custom scrollable sunlight strength | Provide range and numeric controls, mouse-wheel adjustment and a link to sun position/date/time. Persist brightness in project history/import/export. |
| UI-023 | Theme cleanup | Keep all workspace theme controls in footer Appearance and remove duplicate visible theme controls from Studio+ and View tools. |

All existing editing tools remain available. Workspace controls preserve model geometry; sunlight strength is an undoable project setting. Usage and persistence details are documented in [the Studio+ guide](STUDIO_PLUS.md#footer-controls-and-workspace-layout).

## Header, dock and exterior refinement — implemented

| ID | Change | Result |
| --- | --- | --- |
| UI-024 | Restore ArchCAD Pro branding | The original drafting-triangle mark from `backupB4Gpt` appears beside ArchCAD PRO. A vector fallback renders consistently when an emoji font is unavailable. Clicking the brand saves the current project and returns to the application home. |
| UI-025 | Expanding left tool dock | Delayed mouse hover or keyboard focus reveals labels with a short transition. The dock toggle keeps it expanded for touch or mouse use. Escape collapses it; reduced-motion preferences are respected. |
| UI-026 | Workspace-left widgets | Enabled widgets stack vertically inside the workspace, separately from the tool dock. Widget keyboard navigation remains available; 4D controls clear the strip. |
| UI-027 | Searchable categorized menus | Tools, widgets, canvas settings, objects and Studio+ provide categories, search and empty-result feedback. All 102 tool actions and 18 Studio+ actions remain available. |
| UI-028 | Compact floor management | One compact panel offers floor search/switching, Add/Clone/Delete, custom names, reorder actions, level controls and object access. The header displays the chosen floor name. |
| UI-029 | 4D exterior garden | A separate 4D-owned scene adds textured lawn, small shrubs and trees around the buildable rectangle. Planting respects the actual site boundary, room/wall/site-object footprints, entrance approaches and available clearance. Lighting controls can disable the garden. |

The garden is presentation-only and does not enter the editable model, selection,
undo history or construction exports. Instanced foliage limits draw calls; geometry,
materials and maps are disposed when rebuilt or when leaving 4D. A constrained site
may have lawn and shrubs without enough clearance for trees.

Cross-browser follow-up: restored dialog focus does not expand the tool dock after
pointer use, and pan controls stay reachable over an expanded dock. Rebuilding the
4D scene retains exploded-floor placement without accumulating offsets. Browser
fixtures restore saved widget preferences after testing home navigation.

Opening a tool collapses the temporary dock; a pinned dock reserves its width so
Build assets and the drawing remain accessible.

## Consistent tool panels and 4D reliability — implemented

| ID | Change | Result |
| --- | --- | --- |
| UI-030 | Visible expanded labels | Expanded-label selectors override the legacy icon-only rules in all four themes. Hover expansion also moves open panels clear of the labels; pinning reserves the rail width. |
| UI-031 | One dock-panel arrangement | Build, Objects, Tools, Widgets, Settings, Search, Studio+ and Properties share the left panel position and width. Utility forms retain their original fields and actions inside a nonmodal panel. |
| UI-032 | Compact responsive forms | Default panel width is 296px, with compact headers, two-column actions, internal scrolling and sticky search. Small-screen navigation and form panels avoid squeezing each other. |
| UI-033 | Reliable panel transitions | Adding/selecting a room opens its original Properties inspector; choosing an object again reopens its details. Build/Properties layout choices still restore per mode. Utility panels support pin, outside-click dismissal and Escape. |
| 4D-001 | Independent scene compiler | `Scene4D` owns cloned geometry, materials and texture snapshots. Editor rebuilds cannot invalidate presentation buffers; updated source images propagate into owned textures. |
| 4D-002 | Building-shaped slabs and roofs | Slabs use occupied floor unions and actual shaft/stair openings. Empty storeys produce no full-plot caps. Gable, hip and shed roofs use the building footprint and real pitched geometry. |
| 4D-003 | Fault isolation and recovery | Invalid geometry is excluded with audit details. Render failures reveal the working 3D view; graphics-context restoration rebuilds 4D. Rendering & recovery provides a manual retry. |
| 4D-004 | Bounded GPU use | Resolution is capped at 1.1 million pixels and 1.25 device scale; shadows use 1024px maps. Unchanged sizes skip allocations, inactive targets shrink, and owned resources are disposed on rebuild/recovery. |
| 4D-005 | Adjustable glass cost | Balanced transparent glazing is the default; Lighting offers physical transmission for devices with more GPU capacity. Ambient-occlusion failures retry without that pass. |

Verification includes actual rendered label visibility, common panel bounds at
320–1440px, all built-in furniture geometry, editor/presentation ownership,
injected render failure and real WebGL context loss/restoration. These protections
reduce known failure paths; device-specific GPU limits still apply.

## Compact controls, motion and 2D context actions — implemented

| ID | Change | Result |
| --- | --- | --- |
| UI-034 | 130px expanded dock | Hover and pinned expansion use exactly 130px, with compact readable labels. Open panels follow the same rail offset. |
| UI-035 | Shared control styling | Buttons, panel actions, fields, popups and footer sheets share spacing, rounded corners, focus feedback and restrained shadows across all four themes. Dense fields retain usable number controls and labels. |
| UI-036 | Stable workspace switcher | 2D, Split, 3D and 4D use equal-width buttons inside a fixed 156px transparent container. The indicator glides to the selected mode. |
| UI-037 | Lightweight view transitions | Visible canvases enter with a short opacity/translation animation after layout changes. Rapid switching cancels previous motion, and reduced-motion preferences disable it. Rendering and input never wait for animation. |
| UI-038 | Pointer-aware 2D menu | Right-click detects rooms, rotated furniture, polygon footprints, doors/windows, empty plot and outside space after pan/zoom. Contextual actions preserve selection groups, respect locks and use existing undoable commands. |
| UI-039 | Accessible context interaction | The menu stays inside viewport edges, supports keyboard navigation, Escape and touch long-press, and dismisses on outside interaction or mode changes. Right-click cannot start object/opening dragging. |


## 4D Studio feature release — implemented

| ID | Feature | Implementation |
| --- | --- | --- |
| 4D-006 | HDR environments | Four generated floating-point presets, embedded Radiance import, rotation/intensity and optional sky. |
| 4D-007 | Reflections | Prefiltered room probes and up to four planar wall mirrors. |
| 4D-008 | PBR finishes | Eight saved surface finishes with appropriate color, normal and roughness data. |
| 4D-009 | Progressive stills | Bounded raster sample accumulation, cancellation and refined PNG capture. Path tracing is not included. |
| 4D-010 | Architectural camera | Lens selection, vertical correction, height, focus, aperture and still-photo depth of field. |
| 4D-011 | Alternative comparison | Saved snapshot compiler and synchronized read-only side-by-side views. |
| 4D-012 | Clearance overlays | Visible collision, passage and door-swing findings using the existing geometric checks. |
| 4D-013 | Construction sequence | Saved names/element assignments, temporary progress scrubbing and playback. |
| 4D-014 | Distance detail | Projected-size thresholds with hysteresis for dense distant furniture, full-detail override. |
| 4D-015 | Clean selection | Bounded edge overlays preserve underlying surface and emissive appearance. |

All controls share one six-tab 4D Studio dock. Practical rendering, comparison and stage-sequence limits are documented in [4D Studio](FOURD_STUDIO.md).

## 4D workspace, performance and visual quality — implementation tracking

Added on 23 October 2026 following the overlapping-label screenshot and reports
of freezing on entry and when moving between building and element views. These
items define the accepted requirements; the delivery status below distinguishes implementation from remaining work.
Preserve the original plot, element dimensions, positions, floors and saved
project content throughout this work.

### Entry and device performance — first priority

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| 4D-016 | Lightweight 4D workspace shell | Opening the 4D workspace displays a responsive shell and a Render 4D button. It does not initialize either a hidden prerequisite 3D renderer or the 4D renderer, compile project geometry, generate environments, or start render loops. |
| 4D-017 | Explicit Render 4D action | Load rendering-only dependencies and initialize graphics only after Render 4D is clicked. Selection, panels, restored workspace state and resize handlers cannot bypass this gate. Repeated clicks share one startup operation. |
| 4D-018 | Responsive, cancellable startup | Show preparation stages while loading dependencies, building geometry and preparing materials. Yield between bounded work batches, support cancellation and discard stale results when leaving or restarting. Use percentages only when progress can actually be measured. |
| 4D-019 | Only relevant 4D controls | Hide drafting/build tools, unrelated widgets, general element-editing controls and their popups in the 4D workspace. Keep branding/home, mode navigation and necessary project/status access compact. Restore previous tools and widget preferences when returning to their workspace. |
| 4D-020 | Suspend hidden work | Suspend unrelated widget subscriptions, timers, observers, expensive calculations and redundant rendering while in 4D. Hiding their DOM alone is insufficient. Reattach correctly on return without duplicate listeners. |
| 4D-021 | Reuse prepared scene for view changes | Building/element focus, camera motion, annotation changes and returning to full view must not recompile unchanged building geometry or regenerate materials, environments and planting. Separate model, material and view invalidation. |
| 4D-022 | Incremental model updates | Rebuild only affected objects/materials after actual project edits. Apply a completed scene update atomically; cancel obsolete work during rapid changes. Keep a versioned, bounded cache of reusable results. |
| 4D-023 | Adaptive quality and motion | Offer Eco, Balanced and High profiles with explicit cost indications. Begin conservatively; adjust resolution, shadows and optional effects using measured frame times. Lower costly effects during navigation, restore them after settling, and respect reduced motion. |
| 4D-024 | Render only when needed | Stop scheduling GPU frames when the scene is unchanged or the tab/workspace is hidden. Resume for input, requested animation, progressive still capture or a real scene change; avoid a concurrent hidden 3D render loop. |
| 4D-025 | Pause, stop and release | Provide Pause/Resume and Stop rendering. Stop cancels startup, captures and animations and releases owned GPU resources. Leaving 4D stops its work and releases expensive resources under a bounded reuse policy; reentry remains gated by Render 4D. |
| 4D-026 | Performance evidence | Profile cold startup, first usable frame, focus/full-view switching, orbit, tab visibility and repeated entry/exit using the supplied building and a larger fixture. Record main-thread long tasks, frame times, draw calls and resource counts; verify no accumulating resources. Set device-specific budgets from these measurements rather than promise universal FPS. |

### Selection, annotations and layout — pending screenshot fixes

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| 4D-027 | Clean initial and full view | Start with temporary labels, dimensions, editing handles and selection highlights hidden. Back to full view restores the complete building and clears temporary annotations as well as view filters without rebuilding unchanged geometry. |
| 4D-028 | Deliberate element focus | Single click selects/highlights and opens compact 4D inspection details without moving the camera. Focus is an explicit action; double-click may provide a desktop shortcut. Keep an obvious return action and a touch-accessible Focus button. |
| 4D-029 | Compact inspection details | Show full element information in one consistent bounded inspector. In-canvas text is limited to a short selected-element label; full configurations must not cover the building. Reuse relevant material actions without exposing unrelated drafting tools. |
| 4D-030 | Annotation visibility control | Offer Off / Selected / All, with dimensions controlled explicitly. Preserve a user's chosen inspection preference while allowing clean full-view and export actions to hide temporary overlays. |
| 4D-031 | Collision-aware annotations | Prevent labels from overlapping each other, navigation, open panels and viewport edges. Prioritize selected/nearby elements, group dense labels, and suppress labels for hidden or occluded objects using bounded visibility checks. |
| 4D-032 | Frame the usable canvas | Fit the complete building within the space left by panels and navigation. Preserve camera continuity between selection and full view; do not let decorative transitions wait for expensive rendering work. |
| 4D-033 | Clean image export | Exclude UI, selection outlines and annotations by default; allow deliberate annotation inclusion. Restore interactive state after success, cancellation or failure. |

### Advanced architectural presentation — pending investigation and refinement

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| 4D-034 | Roof and upper-wall audit | Trace the projecting surface visible above the screenshot's roof to its source object. Check roof joins, parapets, end faces, duplicate caps, normals and floor datums. Correct rendering errors without altering entered geometry or hiding valid design features. |
| 4D-035 | Glass and surface audit | Trace the large cyan surface to its saved material and owner. Check tint, transparency ordering, reflections, thickness and depth behavior. Preserve intentional material choices and expose realistic glazing presets with bounded cost. |
| 4D-036 | Architectural junctions | Inspect shared walls, floor connections, corners, stair/shaft openings, door/window cuts, frames, reveals and railings from exterior and interior views. Detect duplicated or coplanar faces and visible gaps; retain accurate dimensions. |
| 4D-037 | Lighting and finish depth | Refine exposure, sun/ambient balance, contact shadows, texture scale and roughness. Offer affordable preview settings and explicitly requested higher-quality stills. Keep material colour consistent across quality profiles. |
| 4D-038 | Site-object audit | Identify the screenshot's coloured ground objects and verify their saved type, dimensions and render representation. Preserve intentional test objects; fix invalid proxies and use credible, bounded-cost landscape assets. |
| 4D-039 | Advanced view workflows | Organize Exterior, Interior, Floor inspection, Section and Photo views in one compact 4D-only panel. Build on existing camera, lighting, material, comparison and stage tools; do not introduce duplicate settings. Advanced effects initialize only when requested after rendering starts. |
| 4D-040 | Review before release | Compare before/after screenshots for full building, each floor, focused elements and all exterior angles. Verify import/export, unchanged plot/element geometry, cancellation, rapid mode switching, mobile layout, reduced motion and graphics-context recovery. Report measured performance and remaining limitations before marking these items implemented. |

Delivery order: explicit startup gate and workspace isolation; profiling and view
reuse; clean selection/annotations; architectural rendering corrections; advanced
presentation polish. The implementation must retain existing features through
their relevant workspaces rather than delete them to improve performance.

### Delivery status — 23 October 2026

The dedicated workspace implements the explicit startup gate, cancellation,
relevant controls/background suspension, scene reuse for viewing, quality profiles,
idle/pause/stop lifecycle, diagnostics, clean selection, bounded annotations,
usable-area framing and clean capture. Exterior/interior/floor/section/photo tools
reuse the existing presentation features. Opening animation now preserves source
transforms, and exterior room-light/shader costs are reduced. The screenshot's
roof projection was traced to saved parapet geometry; intentional test materials
and site objects remain intact.

**Status at the earlier workspace release (superseded by 4D-041–056 below):** finishes updated only affected owners without
rebuilding geometry. Structural geometry edits still rebuild the editor source
and replace its presentation scene atomically. Fully incremental structural
geometry remains pending. Geometry-specific operations and driver shader
compilation can still produce long tasks on complex projects; profiling and the
explicit loading card expose that work rather than promise universal frame rates.
Further artistic refinement under 4D-034–038 remains open as actual visual defects
are reproduced; valid architectural content will not be removed to mask them.

See [4D workspace lifecycle and validation](FOURD_WORKSPACE.md) for implemented
behavior, profile budgets, architectural audit findings and verification commands.

## Next 4D performance, realism and view transitions — implemented with global fallback

Added on 23 October 2026. Delivery details and limits follow the requirement table.
Items 4D-041–045 break down the remaining structural-update work under 4D-022
and its verification under 4D-026. Items 4D-046–050 extend the existing visual
quality and view workflows rather than introduce competing settings or engines.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| 4D-041 | Update affected structural geometry | Track dependencies between rooms, shared walls, openings, slabs, ceilings and roofs. A door edit updates its opening and affected wall; a room resize updates connected geometry. Keep unrelated source and presentation meshes unchanged. Retain an explicit full-rebuild fallback for global changes or invalid dependencies. |
| 4D-042 | Reuse unchanged rendering resources | Keep unaffected meshes, materials and textures through structural edits. Define ownership and bounded cache eviction; dispose replaced resources without invalidating shared assets. Repeated edits must not accumulate GPU resources or retain removed elements. |
| 4D-043 | Prepare edits in responsive batches | Prepare geometry in cancellable batches, keep navigation responsive and publish each completed dependency group coherently so walls and openings cannot display mismatched versions. Preserve the prior valid view on cancellation or failure. Measure remaining synchronous work on large fixtures. |
| 4D-044 | Coalesce rapid edits | Combine repeated input changes, cancel obsolete preparation and commit only the latest project version. Undo/redo, deletion, stopping rendering and leaving 4D invalidate pending updates correctly; delayed results cannot resurrect old objects. |
| 4D-045 | Verify the incremental pipeline | Compare incremental output with a full rebuild for door/window changes, room resize/move, shared walls, floors, roofs, undo/redo and deletion. Profile the supplied plan and a larger fixture for edit latency, view-switch frame times, resource counts and repeated entry/exit. Keep original plot dimensions and unedited geometry exact. |
| 4D-046 | More realistic architectural presentation | Extend 4D-035–038 with consistent physical texture scale, believable roughness, glazing, contact shadows and balanced exterior/interior exposure. Compare element, floor and full-plot captures. Preserve saved finishes and geometry; higher-cost effects remain explicit and profile-bounded. Do not claim path tracing or add a second set of quality controls. |
| 4D-047 | Smooth element-view transitions | Explicit Focus animates camera position and target together from the current pose to the selected element within the usable viewport. Keep a clear return action and avoid wall penetration or clipping where a valid route is available. New input cancels motion immediately; reuse prepared geometry and respect reduced motion. |
| 4D-048 | Smooth floor-view transitions | Frame the requested floor with a continuous camera transition and coherent visibility/cutaway changes. Preserve the previous building view for return; include stair/shaft boundaries and selected-floor context without changing saved geometry. Rapid floor changes cancel outdated transitions and never leave stale visibility filters. |
| 4D-049 | Smooth plot-view transitions | Provide a named Plot view that frames the complete saved site boundary, building and relevant landscape without overlapping controls. Distinguish it from Full building view. Animate from the current camera, retain a return pose and reuse existing geometry, environments and planting. |
| 4D-050 | One interruptible view-transition controller | Coordinate element, floor, building and plot navigation through one controller with consistent easing, bounded duration and adjustable/reduced motion. Cancel obsolete animation on user navigation, new targets, pause, stop, tab hiding or mode exit. No timers or GPU frames persist after motion settles; assess frame times rather than promise universal FPS. |

Suggested delivery order: 4D-041–045 first; shared transition controller and
element/floor/plot views next; visual refinement with before/after comparisons
last. Keep single-click selection separate from deliberate camera focus.
The six presentation proposals were accepted for implementation in the same release:

| ID | Feature | Delivered behavior |
| --- | --- | --- |
| 4D-051 | Interior reveal | Focused-room wall intersections fade temporarily, restore their original opacity/depth/shadow settings on return, and respect reduced motion. No editable walls are removed. |
| 4D-052 | View breadcrumbs | Plot / Building / Floor / Element navigation and a bounded 24-entry Back history restore camera and inspection filters. |
| 4D-053 | Daylight preview | Scrub local hour or play a bounded morning/evening preview using saved site/date/UTC settings. Reset discards the preview; Apply saves the hour through undo/redo. |
| 4D-054 | Finish close-up | Inspect the actual floor, wall or ceiling in temporary neutral lighting, retaining saved texture scale. Return restores the previous view and lighting. |
| 4D-055 | Guided walkthrough | Save, reorder, remove and visit up to 24 camera stops. Play, Pause, Stop and speed controls use cancellable camera travel. Stops persist in validated project JSON and undo/redo. |
| 4D-056 | Refine after settling | Navigation lowers pixel density/AO cost, and settled views restore quality, refresh requested reflections and optionally accumulate refined raster stills through the existing Photo settings. |

### Delivery scope and remaining limits

Local room, shared-wall, opening, generated slab/roof and professional-object
updates use stable dependency records, cancellable preparation and one checked
scene commit. Unaffected meshes retain identity; repeated edits dispose replaced
buffers. The displayed scene reads its matching project snapshot while edits
are staged, so room deletion/reindexing cannot invalidate its ceiling lookup.

Global plot/scale/unit, floor-count/level and other global builder settings use
the established source rebuild plus asynchronous presentation staging. A single
polygon/geometry operation and GPU shader compilation remain synchronous. This
is an explicit fallback, not a promise that every architectural change updates
one mesh or that all large-project stalls are eliminated.

The shared view controller supports Normal / Gentle / Off, reduced motion,
clipping interpolation, obstruction-aware raised camera routes and immediate
input cancellation. Daylight playback and tours stop on Pause, Stop, hidden tabs
and mode exit. Texture projection, timber detail, roughness variation, shadow
bias and lighting moods improve presentation while preserving entered geometry
and intentional saved finishes. This remains raster visualization; it does not
add path tracing or certify physical daylight performance.

See [the 4D workspace guide](FOURD_WORKSPACE.md) for controls and verification.

## Next 4D improvements — delivered with bounded detail and worker fallback

Added on 23 October 2026 and delivered in the architectural review release.
Items 4D-057–064 refine the existing engine, assets, controls and diagnostics
while preserving saved plot and element dimensions. Scope and limits follow.

| ID | Requirement | Acceptance criteria |
| --- | --- | --- |
| 4D-057 | Detailed architectural junctions | Extend the junction audit under 4D-036 with clean wall corners, roof joins, window reveals, door frames and skirting. Check interior and exterior close-ups for gaps, overlapping faces and inconsistent thickness. Preserve entered room dimensions and opening positions. |
| 4D-058 | Solid section cuts | Cap exposed wall and slab cut surfaces in section views, including openings and holes. Keep caps aligned through clipping transitions, use appropriate section finishes and avoid changing editable geometry. Bound preparation cost and release superseded cap buffers. |
| 4D-059 | Better furniture and vegetation | Refine proportions, texture scale, material response and plant variation in the existing asset pipeline. Retain lightweight distant versions and profile-bounded instance counts; preserve saved placement and dimensions. Compare room, floor and plot views. |
| 4D-060 | Lighting by fixture | Give ceiling lights, spotlights and wall lights suitable direction, spread, intensity and colour-temperature controls. Persist validated fixture settings through import/export and undo/redo. Keep active lights and shadow casters within quality-profile budgets and preserve daylight settings. |
| 4D-061 | Background geometry preparation | Move suitable remaining synchronous topology and buffer calculations into workers using serializable snapshots and transferable data. Keep renderer and scene ownership on the main thread. Cancel stale revisions, commit dependency groups coherently and retain the previous valid scene on failure. Compare results with the existing builder and measure main-thread edit pauses. |
| 4D-062 | Texture and asset budgets | Extend existing resource reuse with progressive detail loading, explicit texture-resolution and asset-memory budgets, bounded caches and unused-resource eviction. Adapt to quality profiles without repeatedly downloading or decoding unchanged assets. Verify repeated entry, navigation and edits return resource counts to a stable range. |
| 4D-063 | View-aware controls | Adapt the existing compact panel to Element, Floor and Plot context: room finishes, floor controls and landscaping respectively. Keep selection and Back navigation clear, preserve access to relevant tools and use one consistent panel pattern without increasing workspace obstruction. Support keyboard navigation and reduced motion. |
| 4D-064 | Performance regression checks | Extend current diagnostics, benchmarks and CI with repeatable measurements for cold/warm startup, view transitions, edit latency and memory/resource growth. Establish fixture- and environment-specific baselines, report meaningful regressions before deployment and distinguish software-rendered CI results from device measurements. Include worker, asset-budget and lifecycle checks. |

Suggested delivery order: record a baseline under 4D-064 first, implement
4D-061–062 for responsiveness and memory, then 4D-057–060 for visual quality,
and 4D-063 for contextual controls. Run the expanded regression checks throughout.
No universal frame-rate or total-process memory guarantee is implied by these items.


### Additional accepted review features — delivered

The six follow-up suggestions were accepted in the same implementation batch.

| ID | Feature | Delivered behavior |
| --- | --- | --- |
| 4D-065 | Linked plan/model selection | Split review shares stable-ID selection, a model outline, click selection in the model and Locate in plan/model actions. Leaving the isolated 4D portal releases its engine and worker. |
| 4D-066 | Revision highlighting | Compare saved alternatives with current element/opening records and surface finishes. Coloured extents show added, moved, resized, removed and other changes; dashed boxes show old extents. Page through 100 rows at a time for exact values and select current source elements; highlight at most 200 changes. Clear overlays after edits. |
| 4D-067 | Material continuity | Apply a shared plan origin, physical repeat and rotation to selected floor/ceiling finishes. Locked targets are rejected; assignments support undo/redo and portable save. Imported furniture UVs and wall unwraps retain their own layouts. |
| 4D-068 | Section bookmarks | Save up to 24 named poses, cutting planes, section boxes, floor context and annotations in portable inches. Visit restores filters and camera; removed room/floor targets fall back safely. |
| 4D-069 | Sequential render queue | Capture saved views one at a time to a single PNG ZIP with progress, cancellation and a view manifest. Restore the previous view after completion. Pause, exit, tab hiding, navigation and edits cancel pending work; output is bounded to 128 MiB. |
| 4D-070 | Visual defect inspector | Check malformed buffers, missing texture images/UVs, exact coincident meshes and suspicious wall endpoint gaps. Findings highlight extents and link to source selection/focus. These are bounded review aids, not exhaustive repair or certification. |

### Delivery scope for 4D-057–070

- Architectural detail adds door-aware skirting, opening architraves/window sills,
  solid roof undersides/edges and bounded bevels on procedural furniture. Detail strips are limited to 300/900/1600 in the three quality profiles, with omitted strips reported. Existing
  authored assets and source dimensions stay intact. Foliage uses deterministic
  variation and profile-controlled instance counts. Artistic refinement can still
  continue as specific junction defects are reproduced.
- Section caps triangulate closed mesh/plane contours, retaining nested holes.
  Open contours and meshes beyond the 350,000-input-vertex budget are counted in
  Device diagnostics rather than filled speculatively. Superseded cap buffers are
  disposed; navigation defers cap preparation until settling.
- Lazy CPU workers prepare wall/dependency descriptions, footprints, slab buffers,
  roof shells, furniture bevels and section contours. Stale descriptions are
  coalesced. Workers never own scene/DOM/GPU state; Pause/Stop/exit terminate jobs.
  The shared CPU kernel supports a worker-unavailable fallback. Some source
  builders, imported-model parsing and shader compilation still use the main thread.
- Owned image textures load progressively and use conservative 32/64/128 MiB
  residency budgets with 512/1024/2048 px caps in Eco/Balanced/High. These estimates
  exclude render targets, project data, editor originals and total process memory.
  Existing imported-template caching remains bounded at eight.
- Review follows one compact themed dock, with contextual Element/Floor/Plot tools
  and a mobile bottom sheet. Usable-area framing accounts for the bottom sheet,
  responsive viewport changes and the active presentation lens. AO uses independent
  deterministic tangent vectors, physical depth thresholds and bounded contrast
  with higher-precision depth and tighter focused-view bounds to avoid bands on smooth walls.
- Kernel/model tests cover exact bounds, cap holes, shells and portable data.
  Browser checks cover actual PNG/ZIP output, repeated edits, stable resource counts,
  worker restrictions/lifecycle and mobile layout. CI publishes per-engine timing
  artifacts and flags explicit software-browser budgets; Device saves per-browser,
  viewport and quality baselines for real-device comparisons.

See [4D workspace delivery and validation](FOURD_WORKSPACE.md) for controls,
performance thresholds and remaining rendering limits.

## Parapet design collection and controls — implemented

Accepted and implemented on 23 October 2026. The user accepted a mixture of modern and
Indian-inspired designs: the first six proposals plus ten additional proposals.
These are 16 new options alongside the existing styles, not replacements. This
section records the accepted requirements. Delivery details and practical limits follow below.

| ID | Proposed design | Acceptance criteria |
| --- | --- | --- |
| PAR-001 | Floating coping | Projecting cap above a recessed shadow line, with closed end faces, continuous corners and believable wall/cap thickness. |
| PAR-002 | Geometric jaali | Square, diamond and hexagonal perforated-panel variants with bounded repeat counts and actual openings in close views. |
| PAR-003 | Stepped Art Deco | Layered horizontal bands and raised corner sections, with coherent coping and no overlapping faces. |
| PAR-004 | Planter parapet | Integrated planter pockets and optional restrained greenery; keep planter dimensions explicit and vegetation profile-bounded. |
| PAR-005 | Fluted concrete / stone | Shallow grooves, restrained surface variation and simple coping. Retain a lightweight distant representation. |
| PAR-006 | Solid + slim pickets | Masonry base with slender vertical metal rails, consistent spacing, defined connections and finished endpoints. |
| PAR-007 | Scalloped arch panels | Recessed arches framed by solid masonry, retaining continuous backing thickness and clean corners. |
| PAR-008 | Lotus crown | Restrained petal-shaped top detailing with closed surfaces, finite normals and a profile-bounded segment count. |
| PAR-009 | Traditional pilasters | Capped posts with recessed panels between them, with consistent post/panel junctions. |
| PAR-010 | Terracotta tube screen | Rounded clay tubes with adjustable spacing and bounded instancing; show their depth and rounded cross-section in close views. |
| PAR-011 | Brick heritage | Projecting brick courses, recessed panels and stone coping; match physical texture scale to the model units. |
| PAR-012 | Folded metal panels | Angular folded sections with crisp edges, visible sheet depth and closed edge returns. |
| PAR-013 | Board-formed concrete | Horizontal timber impressions and recessed joints with a coherent cap; surface detail must not resize the structural wall. |
| PAR-014 | Gabion accents | Stone-filled sections between solid supports, with readable enclosure edges and cheaper distant detail. Bound individual stone geometry. |
| PAR-015 | Standing-seam metal | Raised seams, finished corner returns and a continuous cap. Keep seam spacing and material controls independent. |
| PAR-016 | Offset ribbon bands | Staggered horizontal bands joined by solid supports, with defined connections and no floating or duplicated surfaces. |

| ID | Shared requirement | Acceptance criteria |
| --- | --- | --- |
| PAR-017 | Direct compact 4D controls | Add a discoverable parapet action in the 4D Views workflow and compact thumbnail previews using the existing themed dock. Preserve access through the current 3D tools. |
| PAR-018 | Apply by edge | Support front, rear, left, right and complete-perimeter application with a clear orientation preview. Polygonal footprints need stable segment selection rather than ambiguous cardinal labels. |
| PAR-019 | Mixed edge designs | Allow a decorative frontage and simpler side/rear designs with coherent joins and stable edge assignments after save/import. |
| PAR-020 | Separate geometry and finishes | Choose concrete, stone, brick or metal independently of the design. Expose applicable height, thickness and detail parameters with validated limits and explicit units; changing a finish must not change geometry. |
| PAR-021 | Architectural junctions | Finish corners, caps, ends and material transitions with appropriate thickness. Inspect external/internal corners and roof intersections without changing saved plot or room footprints. |
| PAR-022 | Preview, Apply, Cancel and Undo | Keep previews temporary; Apply creates an undoable edit, Cancel restores the saved state and Undo/Redo restore complete per-edge assignments and parameters. Handle invalid values without losing input focus or leaving stale geometry. |
| PAR-023 | Saved custom presets | Save named parameter/finish combinations through the existing project workflow with stable style IDs and portable validation. Retain the existing ten styles and legacy parapet configuration. |
| PAR-024 | Optional accent lighting | Offer controlled accent lighting where the design supports it, disabled independently and constrained by existing quality/light budgets. Avoid a separate always-running lighting loop. |
| PAR-025 | Device-friendly detail and verification | Share repeated geometry/materials, instance appropriate parts and simplify distant details. Respect the Render 4D gate and release owned resources on Stop/exit. Test all 16 additions and existing styles in 3D/4D, all themes, mobile, save/import and undo/redo; preserve the supplied plot and original room dimensions. |

Delivery order: shared edge/configuration validation, preview/undo/persistence
and the compact panel, followed by the 16 designs in one release with visual
and performance checks. Design labels are
stylistic descriptions, not claims of historical authenticity or construction approval.

### Additional accepted parapet features — delivered

| ID | Feature | Delivered behaviour |
| --- | --- | --- |
| PAR-026 | Automatic module spacing | Symmetrical fitted modules with explicit actual spacing; repeated patterns are bounded for large outlines. |
| PAR-027 | Drainage openings | Per-edge scupper width, height, sill and offset; actual through-openings with fit/overlap validation. Existing rainwater tools remain available separately. |
| PAR-028 | Terrace access gates | A matching gate on a selected segment with validated width/offset, independent of room geometry. |
| PAR-029 | Quantities and cost | Per-segment length, coping, finish area, module/post estimates and user-entered unit rates; CSV export. |
| PAR-030 | Dimensioned elevations | SVG sheets identify each edge, design, finish, length, height, thickness, module spacing and openings. Drawings use schematic pattern marks, not fabrication profiles. |
| PAR-031 | Privacy preview | Approximate open/screened percentage plus street-level camera with eye-height and distance controls; Full view returns to the building. |
| PAR-032 | Coordinated motion | Short compositor panel/disclosure/widget transitions, consistent button feedback and smoother view timing. Reduced motion and hidden tabs cancel animation. |
| PAR-033 | Two realism themes | Limestone with Golden hour lighting and Courtyard with soft daylight, including distinct workspace/2D/3D/4D palettes and saved HDR environment settings. |

Delivery notes:
- The original ten style choices remain alongside sixteen additions. Existing
  legacy projects retain their original global style builders. Opening the new
  studio and applying upgrades the parapet configuration to version 2; original
  styles in this edge-based workflow use compatible modular profiles.
- The compact searchable studio opens from Floors / 3D tools or 4D Views and uses
  the shared dock; mobile 4D uses a bottom sheet with the model visible above.
- Numbered perimeter/courtyard segments follow the top occupied floor union,
  including irregular and disconnected footprints. Endpoint-based assignments
  survive element reordering and save/import. Editing a boundary to new endpoints
  produces a new edge that inherits the default, rather than guessing an assignment.
- Designs, thickness, finishes, colors and mixed edge assignments are portable.
  Preview never enters autosave or history. Apply is one undoable edit; Cancel,
  closing the panel, or importing a project releases temporary preview state.
- Parapet-only edits and previews replace the parapet collection in 4D, preserving
  unrelated wall objects. Changes to the top-floor footprint also refresh it.
  Repeated parts share geometry/materials and are instanced where appropriate;
  profile-bounded detail and distant-detail hiding limit rendering work. Accent
  strips are emissive surfaces and do not add shadow-casting lights; Eco omits them.
- Render 4D remains explicit. Opening the portal/studio or preparing a preview
  does not allocate a renderer or launch a worker. Stop/exit release owned resources.
- Quantities, opening ratios and elevations are conceptual estimates, not
  structural/drainage compliance calculations or fabrication drawings. Rates
  use the currency chosen by the user and default to zero until entered.

Validation: model tests cover all 26 style IDs, finite geometry, real scupper
openings, unchanged finish geometry, L-shaped edge identity, portable validation,
quantities and two added environments. Browser tests cover keyboard numeric
arrows, preview/cancel, incremental wall preservation, undo/redo, mixed edge
openings, presets, SVG export, themes, mobile layout and renderer cleanup.

## Reliability audit release

The eleven reproduced defects and three supporting architecture improvements are
implemented in [AUDIT_FIXES.md](AUDIT_FIXES.md). Dialog presentation now has one
policy and lifecycle registry; Floors exposes Parapet studio directly. Seven 4D
implementation modules wait for Render, geometry workers omit embedded payloads,
and project clones share immutable asset strings while isolating mutable data.
Global structural edits retain the documented full-rebuild fallback.

## Performance and architectural accuracy — six accepted follow-ups implemented

1. Opt-in current-design device profiling with scoped JSON reports and cancellation.
2. Local dependency updates for floor count, level datums/heights and wall settings.
3. Staged source building, worker roof/GLB preparation and batched shader warm-up.
4. Portable roof thickness and locatable geometric junction/penetration warnings.
5. Additional calibrated PBR finish profiles and deterministic texture generation.
6. Reviewed exterior/floor/element visual references and incremental/full comparisons.

See [PERFORMANCE_ARCHITECTURE.md](PERFORMANCE_ARCHITECTURE.md) for verification,
actual device profiling steps and remaining single-operation/driver limitations.
