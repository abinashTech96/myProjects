# Studio+ tools and themes

Open **✦ Studio+** beside Search to access the coordinated editing and presentation tools. The original Build, Tools, Design, Pro, Widgets and Properties workflows remain available. The 4D presentation panel and Properties also provide shortcuts to relevant Studio+ actions.

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

**Graphite**, **Pearl**, **Ocean** and **Sand** are available in Studio+ and the theme menu. Theme choices persist on the current device and affect the workspace interface independently of model materials and lighting.

## Saving and view state

Surface assignments, opening fractions, clearance settings, wall-snap preference, eye height, speed and interior light settings are saved with the project. They participate in native import/export and version history. Design alternatives capture those settings too. Preview changes require Apply before they are saved.

Room focus, exploded spacing, section handles, linked canvas layout, walkthrough navigation and clean focus mode are temporary viewing tools. They do not move the architectural model. Theme and adaptive-quality preferences are stored on the device.

## Practical limits

The independent 4D engine uses real-time physically based raster rendering, ambient occlusion, soft shadows, reflection/environment lighting and antialiasing. It is a presentation view, not a construction timeline or a path tracer. Sun and interior lights are visual studies rather than calibrated daylight or energy simulations; up to sixteen nearby room lights are used at once.

Clearance and door-swing checks are geometric review aids, not building-code certification. The swing envelope is conservative. Exact wall-distance placement and automatic wall snap currently reference rectangular rooms and the external wall thickness; use manual placement for polygon rooms or unusual wall assemblies. Walkthrough uses simplified wall/furniture collision boxes and follows a fixed eye level on the selected floor rather than stair physics.

## Verification

`npm test` runs project, planning, design, presentation, workbench and API checks. `npm run check` verifies script syntax and packaged/offline assets. `npm run test:browser` includes the original tool workflows and Studio+ interactions; `ENHANCEMENTS_ONLY=1` runs the focused Studio+ browser checks. CI runs the browser suite in Chromium, Firefox and WebKit.
