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
