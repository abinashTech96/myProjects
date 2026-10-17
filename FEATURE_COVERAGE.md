# Planning suite coverage

This checklist maps the approved suggestions to visible entry points. The existing editor, Room Studio, 3D workspace, AI review, history, recovery, versions and export actions remain available.

| Requested capability | Entry point and implementation |
|---|---|
| Restore compliance widget | Widgets → Compliance / layout checks; pinned warning card; current/all-floor results |
| Restore Vastu widget | Default pinned score; dedicated room breakdown; unsupported/empty floor shows Not evaluated |
| Correct Vastu scoring | Applicable-room average; explicit master-bedroom role; no cumulative bonus inflation |
| Restore converter | Default pinned card, Tools → Utilities → Unit converter |
| Fractions and units | Feet/inches, fractional inches, decimal feet, in/mm/cm/m; copy and apply to last geometry field |
| Area/regional converter | Sq ft, sq m, sq yd and named user-defined regional factor |
| Clear-dimension room checks | Room wall deductions, editable JSON rules, per-room targets and floor scope |
| Access/ventilation/route checks | Shared-door access; exterior window area; graph traversal to exterior doors; unsupported checks listed |
| Clickable warnings | Every result selects its room and floor |
| Live area dashboard | Pinned active-floor clear area; room/floor/building bounds and clear totals |
| Measurement list | Persistent labeled measurements; copy/delete; saved with project and exported |
| Selection widget | Count, dimensions, area, arrange/group actions |
| Camera/navigation | Compact fit/zoom controls, panel toggles, compass and saved views |
| Shortcuts widget | Optional pinned shortcut card and existing guide |
| Widget manager | Show/hide, compact cards, expand on click, remembered preferences, reset |
| Scrollbars | Shared dark track/thumb, platform fallback, contrast and keyboard scrolling |
| Assets/tools separation | Independently scrolling asset list with fixed grouped tools and favourites |
| Unified Auto-builder dialog | Native shared dialog; scrolling body and consistent controls |
| Floor management | Names, per-floor BHK/empty presets, add/remove/reorder and complete copy |
| Unit-aware Properties | Geometry and opening/thickness fields use display unit; internal coordinates remain inches |
| Resizable/collapsible panels | Pointer and keyboard resize; remembered widths and collapse choices |
| Active tools | Mode strip with cancel/finish, Measure/Section and snapping state |
| Command search | Ctrl/Command K; tools and room/floor selection |
| Polygon rooms | Numeric or click-to-trace vertices; L/angled forms, edit, rotate and scale |
| Wall drawing | Connected segments; arbitrary directions; numeric entry; split/join at shared endpoint |
| Editable dimensions | Selected room width/depth labels open dimension input; Tools → Inspect → Dimension chains edits linked room offsets as constraints |
| Snapping | Endpoints, midpoints, wall-face projections, perpendicular alignment and editable grid |
| Clearances | Furniture access bands and geometric door-sector collision warnings |
| Connectivity map | Door-derived graph, exterior entrances and unreachable rooms |
| Background tracing | Raster import, two-point scale calibration, opacity, lock and editable placement |
| Layer manager | Show/hide and locking for rooms/walls/furniture/dimensions/annotations/electrical/plumbing/underlay |
| Stair designer | Rise/riser/tread/landing/headroom inputs, calculated risers and footprint checks, preview and 3D steps |
| Opening editor | Polygon/shared-wall openings; width/height/sill/offset; hinge, swing and hinged/sliding/open styles |
| Floor comparison | XY-aligned floor overlay, including stairs and shafts |
| Room templates | Save/place room geometry, furniture and openings with fresh IDs |
| Auto-builder preview | Up to three packing/orientation alternatives; explicit Apply; stale preview rejection; atomic undo |
| Preserve fixed elements | Locked/selected rooms and openings retained; drawn walls and shafts constrain placement |
| Requirements | Bedroom/toilet counts, attached toilets, preferred bedroom dimensions, puja, setbacks and directional preference |
| Attached toilets | Packed with their bedroom and a shared access doorway |
| Alternative comparison | Warning count, clear area, directional score, preview and detailed conflicts |
| Failed generation | Specific room/floor/size conflict; original project is preserved |
| Selected floor generation | Only selected floors replaced; optional per-floor 1/2/3 BHK or empty layouts |
| Quantities | Wall length, opening-union deductions, paint faces and clear flooring areas |
| Costs | User rates, currency, wastage, per-floor totals and CSV |
| Electrical | Lights, switches, sockets, panels, labels and circuit references |
| Plumbing | Supply/drain routes, shafts and references |
| Annotations | Notes, callouts, revision clouds and sheet legend |
| Drawing set | Plans, projected elevations, a Y-coordinate section, opening/room schedules and legend |
| Visual versions | Added/removed/changed geometry overlay and separate opening/planning change indicators |
| Offline | Locally bundled Three.js helpers; versioned same-origin application cache and offline reload |
| Project library | Multiple local projects, generated thumbnails, tags, search and recovery snapshot before opening |
| Performance | Mesh/vertex/triangle/draw-call diagnostics and selectable rendering quality |

## Scope and interpretation

Layout rules are user-configured design checks. There is no jurisdiction-specific regulation preset or certification. Door-route detection does not certify emergency escape suitability. Window-area checks do not establish operable ventilation. Vastu is a built-in directional preference set, not a regulatory score.

Polygon room clear areas currently use a uniform external-wall inset; invalid concave offsets are reported as unsupported. Mixed-thickness polygon insets and local narrow passages require manual review. Room area totals count overlapping spaces individually. Free walls are independent construction segments and do not automatically split a room into new rooms.

Auto-builder uses deterministic packing alternatives. It preserves protected geometry and reports conflicts; it does not guarantee an optimal plan, connected circulation or a given Vastu score. Attached toilets share a doorway with their bedroom. Review all warnings before applying.

Stair fit checks evaluate the entered footprint, riser count and landing. Overhead headroom is stored and shown for section review; it is not automatically certified. Elevations are projections of wall outlines and can include internal walls. Electrical/plumbing tools store drawing routes and references; they do not calculate loads or hydraulic capacity.

Project library, templates, workspace preferences and versions are stored on the current browser/device. Download project JSON for portable backups. Underlays are embedded in project files and increase their size. Optional remote textures and configured AI services still require a network connection; core editing and exports work offline after the cache is installed.
