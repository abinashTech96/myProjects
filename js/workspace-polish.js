/* Presentation-only refinements. Geometry and the original tool catalogue stay in their owning modules. */
window.WorkspacePolish = {
  themeInfo: {
    graphite: {
      name: "Graphite",
      note: "Cool charcoal · blue accents",
      panel: "#202b38",
      plan: "#18232f",
      model: "#35445a",
      render: "#29394e",
      accent: "#91bdff",
    },
    pearl: {
      name: "Pearl",
      note: "Clear paper · slate model stage",
      panel: "#f9fbff",
      plan: "#e7eef7",
      model: "#788ca5",
      render: "#647c9a",
      accent: "#2458ba",
    },
    ocean: {
      name: "Ocean",
      note: "Deep teal · mint accents",
      panel: "#143a40",
      plan: "#102d35",
      model: "#2a5964",
      render: "#204952",
      accent: "#69e4c4",
    },
    sand: {
      name: "Sand",
      note: "Warm paper · bronze model stage",
      panel: "#fbf6ef",
      plan: "#f0e5d5",
      model: "#8b7667",
      render: "#796456",
      accent: "#925329",
    },
  },
  themePicker() {
    return `<div class="theme-picker" role="group" aria-label="Workspace themes">${Object.entries(
      this.themeInfo,
    )
      .map(
        ([key, t]) =>
          `<button type="button" class="studio-button theme-card" data-theme-choice="${key}" aria-pressed="${document.body.dataset.uiTheme === key}" onclick="StudioEnhancements.theme('${key}')" style="--card-panel:${t.panel}"><span class="theme-swatches" aria-hidden="true">${[t.plan, t.model, t.render, t.accent].map((c) => `<i style="--swatch:${c}"></i>`).join("")}</span><strong>${t.name}</strong><small>${t.note}</small></button>`,
      )
      .join("")}</div>`;
  },
  densityControls() {
    return `<p>Control spacing</p><div class="density-options" role="group" aria-label="Control spacing">${["compact", "comfortable"].map((d) => `<button class="studio-button" type="button" data-density-choice="${d}" aria-pressed="${document.body.dataset.uiDensity === d}" onclick="WorkspacePolish.density('${d}')">${d === "compact" ? "Compact" : "Comfortable"}</button>`).join("")}</div><p class="studio-hint">Touch controls keep larger hit areas. Swatches preview 2D, 3D, 4D and the accent color.</p>`;
  },
  density(value, persist = true) {
    const density = value === "comfortable" ? value : "compact";
    document.body.dataset.uiDensity = density;
    if (persist)
      try {
        localStorage.setItem("ArchCAD_Control_Density", density);
      } catch {}
    document
      .querySelectorAll("[data-density-choice]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.densityChoice === density),
        ),
      );
    window.dispatchEvent(new Event("resize"));
  },
  positionSectionHandles() {
    if (StudioEnhancements.sectionDragging) return;
    const box = Engine3D.renderer.domElement.getBoundingClientRect();
    const obstacles = ['#advanced-view-panel[open]', '.viewport-orientation', '#viewport-toolbar']
      .map(selector => document.querySelector(selector)).filter(el => el?.getClientRects().length)
      .map(el => el.getBoundingClientRect());
    const placed = [];
    for (const [index,button] of [...document.querySelectorAll('#section-handles [data-plane]')].entries()) {
      const point = StudioEnhancements.planeScreen(button.dataset.plane);
      point.x = Math.max(28,Math.min(box.width-28,point.x));
      point.y = Math.max(48,Math.min(box.height-58,point.y));
      for (const rect of obstacles) {
        if (point.x+box.left+26 >= rect.left && point.x+box.left-26 <= rect.right && point.y+box.top+14 >= rect.top && point.y+box.top-14 <= rect.bottom) {
          if (rect.right-box.left+30 <= box.width-28) point.x = rect.right-box.left+30;
          else point.y = Math.min(box.height-58,rect.bottom-box.top+24);
        }
      }
      for (let tries=0;tries<6 && placed.some(p=>Math.abs(p.x-point.x)<52 && Math.abs(p.y-point.y)<28);tries++) {
        point.y += 32;
        if (point.y > box.height-58) { point.y=48+index*30; point.x=Math.max(28,Math.min(box.width-28,point.x+56)); }
      }
      placed.push(point); button.style.left=point.x+'px'; button.style.top=point.y+'px';
    }
  },
  themeChanged() {
    document
      .querySelectorAll("[data-theme-choice]")
      .forEach((b) =>
        b.setAttribute(
          "aria-pressed",
          String(b.dataset.themeChoice === document.body.dataset.uiTheme),
        ),
      );
    this.grid();
    if (window.WorkspaceLayout?.ready) WorkspaceLayout.applyAppearance();
  },
  grid() {
    if (!Engine3D.gridHelper) return;
    const style = getComputedStyle(document.body),
      color = new THREE.Color(
        style.getPropertyValue("--grid-3d").trim() || "#8ca5c4",
      );
    const attribute = Engine3D.gridHelper.geometry.attributes.color;
    // Update the existing grid buffer; theme changes never recreate GPU geometry.
    for (let i = 0; i < attribute.count; i++)
      attribute.setXYZ(i, color.r, color.g, color.b);
    attribute.needsUpdate = true;
    for (const material of [].concat(Engine3D.gridHelper.material)) {
      material.opacity = 0.16;
      material.depthWrite = false;
    }
    if (StudioEnhancements.sectionHelper)
      StudioEnhancements.sectionHelper.material.color.set(
        style.getPropertyValue("--enh-accent").trim(),
      );
    if (window.WorkspaceLayout?.ready) {
      Engine3D.gridHelper.visible = WorkspaceLayout.appearancePrefs.grid3d;
      for (const mat of [].concat(Engine3D.gridHelper.material)) mat.opacity = WorkspaceLayout.appearancePrefs.gridIntensity / 100;
    }
    Engine3D.needsRender = true;
  },
  nav() {
    const nav = document.getElementById("planning-navigation");
    if (!nav) return;
    nav.setAttribute("role", "toolbar");
    nav.setAttribute("aria-label", "Plan navigation");
    const buttons = [...nav.querySelectorAll("button")],
      [objects, pan, out, fit, selection, plus] = buttons;
    this.fitSelection = selection;
    out.id = "nav-zoom-out";
    plus.id = "nav-zoom-in";
    for (const [button, label] of [
      [out, "Zoom out"],
      [plus, "Zoom in"],
    ]) {
      button.setAttribute("aria-label", label);
      button.title = label;
    }
    const zoom = document.createElement("button");
    zoom.type = "button";
    zoom.className = "studio-button";
    zoom.id = "nav-zoom-value";
    zoom.setAttribute("aria-label", "Reset plan zoom to 100%");
    zoom.title = "Reset plan zoom to 100%";
    zoom.onclick = () => PlanningUI.zoom(1 / CanvasState.zoomLvl);
    const divider = () => {
      const el = document.createElement("span");
      el.className = "nav-divider";
      el.setAttribute("aria-hidden", "true");
      return el;
    };
    nav.replaceChildren(
      objects,
      pan,
      divider(),
      out,
      zoom,
      plus,
      divider(),
      fit,
      selection,
    );
    this.refresh();
  },
  refresh() {
    const splitKey =
      StudioUI.mode +
      ":" +
      StudioEnhancements.linked +
      ":" +
      this.verticalSplit();
    if (splitKey !== this.lastSplitKey) {
      this.lastSplitKey = splitKey;
      for (const id of ["canvas-wrapper", "right-canvas-wrapper"]) {
        const style = document.getElementById(id).style;
        style.removeProperty("height");
        style.removeProperty("flex");
      }
      if (StudioUI.mode === "split" || StudioEnhancements.linked)
        this.setSplit(this.splitPercent || 50, false);
    }
    const zoom = CanvasState.zoomLvl;
    const output = document.getElementById("nav-zoom-value");
    if (output) output.textContent = Math.round(zoom * 100) + "%";
    const out = document.getElementById("nav-zoom-out"),
      plus = document.getElementById("nav-zoom-in");
    if (out) out.disabled = zoom <= 0.200001;
    if (plus) plus.disabled = zoom >= 4.99999;
    if (this.fitSelection) {
      this.fitSelection.disabled = !elements.some(
        (e, i) =>
          e.floor === currentFloor &&
          (Selection.ids.has(e.id) || i === selectedElIndex),
      );
      this.fitSelection.title = this.fitSelection.disabled
        ? "Select an element on this floor to frame it"
        : "Frame the selected elements";
    }
    const empty = document.getElementById("viewport-empty-state");
    if (empty) empty.hidden = elements.some((e) => !e.isFurniture);
    document.querySelectorAll(".viewport-orientation button").forEach((b) => {
      b.setAttribute("aria-label", b.title || b.textContent);
    });
    const split = document.getElementById("split-resizer");
    if (split)
      split.setAttribute(
        "aria-orientation",
        this.verticalSplit() ? "horizontal" : "vertical",
      );
  },
  openBuild() {
    if (
      document.body.classList.contains("catalog-collapsed") ||
      (!document.body.classList.contains("catalog-open") && innerWidth <= 850)
    )
      PlanningUI.collapse("catalog");
    document.getElementById("studio-search")?.focus();
  },
  clampDialog(dialog) {
    const viewport = window.visualViewport,
      width = viewport?.width || innerWidth,
      height = viewport?.height || innerHeight;
    const x = viewport?.offsetLeft || 0,
      y = viewport?.offsetTop || 0;
    dialog.style.maxWidth = Math.max(120, width - 24) + "px";
    const top = Math.max(
      y + 12,
      Math.min(parseFloat(dialog.style.top) || y + 12, y + height - 96),
    );
    dialog.style.top = top + "px";
    dialog.style.left =
      Math.max(
        x + 12,
        Math.min(
          parseFloat(dialog.style.left) || x + 12,
          x + width - dialog.getBoundingClientRect().width - 12,
        ),
      ) + "px";
    dialog.style.maxHeight = Math.max(80, y + height - top - 12) + "px";
  },
  decorateDialog(dialog) {
    dialog.setAttribute("aria-labelledby", "workspace-dialog-title");
    const title = dialog.querySelector(".studio-dialog-header strong");
    if (title) title.id = "workspace-dialog-title";
    dialog.querySelectorAll("table").forEach((table) => {
      table.setAttribute("tabindex", "0");
      table.setAttribute("aria-label", title?.textContent + " table");
    });
    const reposition = () => {
      if (!dialog.open) return;
      if (dialog.classList.contains("experience-popover"))
        WorkspaceExperience.position(dialog, dialog.dataset.kind);
      else
        dialog.style.maxHeight =
          Math.max(80, (window.visualViewport?.height || innerHeight) - 24) +
          "px";
    };
    window.visualViewport?.addEventListener("resize", reposition);
    dialog.addEventListener(
      "close",
      () => window.visualViewport?.removeEventListener("resize", reposition),
      { once: true },
    );
  },
  verticalSplit() {
    return StudioEnhancements.linked && matchMedia("(max-width:700px)").matches;
  },
  setSplit(percent, resize = true) {
    const value = Math.max(20, Math.min(80, percent)),
      left = document.getElementById("canvas-wrapper"),
      right = document.getElementById("right-canvas-wrapper");
    this.splitPercent = value;
    left.style.setProperty("flex", "0 0 " + value + "%", "important");
    right.style.setProperty("flex", "1 1 0%", "important");
    if (this.verticalSplit()) {
      left.style.setProperty("height", value + "%", "important");
      right.style.setProperty("height", 100 - value + "%", "important");
    }
    const separator = document.getElementById("split-resizer");
    separator.setAttribute("aria-valuenow", String(Math.round(value)));
    separator.setAttribute(
      "aria-valuetext",
      Math.round(value) + "% plan, " + Math.round(100 - value) + "% model",
    );
    if (resize) window.dispatchEvent(new Event("resize"));
  },
  splitControl() {
    const separator = document.getElementById("split-resizer");
    if (!separator) return;
    separator.tabIndex = 0;
    separator.setAttribute("role", "separator");
    separator.setAttribute("aria-label", "Resize plan and model panes");
    separator.setAttribute("aria-valuemin", "20");
    separator.setAttribute("aria-valuemax", "80");
    separator.setAttribute("aria-valuenow", "50");
    separator.addEventListener(
      "mousedown",
      (e) => e.stopImmediatePropagation(),
      { capture: true },
    );
    separator.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      separator.setPointerCapture(event.pointerId);
      separator.classList.add("dragging");
      const move = (e) => {
        const box = document
            .getElementById("main-workspace")
            .getBoundingClientRect(),
          vertical = this.verticalSplit();
        this.setSplit(
          ((vertical ? e.clientY - box.top : e.clientX - box.left) /
            (vertical ? box.height : box.width)) *
            100,
        );
      };
      const stop = () => {
        separator.classList.remove("dragging");
        separator.removeEventListener("pointermove", move);
        separator.removeEventListener("pointerup", stop);
        separator.removeEventListener("pointercancel", stop);
        separator.removeEventListener("lostpointercapture", stop);
      };
      separator.addEventListener("pointermove", move);
      separator.addEventListener("pointerup", stop);
      separator.addEventListener("pointercancel", stop);
      separator.addEventListener("lostpointercapture", stop);
    });
    separator.addEventListener("dblclick", () => this.setSplit(50));
    separator.addEventListener("keydown", (event) => {
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Home",
          "End",
        ].includes(event.key)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      const value = Number(separator.getAttribute("aria-valuenow")) || 50;
      this.setSplit(
        event.key === "Home"
          ? 20
          : event.key === "End"
            ? 80
            : value +
              (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) *
                (event.shiftKey ? 10 : 5),
      );
    });
    matchMedia("(max-width:700px)").addEventListener("change", () => {
      document.getElementById("canvas-wrapper").style.removeProperty("height");
      document
        .getElementById("right-canvas-wrapper")
        .style.removeProperty("height");
      this.refresh();
    });
  },
  init() {
    let density = "compact";
    try {
      density = localStorage.getItem("ArchCAD_Control_Density") || density;
    } catch {}
    this.density(density, false);
    this.nav();
    this.splitControl();
    this.themeChanged();
    const wrapper = document.getElementById("right-canvas-wrapper"),
      empty = document.createElement("div");
    empty.id = "viewport-empty-state";
    empty.innerHTML =
      '<strong>Your model starts here</strong><p>Add a room from Build to see it in 3D. Use the plan on the left to position it.</p><button class="studio-button primary" onclick="WorkspacePolish.openBuild()">Add a room</button>';
    wrapper.append(empty);
    const viewport = window.updateViewport;
    window.updateViewport = (...args) => {
      const result = viewport(...args);
      this.refresh();
      return result;
    };
    const layout = window.setWorkspaceLayout;
    window.setWorkspaceLayout = (mode) => {
      const result = layout(mode);
      this.refresh();
      return result;
    };
    document.addEventListener(
      "keydown",
      (event) => {
        const toolbar = event.target.closest(
          ".studio-view-modes,#viewport-toolbar,#planning-navigation,.viewport-orientation",
        );
        if (
          !toolbar ||
          !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        )
          return;
        const buttons = [
            ...toolbar.querySelectorAll("button:not(:disabled)"),
          ].filter((b) => b.getClientRects().length),
          index = buttons.indexOf(event.target);
        if (index < 0 || !buttons.length) return;
        event.preventDefault();
        event.stopPropagation();
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowLeft" ? -1 : 1) +
                  buttons.length) %
                buttons.length;
        buttons[next].focus();
        if (toolbar.classList.contains("studio-view-modes"))
          buttons[next].click();
      },
      { capture: true },
    );
    AppEvents.onSelectionChange(() => this.refresh());
    AppEvents.onStateChange(() => this.refresh());
    window.addEventListener("resize", () => this.refresh());
    this.refresh();
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspacePolish.init());
