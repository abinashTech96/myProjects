/* Pointer-positioned 2D actions. Geometry is queried in model inches after the
 * SVG camera transform, independently of the previously selected object. */
window.PlanContextMenu = {
  context: null,
  actions: new Map(),
  distance(p, a, b) {
    const dx = b.x - a.x,
      dy = b.y - a.y;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1),
      ),
    );
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  },
  hit(event) {
    const svg = getMousePos(event),
      { I, SCALE } = Utils.getMetrics();
    const point = { x: (svg.x - I.x) / SCALE, y: (svg.y - I.y) / SCALE };
    const p = ProjectState.capture();
    // Convert a 7px picking tolerance through the actual SVG/camera scale.
    const matrix = document.getElementById("element-container").getScreenCTM();
    const tolerance =
      7 / Math.max(0.001, SCALE * Math.hypot(matrix.a, matrix.b));
    for (let i = fixtures.length - 1; i >= 0; i--) {
      const f = fixtures[i],
        room = elements[f.roomId];
      if (
        !room ||
        room.floor !== currentFloor ||
        p.planning.layers?.walls?.visible === false
      )
        continue;
      const line = PlanningModel.openingSegment(p, f);
      if (this.distance(point, line.a, line.b) <= tolerance)
        return { kind: "opening", index: f.roomId, fixture: i, point };
    }
    for (const furniture of [true, false]) {
      for (let i = elements.length - 1; i >= 0; i--) {
        const e = elements[i];
        if (
          e.floor !== currentFloor ||
          !!e.isFurniture !== furniture ||
          p.planning.layers?.[furniture ? "furniture" : "rooms"]?.visible ===
            false
        )
          continue;
        const polygon = furniture
          ? PlanningModel.points(Selection.bounds(e))
          : PlanningModel.points(e);
        if (PlanningModel.inside(point, polygon))
          return { kind: furniture ? "furniture" : "room", index: i, point };
      }
    }
    const geom = calculateGeometry(SCALE, p.unit);
    return {
      kind: PlanningModel.inside(svg, [geom.A, geom.B, geom.C, geom.D])
        ? "plot"
        : "outside",
      point,
    };
  },
  items(c) {
    const el = elements[c.index],
      layer =
        c.kind === "opening"
          ? "walls"
          : el?.isFurniture
            ? "furniture"
            : "rooms";
    const layerLocked = !!PlanningUI.data.layers[layer]?.locked;
    const locked = !!el?.locked || layerLocked;
    const anyLocked =
      locked || Selection.indices().some((i) => elements[i].locked);
    const item = (id, label, icon, run, extra = {}) => ({
      id,
      label,
      icon,
      run,
      ...extra,
    });
    const common = [
      item("undo", "Undo", "undo", () => ProjectState.undo(), {
        shortcut: "Ctrl Z",
        disabled: !ProjectState.history.stack.length,
      }),
      item("redo", "Redo", "redo", () => ProjectState.redo(), {
        shortcut: "Ctrl Shift Z",
        disabled: !ProjectState.history.redoStack.length,
      }),
    ];
    if (c.kind === "opening")
      return [
        item(
          "edit-opening",
          "Edit " + fixtures[c.fixture].type,
          "Properties",
          () => PlanningUI.editOpeningDialog(c.fixture),
          { disabled: locked },
        ),
        item("properties", "Room properties", "Properties", () =>
          WorkspacePanels.properties(),
        ),
        item(
          "remove-opening",
          "Remove opening",
          "trash",
          () => deleteFixture(c.fixture),
          { danger: true, disabled: locked },
        ),
        ...common,
      ];
    if (el)
      return [
        item("properties", "Properties", "Properties", () =>
          WorkspacePanels.properties(),
        ),
        item(
          "move",
          "Move / mirror…",
          "pan",
          () => DesignUI.transformDialog(),
          { disabled: anyLocked },
        ),
        item(
          "duplicate",
          "Duplicate",
          "copy",
          () => Selection.action("Duplicate"),
          { shortcut: "Ctrl D", disabled: anyLocked },
        ),
        item("rotate", "Rotate 90°", "rotate", () => StudioUI.rotate(c.index), {
          disabled: locked || Selection.ids.size > 1,
        }),
        item(
          "lock",
          locked ? "Unlock selection" : "Lock selection",
          "pin",
          () =>
            ProjectState.commit("Changed selection lock", () =>
              Selection.indices().forEach(
                (i) => (elements[i].locked = !locked),
              ),
            ),
          { disabled: layerLocked },
        ),
        ...(!el.isFurniture
          ? [
              item(
                "openings",
                "Doors & windows…",
                "Build",
                () => PlanningUI.openingsDialog(),
                { disabled: locked },
              ),
            ]
          : []),
        item("more", "More object actions…", "Tools", () =>
          DesignUI.contextDialog(),
        ),
        item(
          "delete",
          "Delete selection",
          "trash",
          () => Selection.action("Delete selection"),
          { shortcut: "Del", danger: true, disabled: anyLocked },
        ),
      ];
    return [
      ...(c.kind === "plot"
        ? [
            item("build", "Build / add objects", "Build", () =>
              WorkspacePanels.build(),
            ),
            item(
              "select-all",
              "Select floor objects",
              "Objects",
              () => {
                Selection.ids = new Set(
                  elements
                    .filter((e) => e.floor === currentFloor)
                    .map((e) => e.id),
                );
                selectedElIndex = elements.findIndex(
                  (e) => e.floor === currentFloor,
                );
                renderSidebar();
                AppEvents.triggerSelectionChange();
                updateCanvas(false);
              },
              { disabled: !elements.some((e) => e.floor === currentFloor) },
            ),
          ]
        : []),
      ...common,
      item("fit", "Fit plot", "fit", () => StudioUI.fitPlan()),
      item("floors", "Manage floors…", "cube", () => StudioUI.floorMenu()),
      item("settings", "Plot & units…", "Settings", () =>
        StudioUI.projectDialog(),
      ),
      item("appearance", "Appearance…", "sun", () =>
        document.getElementById("footer-appearance").click(),
      ),
    ];
  },
  open(event, keyboard = false) {
    if (!["2d", "split"].includes(StudioUI.mode) || RoomStudio.activeRoom)
      return;
    event.preventDefault?.();
    this.close(false);
    const c = this.hit(event);
    this.context = c;
    document.getElementById("room-tooltip").style.display = "none";
    this.lastPointer = { clientX: event.clientX, clientY: event.clientY };
    this.returnFocus = document.activeElement;
    if (c.index !== undefined) {
      Selection.pick(c.index);
      renderSidebar();
      AppEvents.triggerSelectionChange();
      updateCanvas(false);
    }
    const selected = elements[c.index];
    const title =
      c.kind === "opening"
        ? fixtures[c.fixture].type
        : selected
          ? selected.customName || selected.type
          : c.kind === "plot"
            ? "Plot workspace"
            : "Outside plot";
    const menu = document.getElementById("context-menu");
    menu.dataset.context = c.kind;
    menu.setAttribute("role", "menu");
    menu.setAttribute("aria-label", title + " actions");
    const heading = document.createElement("div");
    heading.className = "context-heading";
    const name = document.createElement("strong");
    name.textContent = title;
    heading.append(name);
    const meta = document.createElement("small");
    const length = (value) =>
      ProjectModel.display(Math.round(value * 100) / 100, StudioUI.unit);
    meta.textContent = `${c.kind === "opening" ? "Opening" : c.kind} · X ${length(c.point.x)} · Y ${length(c.point.y)} ${StudioUI.unit}`;
    heading.append(meta);
    menu.replaceChildren(heading);
    this.actions.clear();
    for (const item of this.items(c)) {
      this.actions.set(item.id, item);
      const button = document.createElement("button");
      button.type = "button";
      button.className =
        "studio-button context-action" + (item.danger ? " danger" : "");
      button.dataset.action = item.id;
      button.setAttribute("role", "menuitem");
      button.disabled = !!item.disabled;
      const icon = document.createElement("span");
      icon.className = "context-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = WorkspaceLayout.icon(item.icon);
      const label = document.createElement("span");
      label.textContent = item.label;
      button.append(icon, label);
      if (item.shortcut) {
        const key = document.createElement("kbd");
        key.textContent = item.shortcut;
        button.append(key);
      }
      button.addEventListener("click", () => {
        if (button.disabled) return;
        this.close(false);
        WorkspacePanels.external = false;
        WorkspacePanels.intent = "Context";
        try {
          item.run();
        } catch (error) {
          StudioUI.message(error.message, "error");
        } finally {
          WorkspacePanels.intent = null;
        }
      });
      menu.append(button);
    }
    menu.style.display = "block";
    menu.style.visibility = "hidden";
    const rect = menu.getBoundingClientRect();
    const x = Math.max(8, Math.min(event.clientX, innerWidth - rect.width - 8));
    const y = Math.max(
      8,
      Math.min(event.clientY, innerHeight - rect.height - 8),
    );
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    menu.style.visibility = "visible";
    menu.style.transformOrigin = `${event.clientX > x + rect.width / 2 ? "right" : "left"} ${event.clientY > y + rect.height / 2 ? "bottom" : "top"}`;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      this.animation = menu.animate(
        [
          { opacity: 0, transform: "translateY(3px) scale(.97)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 150, easing: "cubic-bezier(.2,.8,.2,1)" },
      );
    if (keyboard) menu.querySelector("button:not(:disabled)")?.focus();
  },
  close(restore = true) {
    this.animation?.cancel();
    const menu = document.getElementById("context-menu");
    if (menu) menu.style.display = "none";
    if (restore && menu?.contains(document.activeElement))
      this.returnFocus?.focus();
  },
  init() {
    const blueprint = document.getElementById("blueprint"),
      menu = document.getElementById("context-menu");
    document.body.append(menu, document.getElementById("room-tooltip")); // Fixed-position menu must not inherit a canvas transform.
    blueprint.setAttribute("tabindex", "0");
    // Resize handles, section tools and legacy measurement listeners must never
    // consume the secondary button before the context-menu event arrives.
    for (const type of ["pointerdown", "mousedown"]) {
      window.addEventListener(
        type,
        (event) => {
          if (
            event.button === 2 &&
            event.target.closest?.("#blueprint") &&
            !RoomStudio.activeRoom
          ) {
            event.stopImmediatePropagation();
          }
        },
        true,
      );
    }
    menu.addEventListener("contextmenu", (e) => e.preventDefault());
    blueprint.addEventListener(
      "contextmenu",
      (e) => {
        if (RoomStudio.activeRoom || !["2d", "split"].includes(StudioUI.mode))
          return;
        e.stopImmediatePropagation();
        this.open(e);
      },
      true,
    );
    // Runs before the application shortcut handler: menu keys never edit the plan.
    window.addEventListener(
      "keydown",
      (e) => {
        if (menu.style.display === "block") {
          const buttons = [...menu.querySelectorAll("button:not(:disabled)")];
          if (e.key === "Escape") {
            this.close();
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
            const i = buttons.indexOf(document.activeElement),
              next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? buttons.length - 1
                    : (i + (e.key === "ArrowUp" ? -1 : 1) + buttons.length) %
                      buttons.length;
            buttons[next]?.focus();
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          if (e.key === "Tab") {
            this.close(false);
            return;
          }
          if (e.key === "Enter" || e.key === " ") {
            if (menu.contains(document.activeElement))
              document.activeElement.click();
            e.preventDefault();
            e.stopImmediatePropagation();
            return;
          }
          e.stopImmediatePropagation();
          return;
        }
        if (
          (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) &&
          e.target.closest?.("#blueprint")
        ) {
          const r = blueprint.getBoundingClientRect();
          this.open(
            {
              clientX: r.x + r.width / 2,
              clientY: r.y + r.height / 2,
              target: blueprint,
            },
            true,
          );
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!menu.contains(e.target)) this.close(false);
      },
      true,
    );
    document.addEventListener(
      "scroll",
      (event) => {
        if (!menu.contains(event.target)) this.close(false);
      },
      true,
    );
    window.addEventListener("resize", () => this.close(false));
    window.addEventListener("blur", () => this.close(false));
    AppEvents.onStateChange(() => this.close(false));
  },
};
// Retain public entry points used by older extensions.
window.renderContextMenu = () =>
  PlanContextMenu.open(
    PlanContextMenu.lastPointer || {
      clientX: innerWidth / 2,
      clientY: innerHeight / 2,
    },
  );
window.handleContextMenuAction = (id) => {
  const item = PlanContextMenu.actions.get(id);
  if (item && !item.disabled) {
    PlanContextMenu.close(false);
    item.run();
  }
};
function isPointInPolygon(point, polygon) {
  return PlanningModel.inside(point, polygon);
}
document.addEventListener("DOMContentLoaded", () => PlanContextMenu.init());
