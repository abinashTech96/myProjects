/* Explicit project sync. Tokens stay in sessionStorage and never enter portable projects. */
const DesignSync = {
  clientId: crypto.randomUUID(),
  revision: 0,
  projectId: "",
  server: "",
  token: "",
  timer: null,
  localBase: "",
  conflict: null,
  owned: new Set(),
  async request(route, method = "GET", body) {
    if (!this.server || !this.token)
      throw Error("Configure the project service URL and access token");
    const response = await fetch(this.server + "/api/" + route, {
      method,
      headers: {
        Authorization: "Bearer " + this.token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json();
    if (response.status === 409) {
      this.conflict = data.current;
      throw Error(
        "Remote revision changed. Review the conflict before saving.",
      );
    }
    if (!response.ok)
      throw Error(data.error || "Project service request failed");
    return data;
  },
  async dialog() {
    this.server = sessionStorage.getItem("ArchCAD_ProjectServer") || "";
    this.token = sessionStorage.getItem("ArchCAD_ProjectToken") || "";
    DesignUI.dialog(
      "Cloud projects, reviews and collaboration",
      `${DesignUI.field("sync-server", "Project service URL", this.server, "url")}${DesignUI.field("sync-token", "Access token", this.token, "password")}${DesignUI.b("Connect", "DesignSync.connect()", "primary")}<p>Uses a separately deployed authenticated project service. Core editing remains available on GitHub Pages without it.</p><div id="sync-results"></div>`,
    );
    if (this.server && this.token)
      await this.list().catch((e) => StudioUI.message(e.message, "error"));
  },
  async connect() {
    try {
      const url = new URL(DesignUI.val("sync-server"));
      if (
        url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(url.hostname)
        )
      )
        throw Error("Use HTTPS or a local development URL");
      this.server = url.origin + url.pathname.replace(/\/$/, "");
      this.token = DesignUI.val("sync-token");
      sessionStorage.setItem("ArchCAD_ProjectServer", this.server);
      sessionStorage.setItem("ArchCAD_ProjectToken", this.token);
      await this.list();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async list() {
    const data = await this.request("projects");
    const box = document.getElementById("sync-results");
    if (!box) return;
    box.innerHTML =
      DesignUI.b("Upload as new remote project", "DesignSync.create()") +
      data.projects
        .map(
          (p) =>
            `<div class="planning-record"><strong>${DesignUI.e(p.name)}</strong><small>Revision ${p.revision}</small>${DesignUI.b("Open", `DesignSync.open('${p.id}')`)}</div>`,
        )
        .join("") +
      (this.projectId
        ? `<p>Connected project ${this.projectId} · revision ${this.revision}</p>${DesignUI.b("Push current revision", "DesignSync.push()")}${DesignUI.b("Pull remote revision", "DesignSync.pull()")}${DesignUI.b("Review conflict", "DesignSync.conflictDialog()")}${DesignUI.b("Create review link", "DesignSync.shareDialog()")}${DesignUI.b("Members / presence", "DesignSync.membersDialog()")}${DesignUI.b("Own selected object", "DesignSync.lockSelection()")}${DesignUI.b("Release object", "DesignSync.releaseSelection()")}${DesignUI.b("Comments", "DesignSync.commentsDialog()")}`
        : "");
  },
  async create() {
    try {
      const d = await this.request("projects", "POST", {
        project: ProjectState.capture(),
      });
      this.setSession(d);
      await this.list();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  setSession(d) {
    this.owned.clear();
    this.conflict = null;
    this.projectId = d.id;
    this.revision = d.revision;
    this.localBase = JSON.stringify(d.project);
    clearInterval(this.timer);
    this.timer = setInterval(
      () =>
        this.poll().catch((e) => {
          clearInterval(this.timer);
          StudioUI.message("Project sync paused: " + e.message, "error");
        }),
      8000,
    );
    this.poll().catch(() => {});
  },
  async open(id) {
    try {
      const d = await this.request("projects/" + id);
      await StorageEngine.snapshot("Before opening remote project");
      ProjectState.apply(d.project, { rebase: true });
      AppEvents.triggerStateChange();
      this.setSession(d);
      await this.list();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async push() {
    try {
      const d = await this.request("projects/" + this.projectId, "PUT", {
        project: ProjectState.capture(),
        expectedRevision: this.revision,
        clientId: this.clientId,
      });
      this.revision = d.revision;
      this.localBase = JSON.stringify(d.project);
      this.conflict = null;
      StudioUI.message("Remote revision " + this.revision + " saved.");
      await this.list();
    } catch (e) {
      StudioUI.message(e.message, "error");
      if (this.conflict) this.conflictDialog();
    }
  },
  async pull() {
    try {
      const d = await this.request("projects/" + this.projectId);
      if (JSON.stringify(ProjectState.capture()) !== this.localBase) {
        this.conflict = d;
        return this.conflictDialog();
      }
      ProjectState.apply(d.project, { rebase: true });
      AppEvents.triggerStateChange();
      this.revision = d.revision;
      this.localBase = JSON.stringify(d.project);
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async poll() {
    if (!this.projectId) return;
    await this.request("projects/" + this.projectId + "/presence", "POST", {
      clientId: this.clientId,
      state: Selection.ids.size
        ? "Editing " + Selection.ids.size + " objects"
        : "Viewing",
    });
    for (const objectId of this.owned)
      await this.request("projects/" + this.projectId + "/locks", "POST", {
        clientId: this.clientId,
        objectId,
      });
    const p = await this.request("projects/" + this.projectId + "/presence");
    this.presence = p;
    const status = document.getElementById("design-sync-status");
    if (status)
      status.textContent =
        p.presence.length + " editing sessions · remote r" + p.revision;
    if (
      p.revision > this.revision &&
      JSON.stringify(ProjectState.capture()) === this.localBase
    )
      await this.pull();
  },
  conflictDialog() {
    if (!this.conflict) return StudioUI.message("No remote conflict.");
    const local = ProjectState.capture(),
      remote = this.conflict.project;
    DesignUI.dialog(
      "Resolve remote revision conflict",
      `<p>Local edits and remote revision ${this.conflict.revision} differ. Both designs are preserved until you choose.</p><div class="design-diff"><div><strong>Local</strong>${PlanningDrawing.thumbnail(local)}</div><div><strong>Remote</strong>${PlanningDrawing.thumbnail(remote)}</div></div>${DesignUI.b("Keep local as a new remote project", "DesignSync.create()")}${DesignUI.b("Snapshot local, then accept remote", "DesignSync.acceptRemote()")}${DesignUI.b("Merge non-conflicting objects", "DesignSync.mergeConflict()")}`,
    );
  },
  async acceptRemote() {
    await StorageEngine.snapshot("Before accepting remote conflict");
    const d = this.conflict;
    ProjectState.apply(d.project, { rebase: true });
    AppEvents.triggerStateChange();
    this.revision = d.revision;
    this.localBase = JSON.stringify(d.project);
    this.conflict = null;
    document.getElementById("studio-dialog").close();
  },
  mergeConflict() {
    try {
      const base = JSON.parse(this.localBase),
        local = ProjectState.capture(),
        remote = this.conflict.project,
        merged = structuredClone(remote);
      for (const key of ["elements", "fixtures"]) {
        const a = new Map(base[key].map((e) => [e.id, e])),
          l = new Map(local[key].map((e) => [e.id, e])),
          r = new Map(remote[key].map((e) => [e.id, e]));
        for (const id of new Set([...a.keys(), ...l.keys(), ...r.keys()])) {
          const before = JSON.stringify(a.get(id)),
            left = JSON.stringify(l.get(id)),
            right = JSON.stringify(r.get(id));
          if (left !== before && right !== before && left !== right)
            throw Error(
              "Both sessions changed " +
                id +
                ". Choose local copy or remote explicitly.",
            );
          if (left !== before) {
            merged[key] = merged[key].filter((e) => e.id !== id);
            if (l.has(id)) merged[key].push(l.get(id));
          }
        }
      }
      for (const key of [
        "planning",
        "design",
        "plot",
        "wallSettings",
        "constraints",
        "wallOverrides",
        "floorCount",
        "unit",
        "compass",
      ]) {
        const before = JSON.stringify(base[key]),
          left = JSON.stringify(local[key]),
          right = JSON.stringify(remote[key]);
        if (left !== before && right !== before && left !== right)
          throw Error("Both sessions changed " + key + ". Resolve explicitly.");
        if (left !== before) merged[key] = local[key];
      }
      merged.view ||= {};
      for (const key of ["parapet", "parapetConfig"]) {
        const before = JSON.stringify(base.view?.[key]),
          left = JSON.stringify(local.view?.[key]), right = JSON.stringify(remote.view?.[key]);
        if (left !== before && right !== before && left !== right)
          throw Error("Both sessions changed " + key + ". Resolve explicitly.");
        if (left !== before) {
          if (local.view?.[key] === undefined) delete merged.view[key];
          else merged.view[key] = ProjectModel.clone(local.view[key]);
        }
      }
      merged.fixtures = merged.fixtures.map((f) => ({
        ...f,
        roomId: merged.elements.findIndex((e) => e.id === f.roomUid),
      }));
      const normalized = ProjectModel.normalize(merged);
      if (DesignUI.apply(normalized, "Merged collaboration revision")) {
        this.revision = this.conflict.revision;
        this.localBase = JSON.stringify(remote);
        this.conflict = null;
        document.getElementById("studio-dialog").close();
        StudioUI.message("Merged locally. Review and push the new revision.");
      }
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  shareDialog() {
    DesignUI.dialog(
      "Create a read-only review link",
      `${DesignUI.field("share-days", "Expires after days", 7, "number")}<label><input type="checkbox" id="share-comments">Allow anchored comments</label>${DesignUI.b("Create review link", "DesignSync.share()")}<div id="share-result"></div>`,
    );
  },
  async share() {
    try {
      const d = await this.request(
        "projects/" + this.projectId + "/shares",
        "POST",
        {
          days: DesignUI.num("share-days"),
          comments: document.getElementById("share-comments").checked,
        },
      );
      const url = new URL("review.html", location.href);
      url.hash = new URLSearchParams({
        server: this.server,
        project: this.projectId,
        token: d.token,
      }).toString();
      document.getElementById("share-result").innerHTML =
        DesignUI.field("review-link", "Read-only review URL", url.href) +
        DesignUI.b(
          "Copy link",
          "PlanningUI.copy(document.getElementById('review-link').value)",
        );
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  membersDialog() {
    const presence = this.presence?.presence || [];
    DesignUI.dialog(
      "Members and live presence",
      `${DesignUI.field("member-user", "Configured user identity", "")}${DesignUI.select("member-role", "Role", ["editor", "viewer", "remove"], "editor")}${DesignUI.b("Update member", "DesignSync.member()")}<p>${presence.map((p) => DesignUI.e(p.user + " · " + p.state)).join("<br>") || "No other sessions"}</p><p>Object ownership has a renewable 30-second lease; concurrent saves use revision checks.</p>`,
    );
  },
  async member() {
    try {
      await this.request("projects/" + this.projectId + "/members", "POST", {
        user: DesignUI.val("member-user"),
        role: DesignUI.val("member-role"),
      });
      StudioUI.message("Membership updated.");
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async lockSelection() {
    try {
      for (const id of Selection.ids) {
        await this.request("projects/" + this.projectId + "/locks", "POST", {
          objectId: id,
          clientId: this.clientId,
        });
        this.owned.add(id);
      }
      StudioUI.message("Selected objects owned by this session.");
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async releaseSelection() {
    try {
      for (const id of this.owned)
        await this.request("projects/" + this.projectId + "/locks", "POST", {
          objectId: id,
          clientId: this.clientId,
          release: true,
        });
      this.owned.clear();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async commentsDialog() {
    try {
      const d = await this.request("projects/" + this.projectId);
      this.comments = d.comments;
      DesignUI.dialog(
        "Anchored project comments",
        `${DesignUI.field("comment-text", "Comment", "")}${DesignUI.b("Comment on selected object", "DesignSync.addComment()")}${d.comments.map((c, i) => `<div class="design-review-comment"><strong>${DesignUI.e(c.user)}</strong><p>${DesignUI.e(c.text)}</p>${DesignUI.b("Locate", `DesignSync.focusComment(${i})`)}</div>`).join("")}`,
      );
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  async addComment() {
    try {
      const e = elements[selectedElIndex];
      await this.request("projects/" + this.projectId + "/comments", "POST", {
        text: DesignUI.val("comment-text"),
        anchor: {
          floor: currentFloor,
          x: e?.x || 0,
          y: e?.y || 0,
          objectId: e?.id || "",
        },
      });
      this.commentsDialog();
    } catch (e) {
      StudioUI.message(e.message, "error");
    }
  },
  focusComment(i) {
    const c = this.comments[i];
    setFloor(c.anchor.floor);
    const index = elements.findIndex((e) => e.id === c.anchor.objectId);
    if (index >= 0) PlanningUI.focusRoom(index);
    else {
      DesignUI.overlay = [
        { a: c.anchor, b: { x: c.anchor.x + 12, y: c.anchor.y + 12 } },
      ];
      document.getElementById("studio-dialog").close();
      DesignUI.render();
    }
  },
};
document.addEventListener("DOMContentLoaded", () => {
  const status = document.createElement("span");
  status.id = "design-sync-status";
  document.querySelector(".studio-status").append(status);
});
window.addEventListener("pagehide", () => clearInterval(DesignSync.timer));

// Optional autosync uses the same revision checks; conflicts pause rather than overwrite.
DesignSync.auto = false;
DesignSync.pendingSave = null;
const designSyncDialog = DesignSync.list;
DesignSync.list = async function () {
  await designSyncDialog.call(this);
  const box = document.getElementById("sync-results");
  if (box && this.projectId)
    box.insertAdjacentHTML(
      "beforeend",
      `<label><input type="checkbox" ${this.auto ? "checked" : ""} onchange="DesignSync.auto=this.checked">Automatically sync reviewed local changes</label>`,
    );
};
AppEvents.onStateChange(() => {
  if (!DesignSync.auto || !DesignSync.projectId || DesignSync.conflict) return;
  clearTimeout(DesignSync.pendingSave);
  DesignSync.pendingSave = setTimeout(() => {
    if (JSON.stringify(ProjectState.capture()) !== DesignSync.localBase)
      DesignSync.push();
  }, 2000);
});
