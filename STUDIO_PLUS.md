# Studio+ tools and themes

Open **✦ Studio+** on the left rail to access the coordinated editing and presentation tools. The original Build, Tools, Design, Pro, Widgets and Properties workflows remain available. The 4D presentation panel and Properties also provide shortcuts to relevant Studio+ actions.

| # | Improvement | How to use it |
| --- | --- | --- |
| 1 | Room-focused viewing | Select a room and choose Focus room. Selecting another room in 4D frames it automatically when no dialog is open. Other rooms, roofs and high wall sections are hidden; Clear room restores the model. |
| 2 | Separate surface finishes | Choose Finishes for floor, wall or ceiling. Adjust color, texture, scale, rotation and roughness. Preview does not change the saved project; Apply creates one undoable edit. |
| 3 | Adaptive rendering | Adaptive quality temporarily lowers resolution and ambient occlusion during navigation, then restores detail. The small status badge reports moving FPS or Idle. |
| 4 | Interior presentation | Interior lighting controls intensity and warm/cool color. Furniture finishes use the same finish editor; physical glass remains transparent. |
| 5 | Precise furniture placement | Exact place sets distance from a rectangular room's clear wall face and chooses alignment. Wall snap can also settle furniture near a wall after a 2D or 3D drag. |
| 6 | Clearance checks | Furniture clearances lists overlaps, potential narrow passages, narrow doors and conservative door-swing conflicts. Select a result to inspect it. |
| 7 | Linked plan and presentation | Linked 2D / 4D shows both views and shares selection with Properties. Narrow screens stack the canvases. |
| 8 | Design alternatives | Save named alternatives, restore them or compare changes, including surface finish assignments. |
| 9 | Opening dimensions | Opening overlays show size, sill and offset; click a label or Edit size / sill / offset to open the existing precise opening editor. |
| 10 | Reliable editing and history | Geometry, openings and finishes use project validation and undo/redo. Undo/redo retains surviving selection. Invalid edits report an error without applying partial changes. |
| 11 | Eye-level walkthrough | Configure eye height and speed, then use WASD, arrows or the direction pad. Drag to look or enable mouse look. Esc exits. |
| 12 | Opening interaction | Open doors & windows provides independent opening sliders. Hinged doors respect handing and swing; sliding doors and windows slide. Saved geometry dimensions remain unchanged. |
| 13 | Exploded floors | Spread floor assemblies vertically with adjustable spacing and floor labels. This is a temporary view; reset spacing to edit the assembled model. |
| 14 | Sun study | Set location, date and time in Sun study to update sun direction, shadows and daylight. |
| 15 | Section box | Set six bounds numerically or drag the six labeled plane handles in the viewport. Clear box restores the unclipped view. |
| 16 | Material eyedropper | Click a source surface, then a target surface to copy its finish. Esc cancels the operation. |
| 17 | Clean focus mode | Hide the header, panels and overlays for a larger presentation area. Exit focus or Esc restores the workspace. |
| 18 | Measurement overlays | Show room or opening dimensions, or use the existing two-point measurement tool. Click room labels to select; click opening labels to edit. |

## Four themes

**Graphite**, **Pearl**, **Ocean** and **Sand** are available in footer **Appearance**. Theme choices persist on the current device and affect the workspace interface and the 2D / 3D / 4D canvas background independently of model materials and lighting. Rendering presets and sun study preserve the chosen canvas theme. Each theme now uses distinct 2D, 3D and 4D backdrops; Appearance includes preview cards and saved control spacing. See [the UI refinement checklist](UI_REFINEMENTS.md).

## Footer controls and workspace layout

- **Appearance** opens a panel attached above the footer: four themes, Compact / Comfortable spacing, canvas contrast, separate 2D / 3D / 4D backgrounds per theme, 2D/3D grid visibility and intensity, drawing-label visibility and room-label size. Reset theme backgrounds restores the active palette; Restore layout resets panels and split proportions. Workspace theme controls have moved here from Studio+ and View tools.
- **Sunlight** opens 0 / 25 / 50 / 75 / 100% direct-sun brightness presets, a custom slider and number field. Scroll over either custom control for 1% steps; Shift-scroll uses 5%. At 0% direct sunlight is off while ambient/interior lighting remains. Percentage scales the current lighting preset; it does not represent time. Sun position & time opens the separate location/date/time study. Changes persist in project export/import and history and affect both rendering engines.
- The small **cube + 4D** launcher opens the advanced presentation panel. Clicking it again, clicking the canvas, or pressing Escape closes it. Rendering presets and all advanced features remain available inside.
- The header groups file/history actions, transparent workspace modes and one current-floor selector. The left rail retains Build, Tools, Widgets, Settings, Search and Studio+, with Objects and selected-element Properties access. The tool dock expands on delayed hover or keyboard focus; its top toggle keeps labels visible. Enabled widget icons occupy a separate strip on the workspace’s left edge; click one to see its data. Tools, widgets, settings, objects and Studio+ support categorized search.
- The restored drafting-triangle **ArchCAD PRO** brand saves the current project before returning to the application home. Floor management includes search, switching, custom names, Add/Clone/Delete, reorder actions and existing level controls.
- In 4D, the exterior garden adds textured lawn and sparse instanced planting inside the actual plot, with clear building and entrance approaches. **4D → Lighting → Exterior garden** controls visibility; this device preference does not change project geometry. Trees only appear where their crowns fit.
- The pan pad has Up / Left / Fit / Right / Down. Click a step, hold to continue, or hold Shift for larger movements. It pans the plan; the separate camera cross selects Top / Left / ISO / Right / Front. Footer zoom applies to the plan in 2D and Split; Fit selection frames the active view.
- Pin Build or Properties to keep it visible. Unpinned panels dismiss on canvas interaction without clearing the selection; use their rail buttons to reopen them. Panel choices and split proportions are remembered independently for each workspace mode. Model framing allows for the open advanced panel.
- Footer panels close on outside click or Escape, keep the model visible and restore opener focus when closed from inside. Narrow screens use bounded, internally scrolling panels above the footer.

## Consistent dock panels and renderer recovery

Dock tools now open beside the left rail in the same compact, scrollable panel
arrangement as Build. Objects, Tools, Widgets, Settings, Search and Studio+ reuse
their original controls; selecting or adding a room shows the original Properties
inspector in that position. The selected tool is highlighted. Pin a utility panel
to keep it open during canvas work; Escape or its close button dismisses it.
Temporary dock expansion keeps icon labels clear of open panels. On small screens,
choosing a tool compacts the dock so form controls remain usable.

In **4D → Rendering & recovery**, inspect renderer state, geometry audit results
and resource counts, or retry the engine. If a graphics context is lost, the
editable 3D view remains available and 4D rebuilds when the context returns. A
failed ambient-occlusion pass retries with standard PBR rendering. **Lighting →
Physical glass** enables costlier transmission; balanced transparent glass is the
default. These rendering preferences do not change room dimensions or openings.

`js/scene4d.js` compiles the presentation scene independently from editor GPU
buffers. It rebuilds slab footprints and pitched roofs from project geometry,
retains stair/shaft slab holes, omits empty-storey slabs and owns its geometry,
materials and texture snapshots. Malformed geometry is omitted and reported.
Resolution is limited to 1.1 million pixels with device scale up to 1.25; adaptive
navigation can reduce it further. Scene rebuilds and recovery dispose owned
resources, and leaving 4D shrinks inactive render targets.

## Saving and view state

Surface assignments, opening fractions, clearance settings, wall-snap preference, eye height, speed and interior light settings are saved with the project. They participate in native import/export and version history. Design alternatives capture those settings too. Preview changes require Apply before they are saved.

Room focus, exploded spacing, section handles, linked canvas layout, walkthrough navigation and clean focus mode are temporary viewing tools. They do not move the architectural model. Theme, canvas appearance, panel pins, per-mode layouts and adaptive-quality preferences are stored on the device. Direct sunlight percentage is saved with the project and participates in undo/redo.

## Practical limits

The independent 4D engine uses real-time physically based raster rendering, ambient occlusion, soft shadows, reflection/environment lighting and antialiasing. It is a presentation view, not a construction timeline or a path tracer. Sun and interior lights are visual studies rather than calibrated daylight or energy simulations; up to sixteen nearby room lights are used at once.

Clearance and door-swing checks are geometric review aids, not building-code certification. The swing envelope is conservative. Exact wall-distance placement and automatic wall snap currently reference rectangular rooms and the external wall thickness; use manual placement for polygon rooms or unusual wall assemblies. Walkthrough uses simplified wall/furniture collision boxes and follows a fixed eye level on the selected floor rather than stair physics.

## Verification

`npm test` runs project, planning, design, presentation, workbench, independent 4D scene and API checks. `npm run check` verifies script syntax and packaged/offline assets. `npm run test:browser` includes the original tool workflows and Studio+ interactions; `ENHANCEMENTS_ONLY=1` runs the focused Studio+ browser checks. `REFINEMENT_ONLY=1` verifies branding/home persistence, dock expansion, categorized search, floor management, responsive headers and 4D garden ownership/cleanup. `UNIFIED_ONLY=1` checks rendered labels in all themes, common panel bounds, built-in furniture geometry, resource ownership, render failure and real graphics-context restoration. CI runs the browser suite in Chromium, Firefox and WebKit.
