/* Complete, validated snapshots shared by history, files and recovery. */
const ProjectState = {
  data: {
    elements: [],
    fixtures: [],
    currentFloor: 0,
    globalCompassDir: "West",
    selectedElIndex: -1,
  },
  meta: {
    name: "Untitled plan",
    author: "",
    layouts: {},
    wallSettings: { external: 9, internal: 4.5, height: 120 },
    wallOverrides: {},
    constraints: [],
    planning: PlanningModel.defaults(),
    design: DesignModel.defaults(),
    view: {},
  },
  history: {
    stack: [],
    redoStack: [],
    baseState: null,
    clipboard: null,
    MAX_HISTORY: 50,
  },
  applying: false,
  batchDepth: 0,
  _clone(value) {
    return structuredClone(value);
  },
  capture() {
    const value = (id, fallback) =>
      document.getElementById(id)?.value ?? fallback;
    const plot = {};
    for (const [id, fallback] of Object.entries(ProjectModel.PLOT_DEFAULTS))
      plot[id] = value(id, fallback);
    const view = {
      ...this._clone(this.meta.view),
      parapet: value("parapetStyleSelect", "premium-canopy"),
      ...(typeof ParapetModule !== "undefined"
        ? { parapetConfig: this._clone(ParapetModule.config) }
        : {}),
      ...(typeof tourWaypoints !== "undefined"
        ? { tour: this._clone(tourWaypoints) }
        : {}),
      theme: document.body?.classList.contains("classic-theme")
        ? "classic"
        : "dark",
      ...(typeof CanvasControlsEngine !== "undefined"
        ? { toggles: { ...CanvasControlsEngine.state } }
        : {}),
      ...(typeof CanvasState !== "undefined"
        ? {
            camera: {
              panX: CanvasState.panX,
              panY: CanvasState.panY,
              zoomLvl: CanvasState.zoomLvl,
            },
          }
        : {}),
    };
    return {
      version: "2.0",
      ...this._clone(this.meta),
      view,
      elements: this._clone(this.data.elements),
      fixtures: this._clone(this.data.fixtures),
      currentFloor: this.data.currentFloor,
      compass: this.data.globalCompassDir,
      unit: value("unitSelect", "in"),
      scale: Number(value("scaleInput", 1.2)),
      floorCount: Number(value("b-floors", 1)),
      plot,
    };
  },
  apply(raw, { rebase = false, selection = null } = {}) {
    const project = ProjectModel.normalize(raw);
    this.applying = true;
    try {
      this.data.elements = project.elements;
      this.data.fixtures = project.fixtures;
      this.data.currentFloor = project.currentFloor;
      this.data.globalCompassDir = project.compass;
      this.data.selectedElIndex = selection ? project.elements.findIndex(el => el.id === selection.primary) : -1;
      for (const k of [
        "name",
        "author",
        "layouts",
        "wallSettings",
        "wallOverrides",
        "constraints",
        "planning",
        "design",
        "view",
      ])
        this.meta[k] = project[k];
      const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      };
      Object.entries(project.plot).forEach(([id, v]) => set(id, v));
      set("unitSelect", project.unit);
      set("scaleInput", project.scale);
      set("b-floors", project.floorCount);
      set("compassDir", project.compass);
      if (typeof ARCH_CONFIG !== "undefined")
        ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D = project.wallSettings.height;
      if (typeof ARCH3D_CONFIG !== "undefined")
        ARCH3D_CONFIG.DEFAULTS.WALL_HEIGHT = project.wallSettings.height;
      if (typeof Selection !== "undefined")
        Selection.ids = new Set(selection ? selection.ids.filter(id => project.elements.some(el => el.id === id)) : []);
      if (project.view.parapet) set("parapetStyleSelect", project.view.parapet);
      if (typeof ParapetModule !== "undefined" && project.view.parapetConfig)
        Object.assign(ParapetModule.config, project.view.parapetConfig);
      if (typeof tourWaypoints !== "undefined" && project.view.tour)
        window.tourWaypoints = this._clone(project.view.tour);
      if (document.body && project.view.theme)
        document.body.classList.toggle(
          "classic-theme",
          project.view.theme === "classic",
        );
      if (typeof CanvasControlsEngine !== "undefined" && project.view.toggles) {
        for (const key of Object.keys(CanvasControlsEngine.state)) {
          if (typeof project.view.toggles[key] === "boolean") {
            CanvasControlsEngine.state[key] = project.view.toggles[key];
            const input = document.getElementById(key);
            if (input) input.checked = project.view.toggles[key];
          }
        }
      }
      if (typeof CanvasState !== "undefined" && project.view.camera) {
        for (const key of ["panX", "panY", "zoomLvl"])
          if (Number.isFinite(project.view.camera[key]))
            CanvasState[key] = project.view.camera[key];
        if (typeof updateViewport === "function") updateViewport();
      }
      if (typeof renderFloorSelectors === "function") renderFloorSelectors();
      if (typeof StudioUI !== "undefined") {
        StudioUI.syncProject();
        if (StudioUI.ready && project.view.mode)
          setWorkspaceLayout(project.view.mode);
      }
      if (rebase) {
        this.history.stack = [];
        this.history.redoStack = [];
        this.history.baseState = this.capture();
      }
    } finally {
      this.applying = false;
    }
    return project;
  },
  baseline() {
    if (!this.history.baseState) this.history.baseState = this.capture();
  },
  _buildStateFromHistory(i) {
    return this._clone(
      i < 0 ? this.history.baseState : this.history.stack[i].after,
    );
  },
  saveState(action = "Edited project") {
    if (this.applying || this.batchDepth) return;
    this.baseline();
    const current = ProjectModel.normalize(this.capture());
    const previous = this.history.stack.at(-1)?.after || this.history.baseState;
    const comparable = (p) => {
      const { mode, camera, toggles, theme, ...designView } = p.view || {};
      return JSON.stringify(
        { ...p, currentFloor: 0, view: designView },
        (_, v) =>
          v && typeof v === "object" && !Array.isArray(v)
            ? Object.fromEntries(
                Object.keys(v)
                  .sort()
                  .map((k) => [k, v[k]]),
              )
            : v,
      );
    };
    if (comparable(current) === comparable(previous)) return;
    this.history.stack.push({
      action,
      time: new Date().toLocaleTimeString(),
      before: this._clone(previous),
      after: current,
    });
    this.history.redoStack = [];
    if (this.history.stack.length > this.history.MAX_HISTORY) {
      this.history.baseState = this.history.stack.shift().after;
    }
    if (typeof renderTimeMachine === "function") renderTimeMachine();
    StorageEngine.markDirty();
    if (typeof StudioUI !== "undefined") StudioUI.updateStatus();
  },
  commit(action, mutation) {
    if (this.batchDepth) {
      mutation();
      return true;
    }
    this.baseline();
    this.saveState("Edited project");
    const before = this.capture();
    const selectedId = this.data.elements[this.data.selectedElIndex]?.id;
    const selectionIds = typeof Selection !== "undefined" ? [...Selection.ids] : [];
    this.batchDepth++;
    try {
      mutation();
      const next = ProjectModel.solveConstraints(
        ProjectModel.normalize(this.capture()),
      );
      const width = ProjectModel.inches(next.plot.inW, next.unit),
        depth = ProjectModel.inches(next.plot.inH, next.unit);
      next.elements.forEach((el) => {
        const old = before.elements.find((e) => e.id === el.id),
          changed =
            !old ||
            ["x", "y", "w", "h", "rot", "floor"].some((k) => el[k] !== old[k]);
        const turned = el.isFurniture && el.rot % 180 === 90,
          w = turned ? el.h : el.w,
          h = turned ? el.w : el.h;
        if (
          changed &&
          (el.x < 0 ||
            el.y < 0 ||
            el.x + w > width + 0.001 ||
            el.y + h > depth + 0.001)
        )
          throw new Error("Changed elements must fit inside the plot.");
      });
      if (typeof ARCH_CONFIG !== "undefined")
        ARCH_CONFIG.DEFAULTS.WALL_HEIGHT_3D = next.wallSettings.height;
      if (typeof ARCH3D_CONFIG !== "undefined")
        ARCH3D_CONFIG.DEFAULTS.WALL_HEIGHT = next.wallSettings.height;
      this.data.elements = next.elements;
      this.data.fixtures = next.fixtures;
      this.meta.planning = next.planning;
      this.meta.design = next.design;
      this.batchDepth--;
      this.saveState(action);
      if (typeof AppEvents !== "undefined") AppEvents.triggerStateChange();
      return true;
    } catch (error) {
      this.batchDepth--;
      this.apply(before, {selection: {primary: selectedId, ids: selectionIds}});
      if (typeof AppEvents !== "undefined") AppEvents.triggerStateChange();
      if (typeof StudioUI !== "undefined")
        StudioUI.message(error.message, "error");
      else console.warn(error.message);
      return false;
    }
  },
  selectionSnapshot() {
    const primary = this.data.elements[this.data.selectedElIndex]?.id;
    return {
      primary,
      ids: typeof Selection !== "undefined" ? [...Selection.ids] : primary ? [primary] : [],
    };
  },
  undo() {
    const selection = this.selectionSnapshot();
    this.saveState();
    const item = this.history.stack.pop();
    if (!item) return false;
    this.history.redoStack.push(item);
    this.apply(item.before, { selection });
    StorageEngine.markDirty();
    return true;
  },
  redo() {
    const selection = this.selectionSnapshot();
    const item = this.history.redoStack.pop();
    if (!item) return false;
    this.history.stack.push(item);
    this.apply(item.after, { selection });
    StorageEngine.markDirty();
    return true;
  },
  jumpToTime(i) {
    if (i < 0 || i >= this.history.stack.length) return false;
    while (this.history.stack.length > i + 1)
      this.history.redoStack.push(this.history.stack.pop());
    this.apply(this.history.stack[i].after);
    StorageEngine.markDirty();
    if (typeof AppEvents !== "undefined") AppEvents.triggerStateChange();
    return true;
  },
  deleteElement(idx) {
    if (!this.data.elements[idx] || this.data.elements[idx].locked)
      return false;
    return this.commit("Deleted element", () => this.removeIndices([idx]));
  },
  removeIndices(indices) {
    const removed = new Set(indices.map((i) => this.data.elements[i]?.id));
    const old = this.data.elements;
    this.data.elements = old.filter((_, i) => !indices.includes(i));
    this.data.fixtures = this.data.fixtures
      .filter((f) => !indices.includes(f.roomId))
      .map((f) => ({
        ...f,
        roomId: this.data.elements.indexOf(old[f.roomId]),
      }));
    this.meta.constraints = this.meta.constraints.filter(
      (r) => !removed.has(r.source) && !removed.has(r.target),
    );
    this.data.selectedElIndex = -1;
  },
  updateElement(idx, patch, action = "Updated element") {
    if (
      !this.data.elements[idx] ||
      (this.data.elements[idx].locked && !("locked" in patch))
    )
      return false;
    return this.commit(action, () =>
      Object.assign(this.data.elements[idx], patch),
    );
  },
  updateFixture(idx, patch, action = "Updated opening") {
    return this.commit(action, () =>
      Object.assign(this.data.fixtures[idx], patch),
    );
  },
};
[
  "elements",
  "fixtures",
  "currentFloor",
  "globalCompassDir",
  "selectedElIndex",
].forEach((key) =>
  Object.defineProperty(window, key, {
    get: () => ProjectState.data[key],
    set: (value) => {
      ProjectState.data[key] = value;
    },
  }),
);
Object.defineProperty(window, "clipboard", {
  get: () => ProjectState.history.clipboard,
  set: (value) => {
    ProjectState.history.clipboard = value;
  },
});
const StorageEngine = {
  DB_NAME: "ArchCAD_Storage",
  STORE_NAME: "autosaves",
  dbNeedsSave: false,
  loading: true,
  saving: false,
  revision: 0,
  lastSaved: "",
  error: "",
  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        if (!e.target.result.objectStoreNames.contains(this.STORE_NAME))
          e.target.result.createObjectStore(this.STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async write(key, value) {
    const db = await this.initDB();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error("Save cancelled"));
        tx.objectStore(this.STORE_NAME).put(value, key);
      });
    } finally {
      db.close();
    }
  },
  async read(key) {
    const db = await this.initDB();
    try {
      return await new Promise((resolve, reject) => {
        const request = db
          .transaction(this.STORE_NAME, "readonly")
          .objectStore(this.STORE_NAME)
          .get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } finally {
      db.close();
    }
  },
  async saveToMemory() {
    if (this.loading) return;
    if (this.saveInFlight) {
      await this.saveInFlight;
      // An explicit save must also flush edits made during an older autosave.
      if (this.dbNeedsSave && !this.error) return this.saveToMemory();
      return;
    }
    const pending = this.persistToMemory();
    this.saveInFlight = pending;
    try { await pending; }
    finally { if (this.saveInFlight === pending) this.saveInFlight = null; }
  },
  async persistToMemory() {
    this.saving = true;
    const revision = this.revision;
    try {
      const data = {
        ...ProjectModel.normalize(ProjectState.capture()),
        savedAt: new Date().toISOString(),
      };
      try {
        await this.write("latest_session", data);
      } catch (error) {
        localStorage.setItem("ArchCAD_AutoSave", JSON.stringify(data));
      }
      this.lastSaved = new Date().toLocaleTimeString();
      this.error = "";
      if (revision === this.revision) this.dbNeedsSave = false;
    } catch (error) {
      this.error = error.message;
      this.dbNeedsSave = true;
    } finally {
      this.saving = false;
      if (typeof StudioUI !== "undefined") StudioUI.updateStatus();
    }
  },
  async loadFromMemory() {
    try {
      let data;
      try {
        data = await this.read("latest_session");
      } catch {}
      const fallback = localStorage.getItem("ArchCAD_AutoSave");
      if (fallback) {
        const local = JSON.parse(fallback);
        if (
          !data ||
          (Date.parse(local.savedAt) || 0) > (Date.parse(data.savedAt) || 0)
        )
          data = local;
      }
      if (data && confirm("Restore your last saved design?"))
        ProjectState.apply(data, { rebase: true });
    } catch (error) {
      this.error = `Recovery failed: ${error.message}`;
    } finally {
      this.loading = false;
      ProjectState.baseline();
      if (typeof AppEvents !== "undefined") AppEvents.triggerStateChange();
    }
  },
  markDirty() {
    if (!this.loading && !ProjectState.applying) {
      this.dbNeedsSave = true;
      this.revision++;
    }
  },
  startThrottler() {
    setInterval(() => {
      if (this.dbNeedsSave) this.saveToMemory();
    }, 1500);
  },
  async versions() {
    try {
      return (await this.read("versions")) || [];
    } catch {
      try {
        return JSON.parse(localStorage.getItem("ArchCAD_Versions") || "[]");
      } catch {
        return [];
      }
    }
  },
  async snapshot(label) {
    const versions = await this.versions();
    versions.unshift({
      id: ProjectModel.uid(),
      label: String(label || "Snapshot").slice(0, 80),
      time: new Date().toISOString(),
      project: ProjectState.capture(),
    });
    const kept = versions.slice(0, 15);
    try {
      await this.write("versions", kept);
    } catch {
      localStorage.setItem("ArchCAD_Versions", JSON.stringify(kept));
    }
    return kept;
  },
  async clearSession() {
    try {
      const db = await this.initDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(this.STORE_NAME, "readwrite");
        tx.objectStore(this.STORE_NAME).delete("latest_session");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } finally {
      localStorage.removeItem("ArchCAD_AutoSave");
    }
  },
  emergencySave() {
    if (this.dbNeedsSave && !this.loading) {
      try {
        localStorage.setItem(
          "ArchCAD_AutoSave",
          JSON.stringify({
            ...ProjectState.capture(),
            savedAt: new Date().toISOString(),
          }),
        );
      } catch {}
    }
  },
};
StorageEngine.startThrottler();
window.addEventListener("pagehide", () => StorageEngine.emergencySave());
document.addEventListener("visibilitychange", () => {
  if (document.hidden) StorageEngine.emergencySave();
});
window.undoAction = () => {
  ProjectState.undo();
  AppEvents.triggerStateChange();
};
window.redoAction = () => {
  ProjectState.redo();
  AppEvents.triggerStateChange();
};
window.saveToMemory = () => StorageEngine.saveToMemory();
window.loadFromMemory = () => StorageEngine.loadFromMemory();
window.markStateDirty = () => StorageEngine.markDirty();
window.saveState = (action) => ProjectState.saveState(action);
