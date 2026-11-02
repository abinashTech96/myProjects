# Realistic 4D presentation

Open **4D → Render 4D → 4D Studio → Realism → Apply balanced realism**.
The controls are project settings and survive JSON save/import and undo/redo.
Existing files default to realism off, preserving their presentation. Plot, room,
opening, stair and floor dimensions are never rewritten by these services.
The original Environment, Materials, Photo, Compare, Clearances and Stages tools
remain available. Seven compact tabs now use two rows.

## Lighting and surfaces

- Room-aware ambient light reduces the global fill/rim and environment response
  inside enclosed rooms. Exterior windows contribute to a bounded daylight factor;
  windows facing another room do not. This is a visual approximation, not a
  daylight/energy calculation or real-time global illumination.
- Exposure adapts smoothly toward the interior/exterior target. The existing
  exposure control remains the base value. Still refinement freezes adaptation.
- Physical material dimensions specify tile side, plank width/length and brick
  width/course height in inches. Procedural repeats account for the number of
  tiles/planks/bricks in each texture. Floor/wall/ceiling UVs use a shared plan
  origin, respecting saved finish scale, rotation and alignment origins.
- Native floors also receive the calibrated procedural material. Imported meshes
  and authored furniture keep their UV layout. Up to 500,000 architectural
  vertices receive independent projected buffers; individual meshes above 60,000
  vertices retain their original UVs. Source/editor geometry is not modified.
- Fine surface detail uses neutral color modulation, linear normal/roughness maps
  and a strength setting. Default painted walls receive restrained microtexture.
  Added texture copies use the existing device texture-residency budget.
- Fine contact shading uses a smaller AO radius and lower sun shadow normal bias.
  Existing adaptive navigation still suspends AO, and Eco keeps it off.

## Architectural detail, reflection and glass

Architectural trim adds bounded beveled strips, door thresholds, window seals
and exterior wall-head coping. New trim is prepared asynchronously and keeps the
existing strip budget. Detailing can be switched off independently. Parametric
stairs use a 4D-only stepped shell with internal shared faces removed, preserving
the exact tread polygons and entered rise. Older unparameterized stairs retain
their original geometry. Disabling realism restores the original owned meshes.

Local reflections cache one probe per room: at most two on Balanced and four on
High; Eco uses the efficient environment mode. Cached entries are keyed by nearby
geometry/finishes, openings, floors, light/environment settings, glass, clipping
and view context. Moving the camera within an unchanged room reuses its probe.
Changing the environment clears the cache; Refresh local reflections explicitly
clears it. Probes are approximations and do not provide recursive reflections.

Clear, frosted and tinted glazing build on the existing device-local Physical
glass setting. Movement uses an opacity preview and settled rendering restores
transmission. Enabling realism does not silently enable the more expensive device
setting. Disabling realism retains the device preference.

## Fixtures, landscape and walking

Warm (2700 K), neutral (4000 K), cool (6000 K) and a room switch update existing
fixtures in the selected room. Add fixtures through **Review → Lights**. Visible
fixture bodies use the configured color and direction. At most one nearby visible
fixture casts a 512px shadow on Balanced/High; motion and Eco suppress that shadow.
The existing nearest-light pool and master Room lights switch remain authoritative.

Natural garden mode adds bounded instanced lawn borders, taller small trees with
varied crown proportions and clustered shrubs. Placement continues to respect the
clipped lawn, door approaches, site exclusions and crown-clearance tests. Changes
are prepared offscreen in yielding batches and only current jobs are published.
Moving foliage continues to use the existing reduced instance count.

Walk assistance uses real floor bases and oriented parametric tread/landing
polygons. It follows nearby steps with smooth height changes and rejects a new
position when there is no supporting floor or an entered shaft/void. Existing wall
and furniture collision sliding remains in place. It is a presentation aid, not a
physics simulation or accessibility/code assessment. Unparameterized stairs do not
gain inferred stair elevations.

## Photoreal Still

Open **4D Studio → Photo → Photoreal Still**, or use the Realism shortcut. Choose
width, samples, light bounces and a time limit, then **Render photoreal still**.
This is a separate experimental CPU path tracer, not the raster still averaging
feature. It traces diffuse multi-bounce environmental light and direct sun/fixture
shadows, with approximate rough metallic reflections and thin glazing. Visible
geometry, transforms, instances, saved texture coordinates, cutout alpha, mirrors
and global section planes are included in its snapshot.

Only pressing the render button creates its one worker. It uses no external
service and uploads no project data. The worker has limits of 200,000 visible
triangles, 512 material variants, 64 sampled color textures, image dimensions up
to 960px, 1–128 samples, 1–6 bounces and a 2–60 second time limit. Geometry extraction
yields to input. Cancel, navigation, project edits, selection changes, panel close,
tab hiding, Pause, Stop and context recovery terminate the job. Completed output
can be downloaded as PNG. The interactive renderer remains available throughout.

Low samples are noisy. A time limit can leave a partial preview, with coverage
reported. Color textures are sampled at 64px; unavailable/tainted textures use
base color and are counted in the result. Animated/skinned scenes, oversized jobs
and worker errors explain the fallback to the existing **Use raster PNG** action.
This initial tracer does not reproduce normal maps, volumetrics, depth of field,
complex glass refraction or the full raster post-processing stack. It does not
claim parity with a production offline renderer.

The still worker and realism implementation stay behind the existing Render 4D
gate; the still worker is created only for an explicit still task. Offline
installation does not prefetch those runtime modules. After the modules have been
used online, the service worker can serve them from its normal runtime cache.

## Validation

`npm test`, `npm run check` and `npm run test:benchmark` cover the existing project
plus realism settings, physical repeat periods, floor context, exterior windows,
HDR half-float decoding, stepped-solid volume/winding and actual bounced light.
`REALISM_ONLY=1 npm run test:browser` covers UI entry, source UV ownership, physical
scale changes, trim/seals/coping, garden borders, exposure, reflection reuse,
physical-glass motion previews, light switches/shadow bounds, stair support,
worker completion/cancellation, raster fallback and dimension preservation.
The complete browser runner includes this suite alongside all existing suites in
Chromium, Firefox and WebKit CI. Exterior, bedroom, bathroom, stair and still
screenshots are written to /tmp for visual review and failed-run artifact capture.

Actual speed and acceptable still resolution must be checked on the user's own
device; software-rendered browser tests do not establish a device FPS guarantee.
