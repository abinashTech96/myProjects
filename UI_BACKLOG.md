# UI arrangement backlog

These changes were accepted for the backlog on 22 October 2026. All **23 items are implemented** in the consolidated footer/navigation release.

| ID | Accepted change | Expected behavior |
| --- | --- | --- |
| UI-001 | Transparent workspace-mode container | Remove the enclosing background, border, shadow and outer padding around 2D / Split / 3D / 4D. Keep individual compact buttons with a filled selected state and adequate touch targets. |
| UI-002 | Cross-shaped camera orientation controls | Put Top above, Left–ISO–Right across the middle and Front below. The enclosing container is fully transparent; individual buttons remain readable against the model. |
| UI-003 | Separate directional 2D pan pad | Arrange Up / Down / Left / Right around a central Fit action. Keep the meanings of plan panning and camera orientation distinct. |
| UI-004 | Appearance entry in the footer | Add a footer button that opens an appearance panel attached directly above the footer, while keeping the drawing visible. |
| UI-005 | Consolidated theme and spacing settings | Make the attached Appearance panel the primary home for theme previews and Compact / Comfortable control spacing. |
| UI-006 | More workspace appearance options | Include canvas backgrounds/contrast, grid visibility/intensity and drawing-label visibility/size in Appearance. Model materials remain element properties; lighting and rendering quality remain in rendering controls. |
| UI-007 | Predictable panel dismissal | Close Appearance on outside click or Escape, restore focus to its opener, and preserve the current drawing view and saved preferences. |
| UI-008 | Mobile footer-attached appearance sheet | Keep the panel attached to the footer on narrow screens, bound its height and allow internal scrolling so all settings remain reachable. |
| UI-009 | One Appearance workflow | Remove visible duplicate theme controls from other panels. Legacy callable aliases route to footer Appearance and use the same saved preferences. |
| UI-010 | Compact header arrangement | Keep file/history actions left, transparent modes centered, and the current-floor selector right. |
| UI-011 | Stable left tool rail | Place Build, Objects, Tools, Widgets and the remaining workspace tools on a slim rail. Enabled widget icons occupy its scrollable lower section. |
| UI-012 | Consolidated floor selector | Replace the visible G / floor-tab row plus Floors button with one current-floor selector, preserving floor-management actions. |
| UI-013 | One footer zoom control | Keep minus, percentage/reset and plus together in the footer; remove duplicate zoom readouts. |
| UI-014 | Pinned or temporary panels | Allow Build and Properties to be pinned. Temporary panels dismiss on canvas interaction without clearing the current selection. |
| UI-015 | Fit the usable canvas | Frame models in the unobstructed portion of the viewport when floating panels are open. |
| UI-016 | Smooth hold-to-pan | Clicking moves one step; holding continues smoothly; Shift provides larger movements. |
| UI-017 | Remember layouts per mode | Preserve separate drafting, modeling and presentation panel choices and split proportions. |
| UI-018 | Stable positions, relevant tools | Keep navigation and tool access in predictable locations while showing the controls relevant to the active mode. |
| UI-019 | Restore layout | Offer a reset in Appearance to recover the default panel arrangement. |
| UI-020 | Compact 4D launcher | A small icon + 4D control opens the bounded advanced panel; the collapsed launcher has no panel-sized wrapper. |
| UI-021 | Footer Sunlight presets | A footer icon opens 0%, 25%, 50%, 75% and 100% direct-sun brightness choices. Ambient light remains available at 0%. |
| UI-022 | Custom scrollable sunlight strength | Provide range and numeric controls, mouse-wheel adjustment and a link to sun position/date/time. Persist brightness in project history/import/export. |
| UI-023 | Theme cleanup | Keep all workspace theme controls in footer Appearance and remove duplicate visible theme controls from Studio+ and View tools. |

All existing editing tools remain available. Workspace controls preserve model geometry; sunlight strength is an undoable project setting. Usage and persistence details are documented in [the Studio+ guide](STUDIO_PLUS.md#footer-controls-and-workspace-layout).
