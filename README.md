# ArchCAD Pro

A static floor-plan workspace with a shared-wall model, live Three.js preview, floor management, furniture editing, drawing sheets, and optional AI-assisted changes.

## Run

Serve this folder over HTTP, for example `python -m http.server 8000`, then open `http://localhost:8000`. The site can be published directly through GitHub Pages. No frontend build is required. Three.js r128 and its matching helpers are bundled locally under `vendor/three` with their license. A service worker caches the application after its first successful HTTP load. Keep the files and folders together.

## Workspace

- **2D / Split / 3D** choose the working view. Narrow screens show one canvas at a time; choose 3D to switch to its canvas.
- The left catalog supports search, dragging and click-to-place. Every placement path uses the same dimensions.
- Select an element to edit its geometry, appearance, openings, wall thickness or distance constraints in Properties. Geometry, opening and wall-thickness fields in Properties use the selected display unit. Feet/inches accepts fractional values such as `10' 6 1/2"`; the model stores inches.
- Ctrl/Command-click toggles multiple selections. Shift-drag a box to select enclosed elements. Use Align, Distribute, Group and Ungroup in Properties.
- Drag a corner handle to resize. Arrow keys move a selection by 1 inch, or 12 with Shift. Ctrl/Command-Z undoes; Ctrl/Command-Shift-Z redoes. Ctrl/Command-D duplicates.
- Space-drag pans the drawing. Scroll or pinch zooms it. Shortcuts shows the complete list.
- **Project** controls plot size, offsets, units, orientation, project details and wall defaults. Changing display units preserves physical dimensions. Feet/inches accepts values such as `10' 6"`.
- **Room Studio** edits the selected room's furniture in a sandbox. Save to Plan applies the changes as one undoable action; Discard leaves the plan unchanged. Its keyboard shortcuts are isolated from the background plan.
- **Layout checks** lists boundary/overlap issues and the configured room rules. Click a geometry warning to select its element. Vastu guidance follows the selected compass orientation and active floor. The score averages applicable kitchen, puja, toilet and explicitly marked master-bedroom checks. Empty or unsupported floors show Not evaluated. Column markers are schematic symbols.

## Planning tools

The default workspace has compact **Layout checks**, **Vastu**, **Floor area** and **Unit converter** cards. **Widgets** controls visibility and optional measurement, selection, navigation and shortcut cards. Choices, favourites and panel sizes persist on the current device. Asset scrolling is independent of the grouped tool buttons. **Tools** opens Build, Inspect, Utilities and View; **Ctrl/Command K** searches tools and rooms.

- **Build:** polygon rooms, connected walls, wall split/join, the opening editor, calibrated image tracing, room templates and stair design. Click plan points to draw; Enter finishes and Escape cancels. Editing a selected room dimension label opens an input; polygon vertices can also be entered numerically. Wall faces, endpoints, midpoints, perpendicular directions and grid spacing are controlled in Snapping.
- **Inspect:** clear-area rules, exterior-window area, access and door-route checks, directional preferences, furniture/door clearances, editable dimension chains and floor overlays. Every warning identifies its room and floor. Rules are editable design targets; no local regulatory rule pack is supplied.
- **Utilities:** length/area conversions, labeled measurements, notes/callouts/clouds, electrical symbols/circuits, plumbing routes/shafts, material quantities and cost CSV, project library and coordinated drawing sets.
- **View:** layers, saved plan views, widget preferences, rendering quality and mesh diagnostics. Hidden layers are omitted from drawing exports. Layer locks protect model editing, grouping, placement and drawing operations.

**Auto-builder** stages up to three alternatives using room requirements, selected floors and per-floor BHK/empty presets. Locked/selected rooms and their openings stay fixed. Drawn walls and shafts constrain new placement; attached toilets are placed with their bedroom and shared doorway. Preview warnings, areas and directional scores before Apply. A project change invalidates a stale preview. Application is one undoable operation; impossible requirements produce a specific conflict without replacing the plan. Manage floors from the same dialog, including complete copies of planning objects.

**Room templates** preserve room geometry, contained furniture and openings. **Project library** saves complete local projects with generated thumbnails, tags and search. Opening a saved project first creates a recovery snapshot. Download JSON to transfer projects between devices.

The current project format remains 2.0 and gains a validated `planning` section for walls, measurements, annotations, electrical/plumbing routes, raster underlays, layers, rules and cost settings. Old projects receive defaults. History, JSON, autosave and recovery all retain this section. Underlays support PNG/JPEG/WebP below 3 MB with two-point calibration.

**Drawing sets** combine plans, projected wall elevations, a section through a selected Y coordinate, schedules and a legend. SVG/PNG/PDF and DXF include the corresponding planning annotations and services; GLB includes polygon floors, arbitrary walls and actual opening cuts. DXF raster underlays are intentionally excluded; use drawing sheets for image tracing output.

**Offline:** after cache installation, the core editor, bundled 3D controls, JSON and drawing/model exports are available offline. Project data and AI requests are never placed in the application cache. Optional remote textures and a configured AI service require network access. Performance shows cache status and a refresh action.

See [FEATURE_COVERAGE.md](FEATURE_COVERAGE.md) for the requested-feature checklist and analysis limits. Polygon clear areas use an external-wall inset; complex concave offsets can be unsupported. Stair fit is calculated, while overhead headroom needs section review. Auto-builder alternatives are deterministic candidates requiring review, rather than guarantees of circulation or directional scores.

## Geometry conventions

Room `x`, `y`, `w` and `h` define **wall-centerline bounds**, in inches. Rectangular rooms remain axis aligned; polygon rooms also store local `points` within those bounds. Shared coincident edges become one wall, including partial shared edges. Default outside walls are 9 inches and shared walls 4.5 inches; both are editable, as is an individual wall segment. Properties shows clear interior dimensions after half the adjoining wall thicknesses are deducted. Legacy room coordinates are preserved when imported; the new centerline convention can alter the clear interior readout compared with older visual wall borders.

Openings belong to a room edge, with an offset from that edge's top/left start. They have editable width, height and sill. The 3D wall model leaves actual openings. Polygon openings refer to `segment:N` edges, with offsets measured from that directed vertex. Rectangular openings use top/bottom/left/right. Polygon rooms rotate in 90-degree increments and share the same wall renderer/export path as rectangles; furniture also rotates in 90-degree increments. Stair stacks link corresponding staircases across floors without linking independent stairs on the same floor.

Distance constraints specify an X or Y offset between the top-left bounds of two elements. Constraints follow the reference element during edits. Cycles, duplicate target-axis constraints, locked constrained targets, invalid dimensions and out-of-bounds changed elements are rejected atomically. Imported legacy layouts may have existing boundary/overlap warnings so they can be repaired without discarding the file.

## Saving and recovery

**Save JSON** downloads a portable version 2.0 project. Open also accepts legacy project files. Validation finishes before an imported file replaces the current plan. Unsupported future versions and malformed geometry are rejected.

Autosave stores complete project snapshots in IndexedDB with a localStorage fallback. The status bar reports pending changes, completed saves and errors. A recovery copy is attempted when the page hides. Browser storage can be cleared by browser settings, so download JSON for a portable backup.

**Versions** keeps the latest 15 named snapshots on the current device. Restore first saves a recovery snapshot; Compare overlays added, removed and changed geometry and reports opening/planning changes. Versions, server credentials and the undo stack are excluded from portable project JSON. A new project or imported file does not delete the saved version list.

## Exports

Export offers current/all floors, dimensions, labels, openings, schematic columns, paper and drawing scale.

- **Drawing sheets / PDF** opens a print-ready window with a drawing and room schedule for each floor. Use the browser's Save as PDF and print at 100%/actual size for the chosen scale. Pick a larger paper or scale denominator if the drawing is too large. Room schedules show per-room areas; quantity dashboards use union totals to avoid overlap inflation.
- **PNG** produces standalone white-background drawings without the editor's zoom, pan, selection or CSS. All floors create one download per floor; a browser may require permission for multiple downloads.
- **DXF** uses separate named floor layers for walls, labels, dimensions and openings, and declares inches or centimeters in `$INSUNITS`. Dimensions are text annotations, not associative AutoCAD dimension entities.
- **GLB** exports the selected floor scope, including furniture colors and openings. The matching exporter is loaded on demand from the local bundle.

## AI configuration

The editor never requires a `secrets.js` file or provider key in frontend source. **AI assistant** supports an offline JSON action preview and an optional protected server connection. Nothing from a generated plan is applied until Review → Apply. Application is atomic and undoable; invalid actions, locked items, missing IDs, new overlaps and boundary violations reject the plan.

`api/ai-router.js` is a Node serverless route, **not a GitHub Pages backend**. Deploy it to a host that supports Node serverless functions and configure:

| Variable                                  | Value                                                              |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `ARCHCAD_ACCESS_TOKEN`                    | A private access token for this AI service                         |
| `ARCHCAD_ALLOWED_ORIGIN`                  | Exact editor origin, for example `https://abinashtech96.github.io` |
| `OPENAI_SECRET_KEY` / `GEMINI_SECRET_KEY` | Provider API key, stored only on the server                        |
| `OPENAI_MODEL` / `GEMINI_MODEL`           | A model available to that provider account                         |

Enter the HTTPS route URL, service access token and provider in the AI dialog. The connection is stored in the current tab's sessionStorage and is excluded from project exports. Provider requests have timeouts and propagate provider status codes. No provider account, endpoint or live paid request is configured by this repository.

Action format:

```json
{
  "actions": [
    {
      "action": "addRoom",
      "params": { "type": "bedroom", "x": 20, "y": 20, "w": 120, "h": 144 }
    }
  ]
}
```

Move/delete actions should use the stable string IDs in the project context. Legacy numeric IDs are resolved against the original plan before executing a list. Zone-based placement accepts `NE`, `NW`, `SE`, `SW`, or `CENTER` and uses the current compass.

## Development checks

Requires Node 22 or newer.

```sh
npm ci
npm test
npm run check
npx playwright install chromium
npm run test:browser
```

The browser regression suite serves the repository on a temporary local port and uses the **actual bundled Three.js renderer**. Matching npm files also fulfill any legacy CDN requests. Remote texture requests use a local test image. It exercises startup, history, modal isolation, units, floors, geometry, constraints, snapshots, AI review, exports and responsive layout. It does not make paid provider requests or certify architectural/structural rules.

Optional test environment variables: `BROWSER_EXECUTABLE` for an installed Chromium, `THREE_TEST_ROOT` for a matching local Three.js package, and `SCREENSHOT_PATH` for the desktop screenshot. Runtime screenshots are temporary test output and are not committed.

## Additional design workflows

The **Design** menu adds connected wall editing, room recognition, geometric constraints, requirements, sun/access/parking studies, finishes, tiles, composed sheets, portable ZIP/SVG/IFC files, presentations and project health tools. See [DESIGN_WORKFLOWS.md](DESIGN_WORKFLOWS.md) for every feature, verification commands and calculation limits.

Cloud projects, expiring read-only reviews, anchored comments, presence and conflict recovery use the optional authenticated Node service. This backend requires separate deployment and configuration; it is not hosted by GitHub Pages. Setup is documented in the workflow guide.
