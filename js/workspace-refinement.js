/* Discoverable tools without reserving more drawing space. */
window.WorkspaceRefinement = {
  escape: ProjectModel.escapeHTML,
  floorName(i) {
    return PlanningUI.data.floorNames[i] || (i === 0 ? "Ground" : "Floor " + i);
  },
  brand() {
    const old = document.querySelector(".studio-brand"),
      home = document.createElement("a");
    home.className = "studio-brand";
    home.href = "./";
    home.setAttribute("aria-label", "ArchCAD Pro home");
    home.innerHTML =
      '<span class="archcad-logo" aria-hidden="true"><span class="archcad-original-logo">📐</span><svg viewBox="0 0 32 32" width="25" height="25" fill="none"><path d="M4 4v24h24L4 4Zm6 13 5 5h-5v-5Z" fill="currentColor" fill-opacity=".25" fill-rule="evenodd" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 10h3m-3 6h3m-3 6h3m3 6v-3m6 3v-3m6 3v-3" stroke="currentColor" stroke-width="1.4"/></svg></span><span class="archcad-name">ArchCAD <small>PRO</small></span>';
    home.addEventListener("click", async (e) => {
      if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (home.dataset.saving) return;
      home.dataset.saving = "true";
      try {
        await StorageEngine.saveToMemory();
        if (StorageEngine.error) throw Error(StorageEngine.error);
        location.assign(home.href);
      } catch (error) {
        delete home.dataset.saving;
        StudioUI.message(
          "Could not save before going home: " + error.message,
          "error",
        );
      }
    });
    old.replaceWith(home);
    const group = document.createElement("div");
    group.id = "workspace-header-start";
    home.before(group);
    group.append(home, document.querySelector(".studio-file-actions"));
  },
  dock() {
    const rail = document.getElementById("workspace-rail"),
      main = document.getElementById("workspace-primary-tools");
    const toggle = WorkspaceLayout.makeButton("Expand tool dock", "pin", () => {
      this.pinned = !this.pinned;
      this.expand(this.pinned);
    });
    toggle.id = "tool-dock-toggle";
    toggle.setAttribute("aria-controls", main.id);
    toggle.querySelector("span").textContent = "Keep dock expanded";
    rail.prepend(toggle);
    const plus = rail.querySelector(".studio-plus-entry span");
    if (plus) plus.textContent = "Studio+";
    let timer;
    this.keyboardNavigation = false;
    document.addEventListener(
      "keydown",
      (event) => {
        if (["Tab", "ArrowUp", "ArrowDown"].includes(event.key))
          this.keyboardNavigation = true;
      },
      true,
    );
    document.addEventListener(
      "pointerdown",
      () => {
        this.keyboardNavigation = false;
      },
      true,
    );
    rail.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse" && matchMedia("(hover:hover)").matches)
        timer = setTimeout(() => this.expand(true), 200);
    });
    rail.addEventListener("pointerleave", () => {
      clearTimeout(timer);
      if (!this.pinned) this.expand(false);
    });
    rail.addEventListener("focusin", (e) => {
      if (this.keyboardNavigation && e.target !== toggle) this.expand(true);
    });
    rail.addEventListener("focusout", () => {
      queueMicrotask(() => {
        if (!this.pinned && !rail.contains(document.activeElement))
          this.expand(false);
      });
    });
    rail.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.pinned = false;
        this.expand(false);
        toggle.focus();
      }
    });
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!rail.contains(e.target) && !this.pinned) {
          clearTimeout(timer);
          this.expand(false);
        }
      },
      true,
    );
    document
      .getElementById("main-workspace")
      .append(document.getElementById("planning-dock"));
    const dock = document.getElementById("planning-dock");
    const sync = () =>
      document.body.classList.toggle(
        "workspace-has-widgets",
        !!dock.querySelector(".planning-widget"),
      );
    new MutationObserver(sync).observe(dock, { childList: true });
    sync();
    this.expand(false);
  },
  expand(value) {
    document.body.classList.toggle("tool-dock-expanded", value);
    const toggle = document.getElementById("tool-dock-toggle");
    toggle.setAttribute("aria-expanded", String(value));
    toggle.setAttribute("aria-pressed", String(!!this.pinned));
    toggle.setAttribute(
      "aria-label",
      this.pinned ? "Collapse tool dock" : "Expand tool dock",
    );
    toggle.title = this.pinned
      ? "Collapse tool dock"
      : "Keep tool dock expanded";
  },
  /* Move the existing nodes: IDs, live form values and original actions survive. */
  categorize(dialog, groups, label) {
    const body = dialog.querySelector(".studio-dialog-body");
    if (!body || body.querySelector(".refine-search")) return;
    dialog.classList.add("refined-menu");
    const search = document.createElement("input");
    search.type = "search";
    search.className = "refine-search";
    search.placeholder = label;
    search.setAttribute("aria-label", label);
    const tabs = document.createElement("div");
    tabs.className = "refine-categories";
    tabs.setAttribute("role", "group");
    tabs.setAttribute("aria-label", "Option categories");
    const contents = document.createElement("div");
    contents.className = "refine-menu-groups";
    const sections = [];
    for (const [name, nodes] of groups) {
      if (!nodes.length) continue;
      const section = document.createElement("section");
      section.className = "refine-menu-section";
      const heading = document.createElement("h3");
      heading.textContent = name;
      section.append(heading, ...nodes);
      contents.append(section);
      sections.push([name, section, nodes]);
    }
    let category = "All";
    const empty = document.createElement("p");
    empty.className = "refine-empty";
    empty.textContent = "No matching options. Try another search.";
    empty.setAttribute("role", "status");
    empty.hidden = true;
    const filter = () => {
      const query = search.value.trim().toLowerCase();
      let total = 0;
      for (const [name, section, nodes] of sections) {
        let count = 0;
        for (const node of nodes) {
          const visible =
            (category === "All" || category === name) &&
            (
              node.textContent +
              " " +
              [...node.querySelectorAll("[aria-label]")]
                .map((n) => n.getAttribute("aria-label"))
                .join(" ")
            )
              .toLowerCase()
              .includes(query);
          node.hidden = !visible;
          if (visible) count++;
        }
        section.hidden = !count;
        total += count;
      }
      empty.hidden = total > 0;
      for (const b of tabs.children)
        b.setAttribute("aria-pressed", String(b.textContent === category));
      WorkspacePolish.clampDialog(dialog);
    };
    for (const name of ["All", ...sections.map(([name]) => name)]) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "studio-button";
      b.textContent = name;
      b.onclick = () => {
        category = name;
        filter();
      };
      tabs.append(b);
    }
    search.oninput = filter;
    body.prepend(search, tabs, contents, empty);
    filter();
  },
  decorate(dialog, title) {
    const body = dialog.querySelector(".studio-dialog-body");
    if (!body) return;
    if (title === "Workspace widgets") {
      const rows = [...body.querySelectorAll(".experience-widget-option")];
      this.categorize(
        dialog,
        [
          ["Analysis", rows.slice(0, 3)],
          ["Drafting", rows.slice(4, 6)],
          ["Utilities", [rows[3]].filter(Boolean)],
          ["Navigation", rows.slice(6)],
        ],
        "Search widgets",
      );
      body.querySelector(".experience-widget-grid")?.remove();
    } else if (title === "Canvas settings") {
      const rows = [...body.querySelectorAll(":scope > label")];
      this.categorize(
        dialog,
        [
          ["Annotations", rows.slice(0, 4)],
          ["Drawing", rows.slice(4)],
          [
            "More controls",
            [...body.querySelectorAll(".studio-action-grid > button")],
          ],
        ],
        "Search canvas settings",
      );
      body.querySelector(".studio-action-grid")?.remove();
    } else if (title === "Rooms & objects") {
      const rows = [
        ...body.querySelectorAll(".workspace-object-list > button"),
      ];
      const names = ["Rooms", "Furniture", "Circulation"];
      this.categorize(
        dialog,
        names.map((name) => [
          name,
          rows.filter((b) => {
            const i = Number(
              b.getAttribute("onclick")?.match(/focusObject\((\d+)\)/)?.[1],
            );
            const e = elements[i];
            return (
              (e?.isFurniture
                ? "Furniture"
                : e?.type === "staircase"
                  ? "Circulation"
                  : "Rooms") === name
            );
          }),
        ]),
        "Search objects on this floor",
      );
      const list = body.querySelector(".workspace-object-list"),
        groups = body.querySelector(".refine-menu-groups");
      groups.replaceWith(list);
      list.replaceChildren(...groups.children);
    } else if (title.startsWith("Studio+")) {
      const hub = body.querySelector(".enhancement-hub");
      if (!hub) return;
      const rows = [...hub.children];
      const by = (indices) => indices.map((i) => rows[i - 1]);
      this.categorize(
        dialog,
        [
          ["Design", by([2, 4, 5, 6, 8, 9, 10, 12, 16])],
          ["Viewing", by([1, 7, 11, 13, 15, 17, 18])],
          ["Rendering", by([3, 14])],
        ],
        "Search Studio+ tools",
      );
      // Keep the semantic collection for existing integrations, with all 18 actions.
      const groups = body.querySelector(".refine-menu-groups");
      groups.replaceWith(hub);
      hub.replaceChildren(...groups.children);
    }
  },
  tools(category = "Build") {
    const tools = PlanningUI.tools(),
      categories = [...new Set(tools.map((t) => t[0]))];
    const d = StudioUI.dialog(
      "Tools",
      '<div class="workspace-tool-sections" aria-label="Tool collections">' +
        StudioUI.button("Design", "DesignUI.menu()") +
        StudioUI.button("Pro", "WorkbenchUI.menu()") +
        StudioUI.button("3D tools", "StudioUI.viewToolsDialog()") +
        StudioUI.button("Search all tools", "PlanningUI.commandDialog()") +
        '</div><div class="planning-tool-list"></div>',
    );
    const list = d.querySelector(".planning-tool-list");
    const groups = categories.map((name) => [
      name,
      tools.flatMap((t, i) => {
        if (t[0] !== name) return [];
        const row = document.createElement("div");
        row.className = "refine-tool-row";
        row.innerHTML =
          StudioUI.button(this.escape(t[1]), "PlanningUI.launch(" + i + ")") +
          '<button class="studio-button" aria-label="Favourite ' +
          this.escape(t[1]) +
          '">' +
          (PlanningUI.preferences.favourites?.includes(t[1]) ? "★" : "☆") +
          "</button>";
        row.lastChild.onclick = () => {
          PlanningUI.favourite(i);
          row.lastChild.textContent =
            PlanningUI.preferences.favourites?.includes(t[1]) ? "★" : "☆";
        };
        return [row];
      }),
    ]);
    this.categorize(d, groups, "Search all tools");
    const groupsNode = d.querySelector(".refine-menu-groups");
    groupsNode.replaceWith(list);
    list.append(...groupsNode.children);
    // Default to a compact category. Typing immediately searches every collection.
    const tabs = d.querySelector(".refine-categories"),
      search = d.querySelector(".refine-search");
    [...tabs.children].find((b) => b.textContent === category)?.click();
    search.addEventListener("input", () => {
      tabs.firstChild.click();
    });
    return d;
  },
  floors() {
    const count = PlanningUI.p().floorCount;
    const d = StudioUI.dialog(
      "Floors",
      `<div class="floor-quick-actions">${[
        ["Add", "Add floor", "addManualFloor();WorkspaceRefinement.floors()"],
        [
          "Clone",
          "Clone current floor",
          "cloneEntireFloor();WorkspaceRefinement.floors()",
        ],
        [
          "Delete",
          "Delete current floor",
          "deleteCurrentFloor();WorkspaceRefinement.floors()",
        ],
      ]
        .map(
          ([text, label, action]) =>
            `<button class="studio-button" aria-label="${label}" ${label.startsWith("Delete") && count < 2 ? "disabled" : ""} onclick="${action}">${text}</button>`,
        )
        .join(
          "",
        )}</div><input class="floor-search" type="search" aria-label="Search floors" placeholder="Find a floor"><div class="refine-floor-list" aria-label="Project floors">${Array.from({ length: count }, (_, i) => `<button class="studio-button refine-floor" data-floor="${i}" aria-current="${i === currentFloor ? "true" : "false"}" onclick="WorkspaceRefinement.switchFloor(${i})"><span class="floor-number">${String(i).padStart(2, "0")}</span><span>${this.escape(this.floorName(i))}<small>${elements.filter((e) => e.floor === i).length} objects</small></span>${i === currentFloor ? '<span aria-hidden="true">✓</span>' : ""}</button>`).join("")}</div><p class="floor-empty" hidden>No matching floors.</p><details class="floor-more"><summary>Manage current floor</summary><label>Floor name<input aria-label="Floor name" maxlength="60" value="${this.escape(this.floorName(currentFloor))}" onchange="WorkspaceRefinement.renameFloor(this.value)"></label><div class="floor-quick-actions"><button class="studio-button" aria-label="Move floor down" ${currentFloor === 0 ? "disabled" : ""} onclick="WorkspaceRefinement.moveFloor(-1)">↓ Down</button><button class="studio-button" aria-label="Move floor up" ${currentFloor === count - 1 ? "disabled" : ""} onclick="WorkspaceRefinement.moveFloor(1)">↑ Up</button></div>${StudioUI.button("Storeys & levels", "WorkbenchUI.levelDialog()")}${StudioUI.button("Rooms & objects", "StudioUI.objectsDialog()")}</details>`,
    );
    d.classList.add("refined-floors");
    d.querySelector(".floor-search").oninput = (e) => {
      let visible = 0;
      for (const row of d.querySelectorAll("[data-floor]")) {
        row.hidden = !row.textContent
          .toLowerCase()
          .includes(e.target.value.trim().toLowerCase());
        if (!row.hidden) visible++;
      }
      d.querySelector(".floor-empty").hidden = !!visible;
    };
    WorkspacePolish.clampDialog(d);
    return d;
  },
  switchFloor(i) {
    setFloor(i);
    this.floors();
  },
  renameFloor(value) {
    const name = value.trim();
    if (!name) return StudioUI.message("Enter a floor name.", "error");
    PlanningUI.change("Renamed floor", () => {
      PlanningUI.data.floorNames[currentFloor] = name;
    });
    WorkspaceLayout.update();
    this.floors();
  },
  moveFloor(delta) {
    PlanningUI.swapFloors(currentFloor, currentFloor + delta);
    this.floors();
  },
  init() {
    this.brand();
    this.dock();
    const dialog = StudioUI.dialog;
    StudioUI.dialog = function (title, html) {
      const d = dialog.call(this, title, html);
      WorkspaceRefinement.decorate(d, title);
      return d;
    };
  },
};
document.addEventListener("DOMContentLoaded", () => WorkspaceRefinement.init());
