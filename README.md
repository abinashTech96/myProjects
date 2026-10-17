# ArchCAD Pro

A static floor-plan workspace with a shared-wall model, live Three.js preview, floor management, furniture editing, drawing sheets, and optional AI-assisted changes.

## Run

Serve this folder over HTTP, for example `python -m http.server 8000`, then open `http://localhost:8000`. The site can be published directly through GitHub Pages. No frontend build is required. Three.js r128 and its matching helpers load from pinned CDN URLs; an internet connection is required for those assets on the first load. Keep the files and folders together.

## Workspace

- **2D / Split / 3D** choose the working view. Narrow screens show one canvas at a time; choose 3D to switch to its canvas.
- The left catalog supports search, dragging and click-to-place. Every placement path uses the same dimensions.
- Select an element to edit its geometry, appearance, openings, wall thickness or distance constraints in Properties. Measurements in Properties are inches, including fractional inches.
- Ctrl/Command-click toggles multiple selections. Shift-drag a box to select enclosed elements. Use Align, Distribute, Group and Ungroup in Properties.
- Drag a corner handle to resize. Arrow keys move a selection by 1 inch, or 12 with Shift. Ctrl/Command-Z undoes; Ctrl/Command-Shift-Z redoes. Ctrl/Command-D duplicates.
- Space-drag pans the drawing. Scroll or pinch zooms it. Shortcuts shows the complete list.
- **Project** controls plot size, offsets, units, orientation, project details and wall defaults. Changing display units preserves physical dimensions. Feet/inches accepts values such as `10' 6"`.
- **Room Studio** edits the selected room's furniture in a sandbox. Save to Plan applies the changes as one undoable action; Discard leaves the plan unchanged. Its keyboard shortcuts are isolated from the background plan.
- **Layout checks** lists boundary/overlap issues and the configured room rules. Click a geometry warning to select its element. Vastu guidance follows the selected compass orientation and active floor. Column markers are schematic symbols.

## Geometry conventions

Room `x`, `y`, `w` and `h` define axis-aligned **wall-centerline bounds**, in inches. Shared coincident edges become one wall, including partial shared edges. Default outside walls are 9 inches and shared walls 4.5 inches; both are editable, as is an individual wall segment. Properties shows clear interior dimensions after half the adjoining wall thicknesses are deducted. Legacy room coordinates are preserved when imported; the new centerline convention can alter the clear interior readout compared with older visual wall borders.

Openings belong to a room edge, with an offset from that edge's top/left start. They have editable width, height and sill. The 3D wall model leaves actual openings. Room rectangles remain axis-aligned; furniture rotates in 90-degree increments. Stair stacks link corresponding staircases across floors without linking independent stairs on the same floor.

Distance constraints specify an X or Y offset between the top-left bounds of two elements. Constraints follow the reference element during edits. Cycles, duplicate target-axis constraints, locked constrained targets, invalid dimensions and out-of-bounds changed elements are rejected atomically. Imported legacy layouts may have existing boundary/overlap warnings so they can be repaired without discarding the file.

## Saving and recovery

**Save JSON** downloads a portable version 2.0 project. Open also accepts legacy project files. Validation finishes before an imported file replaces the current plan. Unsupported future versions and malformed geometry are rejected.

Autosave stores complete project snapshots in IndexedDB with a localStorage fallback. The status bar reports pending changes, completed saves and errors. A recovery copy is attempted when the page hides. Browser storage can be cleared by browser settings, so download JSON for a portable backup.

**Versions** keeps the latest 15 named snapshots on the current device. Restore first saves a recovery snapshot; Compare lists added, removed and changed elements. Versions, server credentials and the undo stack are excluded from portable project JSON. A new project or imported file does not delete the saved version list.

## Exports

Export offers current/all floors, dimensions, labels, openings, schematic columns, paper and drawing scale.

- **Drawing sheets / PDF** opens a print-ready window with a drawing and room schedule for each floor. Use the browser's Save as PDF and print at 100%/actual size for the chosen scale. Pick a larger paper or scale denominator if the drawing is too large. Schedules report the sum of room bounds and clear area; overlapping rooms are counted separately.
- **PNG** produces standalone white-background drawings without the editor's zoom, pan, selection or CSS. All floors create one download per floor; a browser may require permission for multiple downloads.
- **DXF** uses separate named floor layers for walls, labels, dimensions and openings, and declares inches or centimeters in `$INSUNITS`. Dimensions are text annotations, not associative AutoCAD dimension entities.
- **GLB** exports the selected floor scope, including furniture colors and openings. The exporter is loaded on demand from the matching Three.js CDN version.

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

The browser regression suite serves the repository on a temporary local port and uses the **actual pinned Three.js package** to fulfill CDN script requests. Remote texture requests use a local test image. It exercises startup, history, modal isolation, units, floors, geometry, constraints, snapshots, AI review, exports and responsive layout. It does not make paid provider requests or certify architectural/structural rules.

Optional test environment variables: `BROWSER_EXECUTABLE` for an installed Chromium, `THREE_TEST_ROOT` for a matching local Three.js package, and `SCREENSHOT_PATH` for the desktop screenshot. Runtime screenshots are temporary test output and are not committed.
