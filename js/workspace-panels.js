/* One left-hand workspace panel for every dock tool. Native dialog IDs and
 * original form nodes remain intact, so tool actions keep their existing APIs. */
window.WorkspacePanels = {
  active: null,
  dialog: null,
  pinned: false,
  shouldDock(title) {
    if (StudioUI.mode === "4d") return true;
    if (this.external) return false;
    return (
      !!this.intent ||
      !!this.dialog ||
      ["Build", "Properties"].includes(this.active) ||
      /^(Tools|Workspace widgets|Canvas settings|Rooms & objects|Find a tool or room|Studio\+|4D rendering|4D lighting)/.test(
        title,
      )
    );
  },
  compactDock() {
    if (innerWidth < 620 && WorkspaceRefinement.pinned)
      WorkspaceRefinement.pinned = false;
    WorkspaceRefinement.compact();
  },
  closeDialog() {
    const d = this.dialog;
    this.dialog = null;
    this.returnPanel = null;
    if (d?.open) d.close();
    document.body.classList.remove("workspace-tool-open");
  },
  close() {
    this.closeDialog();
    this.active = null;
    document.body.classList.remove("workspace-properties-panel");
    WorkspaceLayout.hideCatalog();
    this.sync();
    window.dispatchEvent(new Event("resize"));
  },
  build() {
    this.closeDialog();
    this.active = "Build";
    document.body.classList.remove(
      "workspace-properties-panel",
      "catalog-collapsed",
    );
    document.body.classList.toggle("catalog-open", innerWidth <= 850);
    PlanningUI.preferences.catalogCollapsed = false;
    this.compactDock();
    this.sync();
    document.getElementById("studio-search").focus();
    window.dispatchEvent(new Event("resize"));
  },
  properties() {
    if (StudioUI.mode === "4d") return window.FourDWorkspace?.inspect();
    if (!elements[selectedElIndex]) return;
    this.closeDialog();
    WorkspaceLayout.hideCatalog();
    this.active = "Properties";
    document.body.classList.add("workspace-properties-panel");
    document.body.classList.remove("layout-properties-hidden");
    this.compactDock();
    this.sync();
    window.dispatchEvent(new Event("resize"));
  },
  mountDialog(d, title) {
    if (d.dataset.docked !== "true") return;
    if (
      !this.intent &&
      !this.dialog &&
      ["Build", "Properties"].includes(this.active)
    )
      this.returnPanel = this.active;
    this.dialog = d;
    this.active = this.intent || this.active || title;
    this.intent = null;
    document.body.classList.remove("workspace-properties-panel");
    document.body.classList.add("workspace-tool-open");
    d.classList.add("workspace-docked-dialog");
    d.setAttribute("aria-modal", "false");
    const header = d.querySelector(".studio-dialog-header");
    const pin = WorkspaceLayout.makeButton("Pin tool panel", "pin", () => {
      this.pinned = !this.pinned;
      pin.setAttribute("aria-pressed", String(this.pinned));
    });
    pin.classList.add("workspace-tool-pin");
    pin.innerHTML = WorkspaceLayout.icon("pin");
    pin.setAttribute("aria-pressed", String(this.pinned));
    header.insertBefore(pin, header.lastElementChild);
    d.addEventListener("close", () => {
      if (this.dialog !== d) return;
      const parent = this.returnPanel;
      this.dialog = null;
      this.returnPanel = null;
      this.active = null;
      document.body.classList.remove("workspace-tool-open");
      WorkspaceLayout.hideCatalog();
      this.sync();
      if (parent === "Properties" && elements[selectedElIndex])
        this.properties();
      else if (parent === "Build") this.build();
      window.dispatchEvent(new Event("resize"));
    });
    this.compactDock();
    this.sync();
    window.dispatchEvent(new Event("resize"));
  },
  sync() {
    const map = {
      "Workspace widgets": "Widgets",
      "Canvas settings": "Settings",
      "Search tools": "Search",
      "Studio upgrades": "Studio+",
    };
    for (const b of document.querySelectorAll(
      "#workspace-primary-tools button",
    )) {
      const key =
        map[b.getAttribute("aria-label")] || b.getAttribute("aria-label");
      const active =
        key === this.active &&
        (this.dialog?.open ||
          (key === "Build" && WorkspaceLayout.catalogOpen()) ||
          (key === "Properties" &&
            document.body.classList.contains("workspace-properties-panel")));
      b.setAttribute("aria-expanded", String(!!active));
      b.classList.toggle("workspace-tool-active", !!active);
    }
  },
  init() {
    document.body.classList.add("workspace-panels-ready");
    if (!PlanningUI.preferences.catalogWidth) {
      PlanningUI.preferences.catalogWidth = 296;
      PlanningUI.applyPrefs();
    }
    const rail = document.getElementById("workspace-primary-tools");
    document
      .getElementById("tool-dock-toggle")
      .addEventListener("click", () => {
        if (innerWidth < 620 && WorkspaceRefinement.pinned) this.close();
      });
    rail.addEventListener(
      "click",
      (e) => {
        const b = e.target.closest("button");
        if (!b) return;
        const name = b.getAttribute("aria-label");
        if (name === "Build" || name === "Properties") {
          e.preventDefault();
          e.stopImmediatePropagation();
          if (name === "Build") this.build();
          else this.properties();
        } else {
          this.external = false;
          this.intent =
            {
              "Workspace widgets": "Widgets",
              "Canvas settings": "Settings",
              "Search tools": "Search",
              "Studio upgrades": "Studio+",
            }[name] || name;
          queueMicrotask(() => {
            this.intent = null;
          });
        }
      },
      true,
    );
    document.getElementById("planning-dock").addEventListener(
      "click",
      () => {
        this.intent = "Widgets";
        this.external = false;
        queueMicrotask(() => {
          this.intent = null;
        });
      },
      true,
    );
    document.addEventListener(
      "pointerdown",
      (e) => {
        this.external = !!e.target.closest(
          ".studio-file-actions,.studio-floor-controls,.studio-status",
        );
        if (this.external && this.dialog) this.close();
        if (
          this.dialog &&
          !this.pinned &&
          !e.target.closest(
            "#studio-dialog,#workspace-primary-tools,#tool-dock-toggle",
          ) &&
          !e.target.closest("#planning-dock button")
        )
          this.close();
      },
      true,
    );
    document.addEventListener(
      "click",
      (e) => {
        if (e.target.closest("#advanced-view-panel button")) {
          this.intent = "4D";
          this.external = false;
          queueMicrotask(() => {
            this.intent = null;
          });
        }
      },
      true,
    );
    document.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")
          this.external = false;
      },
      true,
    );
    const dialog = StudioUI.dialog;
    StudioUI.dialog = function (title, html) {
      const d = dialog.call(this, title, html);
      WorkspacePanels.mountDialog(d, title);
      return d;
    };
    const show = WorkspaceLayout.showProperties;
    WorkspaceLayout.showProperties = () => {
      show.call(WorkspaceLayout);
      this.properties();
    };
    const update = WorkspaceLayout.updateRailState;
    WorkspaceLayout.updateRailState = () => {
      update.call(WorkspaceLayout);
      this.sync();
    };
    const collapse = PlanningUI.collapse;
    PlanningUI.collapse = (kind) => {
      collapse.call(PlanningUI, kind);
      if (kind === "catalog") {
        if (WorkspaceLayout.catalogOpen()) this.build();
        else if (this.active === "Build") {
          this.active = null;
          this.sync();
        }
      }
    };
    const restoreMode = WorkspaceLayout.restoreMode;
    WorkspaceLayout.restoreMode = (mode) => {
      this.closeDialog();
      restoreMode.call(WorkspaceLayout, mode);
      document.body.classList.remove("workspace-properties-panel");
      if (WorkspaceLayout.catalogOpen()) this.active = "Build";
      else if (
        elements[selectedElIndex] &&
        !document.body.classList.contains("layout-properties-hidden")
      ) {
        this.active = "Properties";
        document.body.classList.add("workspace-properties-panel");
      } else this.active = null;
      this.sync();
    };
    let selected = elements[selectedElIndex]?.id;
    const selectionChanged = (event) => {
      const id = elements[selectedElIndex]?.id;
      if (
        id &&
        (id !== selected || event.type === "app:selectionChanged") &&
        !ProjectState.applying
      )
        this.properties();
      if (!id && this.active === "Properties") this.close();
      selected = id;
    };
    AppEvents.onSelectionChange(selectionChanged);
    // Adding an asset commits state without emitting a separate selection event.
    AppEvents.onStateChange(selectionChanged);
    document.querySelector(
      ".studio-catalog .studio-panel-heading > button:last-child",
    ).onclick = () => {
      this.close();
      if (elements[selectedElIndex]) this.properties();
    };
    this.sync();
    const addHealth = () => {
      const panel = document.getElementById("advanced-view-panel");
      if (panel && !panel.querySelector("[data-render-health]")) {
        const b = WorkspaceLayout.makeButton(
          "Rendering & recovery",
          "cube",
          () => Engine4D.healthDialog(),
        );
        b.dataset.renderHealth = "true";
        panel.append(b);
      }
    };
    const previous = WorkspaceLayout.advanced;
    WorkspaceLayout.advanced = function () {
      previous.call(this);
      addHealth();
    };
    addHealth();
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspacePanels.init());
