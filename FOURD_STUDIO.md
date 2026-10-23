# 4D Studio

Choose **4D**, open its compact **4D** launcher, then choose **4D Studio**. Six tabs share the existing searchable workspace dock's compact forms, themes, scrolling and keyboard focus. Architectural edits, Properties, widgets and Studio+ remain available.

| Tab | Available controls |
| --- | --- |
| Environment | Linear HDR studio, overcast, sunset and night environments; intensity and rotation; optional visible sky; embedded Radiance `.hdr` import; local room reflections; wall mirrors; automatic detail; clean selection. |
| Materials | Brick, stone, concrete, timber, fabric, glass, brushed metal and mirror finishes. Apply separately to floor/furniture, walls or ceilings. Detailed Finishes retains tint, scale, rotation and roughness. |
| Photo | Current-view lens or 24/35/50/85mm; straight verticals; camera height; idle still refinement; 4–64 samples; photographic depth of field, focus and aperture; PNG capture. |
| Compare | Synchronized side-by-side current design and a saved alternative. Save alternatives through the existing Options workflow. The alternative is a read-only scene compiled from its saved project, without swapping the editable project or its history. |
| Clearances | Existing furniture/door/passage checks displayed as collision and potential narrow-passage overlays. Select a finding to focus its elements. |
| Stages | Rename up to twelve construction stages; assign selected rooms/furniture; scrub or play the staged reveal; adjust playback speed; restore the completed building. |

## Rendering and performance

The renderer remains independent of editable 3D resources. Color textures use sRGB; normal and roughness maps use linear data. Generated materials are deterministic procedural finishes. Metal and glass use environment reflections; actual wall mirrors use planar reflected geometry. Local room probes are prefiltered for rough surfaces and update after navigation or selection changes. They approximate surrounding reflections rather than tracing every ray.

HDR imports support Radiance RGBE, at most **4 MB** and **2048 × 1024**. The file is embedded in portable project data. Built-in environments contain floating-point HDR lighting; they are generated environments, not photographic HDR downloads. Keep “Show environment sky” off to retain the current theme background.

Still refinement averages jittered raster samples in two bounded render targets. It improves edge sampling and supports depth of field. It is **not path tracing, global-illumination convergence or a denoiser**. Navigation, project changes, resize and leaving 4D cancel refinement. Capture uses the completed refined frame when it is still valid. Interactive views retain their original fast rendering path.

Planar mirrors use 512px targets, with at most four mirrors and no recursive mirror chains. Local probes use a 128px cube. Existing resolution, shadow and adaptive-quality budgets still apply. Automatic detail replaces sufficiently small, dense distant furniture with dimensioned proxies, then restores original detail nearby. “Full detail” disables this substitution. Clean selection uses edge lines rather than changing selected materials' emissive colors.

Comparison renders both halves with the same camera/lens/environment and shared direct lighting; postprocessing is omitted to bound its cost. Architecture, floor/roof footprints, openings, stairs, structure, fitouts and services compile from the saved snapshot. Ramps, shafts and imported objects whose original GLB is no longer cached use dimensioned proxies; the panel reports their count. Comparison is a visual review, not an exact model-difference or clash-analysis engine.

## Persistence

Environments, embedded HDR, camera/photo preferences, detail/reflection settings, mirror definitions, construction-stage names/assignments and material assignments are saved with the project. Normal project history makes edits undoable. Stage playback position, clearance overlays, selection outlines and the active comparison are temporary view state. Stage playback does not alter architectural dimensions or saved element visibility. It is a presentation sequence, not a dated construction-management schedule.

Clearance checks are geometric review aids and do not certify building regulations. Existing 2D, Split and 3D behavior is preserved; 4D camera projection corrections do not change the editor's lens.

## Verification

`npm test`, `npm run check` and `npm run test:benchmark` cover portable settings, validation, material channels, phase classification, HDR size limits and existing model/API workflows. `FOURD_ONLY=1 npm run test:browser` exercises the six-tab dock, all eight material assignments, actual HDR import, mirror/probe targets, clean outlines, clearances, temporary stage filtering, near/far detail restoration, camera correction, depth-of-field refinement, PNG capture and comparison scene isolation with the bundled WebGL renderer.
