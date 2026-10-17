# Professional workbench delivery

Open **Pro** in the header, or find the same workflows under **Tools** / **Ctrl/Command K**. The 42 requested items below share 30 workflow dialogs. Existing Layout checks/compliance targets, Vastu, converter and other widgets remain under **Widgets**. All model edits use the existing snapshot/undo system, project JSON and ZIP format.

| # | Requested improvement | Delivered workflow |
|---|---|---|
| 1 | Contextual actions | Selection toolbar with room, furniture, wall and opening actions. |
| 2 | Direct 3D editing | Pick visible geometry; move rooms/furniture/openings/walls and professional objects, resize rooms/furniture/openings; release to validate and commit. Locked objects and stale edits are rejected. |
| 3 | Wall-face editing | Move a single face with the opposite fixed, move centreline, or set centre-preserving thickness; preview first. |
| 4 | Constraint diagnostics | Missing references, competing controls, cycles and locks; highlight affected objects and remove controlling rules. |
| 5 | Irregular sites | Native polygon boundary, inward setback envelope, changed-room enforcement and auto-builder packing against the actual envelope. |
| 6 | Browser/device regression | Chromium, Firefox and WebKit CI matrix, desktop/mobile viewport and touch smoke; physical devices remain a separate manual check. |
| 7 | Hosted collaboration | Authenticated service, HTTPS Docker/Caddy deployment, private token provisioning, health checks and checksum backup/restore. Deployment requires the chosen host/domain. |
| 8 | Wall assemblies | Layer thickness/material/rate/waste, assignment to physical walls and net material takeoff with opening deductions. |
| 9 | Door/window types | Shared dimensions with propagation and per-instance overrides; native opening edits preserve overrides. |
| 10 | Advanced stairs | Straight, L, U and winder tread geometry with landings, walkline sizes and headroom coordination findings. |
| 11 | Furniture optimization | Three deterministic arrangements, room fit, furniture spacing, door swing and circulation checks; reviewed application. |
| 12 | Design alternatives | Named full-project snapshots, object comparison and snapshot-before-switch. |
| 13 | Service coordination | Elevated 3D routes/risers; service-service, wall and slab proximity/intersection findings. |
| 14 | Richer IFC | IFC2X3 walls with physical openings/void/fill relationships, doors/windows, spaces, slabs with holes, roofs, furniture proxies, interior fixtures, columns/beams, material layers, properties and stable GUIDs. |
| 15 | Construction details | Dimensioned SVG coordination sheets for layered walls, openings, stairs, wetrooms and balcony/parapet concepts, plus existing composed sheets. |
| 16 | Client presentation | Named-view camera interpolation to native browser video, 2048×1024 panoramic PNG, room labels and day/night lighting. Existing presentation package remains available. |
| 17 | Procurement | Waste, pack rounding, order quantities, supplier/rate quotes and CSV. |
| 18 | Cutting optimization | Guillotine stock allocation with kerf, reusable offcuts and diagrams; tile-cut/waste preview. |
| 19 | Vector PDF import | Local PDF worker, page selection/rendering, path/text extraction, reviewed segment selection and calibration. |
| 20 | Scanned-plan assistance | Local image line detection, English OCR, reviewed labels/opening gaps and optional closed-room recognition. |
| 21 | Building datums | Per-floor elevations/heights, basement elevations, room level offsets; 3D, IFC, quantities, elevations and sections use datums. |
| 22 | Slab/ceiling voids | Polygon vertical spans, double-height openings and physical floor/slab holes. |
| 23 | Structural coordination | Grid columns/beams, alignment checks and individual column/beam/slab entry, with 2D/3D and IFC. |
| 24 | Ramps | Rise/slope/run driven switchback flights with landings, geometry preview and 3D inclined surfaces. |
| 25 | Lifts/shafts | Multi-floor lift/service shafts, slab cuts and lift-front door clearances. |
| 26 | Bathroom planning | Parametric toilet/basin/shower layouts with editable dimensions, circulation and door-clearance findings. |
| 27 | Kitchen planning | Cabinet/appliance modules, editable dimensions, work fronts and fit/swing checks. |
| 28 | Custom furniture | Embedded GLB2 catalog/import with local bounds, file/vertex/resource budgets and placement. |
| 29 | Linked assemblies | Reusable native object/opening definitions, linked instances and atomic propagation retaining member IDs. |
| 30 | Facade tools | Opening sill/head/width/centre alignment preview and editable balcony rail height. |
| 31 | Outdoor/site design | Compound wall and gate strips, paths, gardens, tank/sunshade/rail polygons in plan and 3D. |
| 32 | Terrain | Survey points, inverse-distance interpolated 3D terrain and grid-sampled cut/fill quantities. |
| 33 | Rainwater | Entered rainfall/efficiency/tank/demand/pipe capacity calculations, downpipe count, gutter/downpipe visualization. |
| 34 | Solar planning | Roof-contained panel packing, entered tilt/power/sun-hours/losses, obstacle shadows, capacity and estimated yield. |
| 35 | 3D measurement | Surface/near-vertex point picking, distance/horizontal/vertical values and persisted labels/lines. |
| 36 | Section/isolation | Six-plane 3D box, selection isolation and restoration. |
| 37 | Review issues | Anchors, screenshot, assignee, priority, due date and status; scoped shared-link creation and editor-only status updates. |
| 38 | Shared markup | Arrow, pen and measured annotations in project and review viewer, stored through permission-checked APIs. |
| 39 | Custom properties | Typed definitions/values for native and professional objects, searchable in property workflow/explorer and exported IFC properties. |
| 40 | Offline queue | IndexedDB jobs scoped by server/account/project, retry on reconnect, revision CAS, retained conflicts, export and recovery choices. |
| 41 | Action macros | Record supported object operations, parameterized move/resize/rotate/property actions, preview and atomic replay. Unsupported recording operations are reported. |
| 42 | Accessibility/language | English/Hindi/Odia common controls and professional tool labels, text scaling, blue/orange palette and remappable workflow/view/measurement shortcuts. |

## Integration and preservation

New data lives under `design.workbench`, with defaults for old files. Floor-copy includes datums, structure, routes, room fitouts, properties and opening-type links; undo restores them together. Room templates carry GLB catalog data, fitouts, finish/tile metadata and per-member custom values. Moving/transforming rooms keeps their owned fitouts attached. Deleting rooms prunes owned fitouts. Repeated 3D rebuilds dispose owned geometry/material/texture resources; imported source models use a bounded template cache.

Model/API validation runs both in browser imports and service saves. PDF/OCR workers and their data are local, included in offline assets, and loaded on demand. No import sends drawings to a third-party OCR endpoint. See [vendor provenance](vendor/README.md).

## Practical limits

These are architectural planning and coordination tools. Structural members, lift/ramp/stair clearances, water/solar estimates and detail sheets use the entered dimensions and assumptions; they do not replace structural fabrication calculations, weather simulation or jurisdiction-specific approval rules. Existing compliance targets and Vastu guidance keep their previous scope.

Furniture search and guillotine cutting are heuristics, not proofs of a global optimum. Terrain volumes depend on sample density. Solar shadows approximate entered obstructions and sun direction; yield uses entered sun-hours/losses. Rainwater capacity uses entered intensity and pipe capacity. Tank sizing is calculated; an optional tank volume can be drawn in Outdoor design.

Review PDF/scan extraction before application; raster detection targets predominantly orthogonal wall runs and OCR is English. PDF curves are approximated by segments. GLB imports accept embedded resources only, with a 3 MB per-file limit and a combined project budget; imported IFC furniture is a bounding proxy. IFC does not promise a complete authoring-tool BIM round trip for custom meshes, services or ramps.

Video depends on browser capture/encoder support. Unsupported browsers display an actionable message; panorama and existing presentation exports still work. Common controls and tool names are translated; technical notes and user-authored content retain their original text. No hosting account/domain was provided, so the service deployment is prepared and tested locally, not provisioned on an external host.

## Validation

```sh
npm ci
npm test
npm run check
npm run test:benchmark
npx playwright install --with-deps chromium firefox webkit
BROWSER_ENGINE=chromium npm run test:browser
BROWSER_ENGINE=firefox BROWSER_HEADFUL=1 xvfb-run -a npm run test:browser
BROWSER_ENGINE=webkit npm run test:browser
pip install ifcopenshell==0.9.0.post1
python tests/ifc-roundtrip.py
```

The full browser runner includes the original editor/planning/design regression, professional workflows, portable floor/template metadata, actual offline replay/CAS conflict recovery and shared review APIs. Focused modes are `PLANNING_ONLY`, `DESIGN_ONLY`, `WORKBENCH_ONLY` and `INTEGRATION_ONLY`. CI executes the complete runner for each engine. IFC validation independently checks schema, GUID uniqueness and every represented solid for all four roof types.

For service setup and backups see [deployment guide](deployment/README.md).
