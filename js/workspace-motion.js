/* Compositor-only transitions: the layout and renderer switch immediately;
 * animation never delays drawing, input, or graphics recovery. */
window.WorkspaceMotion = {
  animations: [],
  pending: 0,
  sync() {
    const modes = ["2d", "split", "3d", "4d"];
    document
      .querySelector(".studio-view-modes")
      ?.style.setProperty("--mode-index", modes.indexOf(StudioUI.mode));
  },
  init() {
    const setLayout = window.setWorkspaceLayout;
    window.setWorkspaceLayout = (mode) => {
      const previous = StudioUI.mode;
      PlanContextMenu.close(false);
      const result = setLayout(mode);
      this.sync();
      cancelAnimationFrame(this.pending);
      this.animations.forEach((animation) => animation.cancel());
      this.animations = [];
      if (
        previous !== StudioUI.mode &&
        !ProjectState.applying &&
        !matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        this.pending = requestAnimationFrame(() => {
          for (const id of ["canvas-wrapper", "right-canvas-wrapper"]) {
            const node = document.getElementById(id);
            if (
              node.getClientRects().length &&
              getComputedStyle(node).display !== "none"
            )
              this.animations.push(
                node.animate(
                  [
                    { opacity: 0.35, transform: "translateY(5px)" },
                    { opacity: 1, transform: "none" },
                  ],
                  { duration: 220, easing: "cubic-bezier(.2,.75,.2,1)" },
                ),
              );
          }
        });
      }
      return result;
    };
    this.sync();
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspaceMotion.init());
