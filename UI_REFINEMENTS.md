# Workspace contrast and UI refinement release

This release addresses the supplied screenshots and adds **37 further UI/usability improvements**. Open ✦ → Theme & spacing for the four visual previews and the Compact / Comfortable spacing preference. All original planning workflows and the eighteen Studio+ tools remain available.

## Screenshot fixes

| Area | Result |
| --- | --- |
| Theme identity | Graphite uses charcoal/blue, Pearl uses paper/slate, Ocean uses teal/mint, and Sand uses warm paper/bronze. Legacy panel variables use the same theme tokens. |
| Canvas separation | Every theme has a separate 2D drafting surface, 3D model stage and 4D presentation backdrop: twelve canvas palettes. Model materials remain project settings. |
| Model visibility | Pearl and Sand use darker neutral model stages so pale walls are distinct from the background. 4D converts the backdrop to linear color before its gamma pass. |
| Button shadows | Small controls use crisp borders instead of a shadow around every button. Containers retain a light raised edge. |
| Mode switch | 2D / Split / 3D / 4D share one themed segmented control with a filled active state. The black surround is removed in light themes. |
| Plan navigation | Zoom is grouped separately from object/pan and fit actions; the bar uses smaller gaps and no nested heavy shadows. |
| Viewport toolbar | Orbit, Walk, Fit, Views, Render and More use one compact surface with consistent control heights. |
| Orientation controls | The large floating cross becomes a narrow orientation strip with a clear current view. |
| 4D panel | A narrower panel, tighter fields and button grids, restrained shadow and bounded internal scrolling leave more model visible. |
| Floor tabs and grid | Floor tabs follow the chosen theme and the 3D grid uses lower opacity and a theme-specific color. |

## Thirty-seven additional improvements

| # | Improvement | Implementation |
| --- | --- | --- |
| 1 | Theme preview cards | Four cards show 2D, 3D, 4D and accent swatches before choosing. |
| 2 | Selected-theme feedback | Cards announce and display the chosen theme with `aria-pressed`. |
| 3 | Saved control spacing | Compact / Comfortable persists on the device independently of project geometry. |
| 4 | Larger touch targets | Coarse-pointer controls retain a minimum 40px height. |
| 5 | Keyboard mode switching | Arrow keys and Home/End move between workspace modes from the mode selector. |
| 6 | Keyboard toolbar navigation | Arrow keys and Home/End move focus through plan, viewport and orientation tools without moving room geometry. |
| 7 | Accessible split separator | The divider has an accessible name, orientation, range and current plan/model proportion. |
| 8 | Keyboard pane resizing | Arrows adjust the split by 5%, Shift by 10%, Home/End choose the supported bounds. |
| 9 | Pointer pane resizing | Pointer capture supports mouse, pen and touch drags, including cancellation. |
| 10 | Split reset | Double-click the divider to restore equal panes. |
| 11 | Full-width view restoration | Leaving Split or linked view removes temporary pane sizing. |
| 12 | Live zoom percentage | The navigation bar shows the current plan zoom. |
| 13 | One-click zoom reset | Click the zoom percentage to return to 100%. |
| 14 | Zoom boundary feedback | Zoom-in/out disable at their supported limits. |
| 15 | Selection-fit guidance | Fit selection disables when no element on the current floor is selected, with an explanatory tooltip. |
| 16 | Asset-search recovery | Empty results explain the state and provide Clear search. Whitespace-only queries behave as empty queries. |
| 17 | Unit-aware asset sizes | Catalog dimensions and tooltips follow inches, centimeters or feet/inches. |
| 18 | Empty-model guidance | The model canvas offers a contextual Add a room action when there are no rooms. |
| 19 | Native-control themes | Browser-native form controls use the corresponding light/dark color scheme. |
| 20 | Theme-aware keyboard focus | Focus rings use the active theme accent on buttons, fields and separators. |
| 21 | Stable disabled controls | Disabled controls use muted contrast and do not jump on hover. |
| 22 | Consistent destructive actions | Delete/reset actions use a readable danger foreground and background in both light and dark themes. |
| 23 | Sticky dialog title | Long dialogs keep their heading and Close control visible while scrolling. |
| 24 | Named dialogs | Dialogs associate their accessible name with the visible title. |
| 25 | Hidden-anchor handling | Popovers avoid positioning against zero-size hidden controls. |
| 26 | Keyboard-aware popup bounds | Popovers clamp to the visual viewport and reposition as the on-screen keyboard changes available space. |
| 27 | Contained wide content | Wide dialog content can scroll horizontally without widening the page. |
| 28 | Readable table surfaces | Dialog tables use theme-aware text, borders and header backgrounds with aligned numeric glyphs. |
| 29 | Sticky panel headings | Build and Properties retain their heading and Close button while scrolling. |
| 30 | Predictable panel scrolling | Scrollbars follow the theme and scrollable panels contain overscroll. |
| 31 | Clearer error feedback | Error toasts use a theme-aware danger treatment and announce as alerts. |
| 32 | Motion/contrast preferences | Reduced-motion disables UI transitions/animations; forced-color mode retains borders and selected-state outlines. |
| 33 | Clean drafting boundaries | Plot fills and edges use drafting tokens and the blurred neon filter is removed. |
| 34 | Readable road/badge labels | White labels remain readable on dark roads and corner badges in light themes. |
| 35 | Visible plan selection | Selected room outlines use the theme's selection color, including light drafting canvases. |
| 36 | Crisp drawing annotations | Dimension/compass text uses a restrained canvas-colored halo in place of dark drop shadows. |
| 37 | Accessible section handles | Section-box handles stay inside the viewport, avoid floating panels, and remain stable while dragged. |

## Verification

`POLISH_ONLY=1 npm run test:browser` exercises theme contrast, twelve canvas palettes, actual 3D/4D framebuffer colors, geometry preservation, density, keyboard modes, divider dragging/resizing, zoom limits/reset, catalog recovery/units, reduced motion and responsive dialogs. Screenshots cover all four themes in 2D, 3D and 4D plus narrow and short viewports. The normal browser suite runs these checks alongside the original tool workflows and Studio+ regression checks.

`npm test` covers the portable models and APIs; `npm run check` verifies JavaScript, local assets, the offline manifest and bundled renderer integrity. CI additionally runs Chromium, Firefox and WebKit.
