# UI arrangement backlog

These changes were accepted for the backlog on 22 October 2026. They are **pending implementation**; this document records the next design iteration, not shipped behavior.

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
| UI-009 | One Appearance workflow | Existing Theme & spacing entry points open the same Appearance panel and use the same saved preferences. |

## Discussion boundary

Further layout ideas are being discussed. They are not accepted implementation scope until the user chooses them. Preserve the existing tools and avoid changing model geometry while implementing these interface changes.
