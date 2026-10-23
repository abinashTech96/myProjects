/* Compositor-only transitions: the layout and renderer switch immediately;
 * animation never delays drawing, input, or graphics recovery. */
window.WorkspaceMotion = {
  animations: [],
  pending: 0,
  active: new Map(),
  reveal(node) {
    if(document.hidden || matchMedia("(prefers-reduced-motion: reduce)").matches || !node?.getClientRects().length)return;
    this.active.get(node)?.cancel();
    const animation=node.animate([{opacity:.55,transform:"translateY(4px)"},{opacity:1,transform:"none"}],{duration:170,easing:"cubic-bezier(.2,.8,.2,1)"});
    this.active.set(node,animation);
    const clear=()=>{if(this.active.get(node)===animation)this.active.delete(node);};animation.onfinish=animation.oncancel=clear;
  },
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
    this.observer=new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches?.(".studio-dialog,.planning-widget,#workspace-footer-panel"))this.reveal(node);
    });
    this.observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener("toggle",event=>{if(event.target.matches?.("#parapet-studio details[open],.studio-dialog details[open]"))this.reveal(event.target);},true);
    document.addEventListener("visibilitychange",()=>{if(document.hidden){cancelAnimationFrame(this.pending);this.animations.forEach(a=>a.cancel());for(const a of this.active.values())a.cancel();this.active.clear();}});
    this.sync();
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspaceMotion.init());
