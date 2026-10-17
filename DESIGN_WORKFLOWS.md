# Design workflows delivered in this batch

Open **Design** in the header or the grouped Build, Inspect, Utilities and View menus. Existing planning widgets, Vastu, converter, floor editing, versions, exports and AI review remain available.

## Geometry and editing

| Requested improvement | Implementation |
| --- | --- |
| Mixed wall thickness and polygon clear areas | Boolean subtraction of nearby wall solids from the actual polygon, including independent walls |
| Rotated furniture bounds | Turned footprints in boundary analysis and shared geometry |
| Usable area without overlap inflation | Polygon union for clear and bound floor totals; separate room sums |
| Protected underlays and floors | Unlock before individual underlay deletion or floor removal |
| Actual envelope entrances | Exterior doors tested against the union boundary; door-derived reachability |
| Room recognition and partition splitting | Preview bounded wall faces; apply room polygons while migrating openings |
| Stair headroom | Tread-height samples against ceiling zones and slab edges; linked upper landing warnings |
| Visible elevations | Nearest wall selected per projection interval; opening cuts and roof profile |
| Display units | Shared length parsing/formatting and a dialog adapter for legacy inch fields |
| Actionable checks | Object/floor focus, measured values, targets and geometry overlays |
| Connected wall edits and push/pull | Shared boundary owners move together along the wall normal |
| Trim, extend and intersections | Independent segment editing and intersection splitting |
| Offsets | Wall offsets and polygon outline offsets |
| Mirror and exact moves | Reviewed transformations with opening migration |
| Linear/radial arrays | Fresh object/opening IDs; preview before applying |
| Curved walls and arches | Quadratic wall tessellation and arched opening profiles shared with wall cuts |
| Geometric constraints | Equal length/dimension, parallel, perpendicular, coincident and fixed-angle; dependency ordering, cycle/conflict rejection |
| Temporary guides | Persistent construction lines with snapping |

## Analysis and generation

| Requested improvement | Implementation |
| --- | --- |
| Narrow passages | Local near-parallel clear-edge measurements |
| Furniture alternatives | Original and reflected arrangements checked against clear geometry, other furniture and door sectors |
| Privacy | Entrance-to-private-room sightline checks against walls and openings |
| Adjacency and private toilets | Required relationships and single private access checks |
| Wet-area stacks | Cross-floor overlapping wet-zone checks |
| Window obstruction | Neighbour proximity and exterior-window findings |
| Sun and shadows | Latitude, longitude, date, local hour, UTC offset and projected neighbour masses |
| Ventilation paths | Sampled potential paths between windows; highlighted for review |
| Parking | Circular vehicle sweep with 37 footprint samples, obstacles, plot limits and gate width |
| Accessibility | Width-inflated route obstacles; turning-circle checks at bends/endpoints; room-level transitions |
| Room brief | Dimensions, area, direction and relationships with mandatory/preferred/optional priorities |
| Circulation-first generation | Protected circulation strip and entrance reservation in brief generation |
| Alternatives and trade-offs | Requirements, reachability, privacy, exterior-window proxy and relative cost components, with explicit weights |
| Minimal repair | Preview local room corrections and selected-zone alternatives |
| Zone-only optimization | Repack selected unlocked rooms within their existing combined bounds |
| Requirements traceability | Satisfied/unmet requirements shown with each alternative |

## Drawings, schedules and usability

| Requested improvement | Implementation |
| --- | --- |
| Sheet composer | Saved A3/A4 layouts with plans, elevations, section segments, ceilings, schedule and legend |
| Arbitrary/stepped sections | User section polyline; each segment produces a coordinated viewport |
| Roof and drainage | Flat, gable, shed and hip geometry; rise, overhang and drainage direction |
| Reflected ceiling work | Ceiling zones with light/service references and a plan overlay |
| Finishes | Room floor, wall, ceiling and skirting assignments and CSV schedule |
| Tile planning | Dimensions, joints, rotation, clipped cuts and geometric offcut percentage |
| Opening schedule | Tags, size, sill, style, hinge, swing and arch rise; CSV |
| Revision quantities | Saved-version comparisons for quantities and costs |
| Service coordination | Segment intersections with other services and walls |
| Preflight | Missing tags, clipping/scale and basic sheet checks |
| Object explorer | Search and rename rooms, furniture, openings, walls and services; hide/lock metadata |
| Table and bulk editing | Room dimensions/levels, names/materials, opening sizes and grouping |
| Workspace presets | Planning, interiors, services, review and presentation presets |
| Context/touch actions | Context menu, long press and numeric movement; mobile header repaired |
| Health dashboard | Geometry/design findings and performance entry points |
| Trash/recovery | Deleted objects, templates and locally saved projects can be restored |
| Portable package | ZIP model, SVG drawings, schedules, IFC coordination model and embedded underlays; validated import |
| Guided lessons | Short interactive lessons with tool launch actions |
| DXF import | Units, scale, layer mapping and preview; unsupported entities/bulged polylines reported |
| SVG and IFC | Standalone SVG; schema-valid IFC2X3 gross wall solids and space identities |
| Presentations | Named camera viewpoints with notes and previous/next controls |
| Optional AI critique | Local critique plus existing protected AI service and before/after action preview |
| Performance/regression | Large-plan benchmark, repeated 3D resource checks, export round trips and browser/API tests |

## Project service and reviews

`server/server.cjs` supplies an optional authenticated single-instance backend. **It must be deployed and configured separately; GitHub Pages cannot run it.** The static editor works without it. Use **Design → Cloud projects** to enter its URL and a private user token.

- Owner/editor/viewer membership, explicit upload/open/push/pull and optional autosync.
- Revision compare-and-swap, local/remote visual conflict review, recovery snapshots and non-conflicting object merge.
- Presence and renewable 30-second object leases tied to both user identity and editing session.
- Expiring scoped read-only links and optional anchored comments in `review.html`.
- Revision history and recoverable remote project deletion.
- Private bearer tokens stay in sessionStorage and are excluded from portable project files. Share tokens are hashed on disk.

Requires Node 22+. For local development, configure independent random tokens of at least 24 characters (32 random bytes is preferable):

```sh
export ARCHCAD_USERS='{"<private-random-token-at-least-24-characters>":{"id":"owner"}}'
export ARCHCAD_DATA_DIR=/absolute/private/persistent/archcad-data
export ARCHCAD_ALLOWED_ORIGINS=https://abinashtech96.github.io
npm run server
```

The default listener is `127.0.0.1:8080`. Set `HOST`/`PORT` for your deployment. Put it behind HTTPS, use a persistent volume and back up the data directory. Configure each collaborator's token/identity on the server, then let the project owner grant membership in the UI. No provider credentials or real user tokens are committed.

The JSON file store is designed for **one server process**, not horizontally scaled replicas. Deploying this service, configuring accounts, backups and external AI providers remains an operator task. Comments and project revisions are persisted; live presence/leases expire in memory. Review links expire after 1–90 days. Deleting a project blocks review access.

## Calculation limits

These are planning tools. The UI reports sampling resolution and configured targets; these results are not building approval, engineering calculations or regulatory certification.

- Wall-face push/pull currently changes the connected wall centreline; independent face thickness extrusion is not a solid modeller operation.
- Room recognition handles closed planar wall loops. Partial shared-edge moves require vertex editing. Curves and arches use bounded tessellation.
- Furniture alternatives are reflections of the current arrangement, not a global furnishing optimizer. Narrow-passage and sightline checks are geometric heuristics.
- The route planner is a sampled 2D search; turning circles are sampled polygons. Levels default to zero until entered. Parking uses the user's circular sweep, not vehicle steering physics. Ventilation shows potential paths, not airflow simulation.
- Alternative scores use explicit geometric proxies. The exterior-window score is not a daylight illuminance model. Reserved circulation still needs valid door connections; warnings remain visible before Apply.
- Elevations suppress occluded wall intervals and include roof profiles. Decorative facade/parapet meshes and balcony rail details are not a fully dimensioned fabrication elevation. Stepped sections are separate coordinated segments, not a single unfolded continuous section.
- Ceiling zones and fixtures are coordinated overlays. Electrical and plumbing routes do not calculate loads, hydraulics or 3D penetrations. Clash detection is a plan-level intersection check.
- Tile waste measures geometric offcuts and does not optimize offcut reuse. Drawing preflight is a basic check, not a standards-complete publishing validator.
- IFC is a coordination export: gross wall solids and space identities. Detailed opening voids, furniture, finishes, material properties and parametric editability are retained in the native package rather than represented as full IFC building elements. Unsupported DXF entity types are excluded and listed.
- Browser regression exercises software rendering and responsive viewports. It does not substitute for real-device touch testing or days-long production sessions.

## Verification

```sh
npm ci
npm test
npm run check
npm run test:benchmark
npx playwright install chromium firefox webkit
npm run test:browser
BROWSER_ENGINE=firefox npm run test:browser
BROWSER_ENGINE=webkit npm run test:browser
```

`DESIGN_ONLY=1` runs the new workflow suite; the default also runs the original editor and planning regression. The browser suite uses the real bundled renderer, performs repeated rebuild resource checks, imports its own exported ZIP, and starts an isolated authenticated backend for review/comment/conflict tests. It does not contact paid AI providers. Optional IFC schema/geometry verification is `python tests/validate-ifc.py` with IfcOpenShell installed.

### Local verification record

- 37 model, router and real HTTP API tests passed.
- Complete Chromium editor/planning/design regression passed, including offline reload and mobile navigation.
- New backend browser tests passed: authenticated save, read-only review, anchored comments and competing revision recovery.
- A 500-room/2,000-wall benchmark completed quantities and analysis in approximately one second locally (hardware-dependent).
- Across 24 additional 3D rebuilds after warm-up, renderer resources remained at 164 geometries and one texture for the test fixture.
- Independent IfcOpenShell verification passed with zero schema issues and 24 readable wall solids across two storeys.
- Firefox and WebKit were attempted locally but are **not verified**: Firefox stalled at startup; WebKit requires host libraries whose installation was blocked by the environment. `BROWSER_ENGINE` supports both for a suitably provisioned host. CI continues to run the Chromium regression.
