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

**4D-022 is partially implemented:** finishes update only affected owners without
rebuilding geometry. Structural geometry edits still rebuild the editor source
and replace its presentation scene atomically. Fully incremental structural
geometry remains pending. Geometry-specific operations and driver shader
compilation can still produce long tasks on complex projects; profiling and the
explicit loading card expose that work rather than promise universal frame rates.
Further artistic refinement under 4D-034–038 remains open as actual visual defects
are reproduced; valid architectural content will not be removed to mask them.

See [4D workspace lifecycle and validation](FOURD_WORKSPACE.md) for implemented
behavior, profile budgets, architectural audit findings and verification commands.

## Next 4D performance, realism and view transitions — accepted, pending

Added on 23 October 2026. These are backlog requirements, not a delivered release.
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
Further ideas discussed after this update remain proposals until accepted.
