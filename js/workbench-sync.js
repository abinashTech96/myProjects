/* Durable offline saves are scoped to service + account; credentials stay in sessionStorage. */
const WorkbenchSync = {
  account: (() => {
    try {
      return JSON.parse(
        sessionStorage.getItem("ArchCAD_SyncAccount") || "null",
      );
    } catch {
      return null;
    }
  })(),
  flushing: false,
  async db() {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open("ArchCAD_WorkbenchQueue", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("jobs", { keyPath: "id" });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },
  async jobs() {
    const db = await this.db();
    try {
      return await new Promise((resolve, reject) => {
        const req = db.transaction("jobs").objectStore("jobs").getAll();
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  },
  async store(job) {
    const db = await this.db();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("jobs", "readwrite");
        tx.objectStore("jobs").put(structuredClone(job));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
  async remove(id) {
    const db = await this.db();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("jobs", "readwrite");
        tx.objectStore("jobs").delete(id);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
  async settle(job, result) {
    const db = await this.db();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("jobs", "readwrite"),
          store = tx.objectStore("jobs"),
          req = store.get(job.id);
        req.onsuccess = () => {
          const current = req.result;
          if (!current) return;
          if (result.conflict) {
            current.status = "conflict";
            current.remote = result.conflict;
            current.error = "Remote revision changed; review required";
            store.put(current);
          } else if (result.error) {
            current.status = "error";
            current.error = result.error;
            store.put(current);
          } else if (current.writeKey !== job.writeKey) {
            current.expectedRevision = result.revision;
            current.base = JSON.stringify(result.project);
            store.put(current);
          } else store.delete(job.id);
        };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  },
  async identify() {
    const me = await DesignSync.request("me");
    this.account = { id: me.id, server: DesignSync.server };
    sessionStorage.setItem("ArchCAD_SyncAccount", JSON.stringify(this.account));
    return this.account;
  },
  async queue(project) {
    if (!this.account || this.account.server !== DesignSync.server)
      throw Error("Connect once while online before queuing offline saves");
    const jobs = await this.jobs(),
      same = jobs.find(
        (j) =>
          j.server === DesignSync.server &&
          j.account === this.account.id &&
          j.projectId === DesignSync.projectId &&
          j.status === "pending" &&
          j.expectedRevision === DesignSync.revision,
      ),
      job = {
        id: same?.id || crypto.randomUUID(),
        server: DesignSync.server,
        account: this.account.id,
        projectId: DesignSync.projectId,
        expectedRevision: DesignSync.revision,
        base: DesignSync.localBase,
        project: structuredClone(project),
        clientId: DesignSync.clientId,
        status: "pending",
        createdAt: Date.now(),
        writeKey: crypto.randomUUID(),
      };
    if (
      JSON.stringify(jobs.filter((j) => j.id !== job.id)).length +
        JSON.stringify(job).length >
      30 * 1024 * 1024
    )
      throw Error(
        "Offline queue exceeds 30 MB; export a project ZIP before continuing",
      );
    await this.store(job);
    StudioUI.message("Saved locally; remote upload is queued.");
    await this.refreshStatus();
    return job;
  },
  async send(job) {
    const response = await fetch(
      job.server + "/api/projects/" + job.projectId,
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + DesignSync.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project: job.project,
          expectedRevision: job.expectedRevision,
          clientId: job.clientId,
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const data = await response.json();
    if (response.status === 409) return { conflict: data.current };
    if (!response.ok)
      throw Object.assign(Error(data.error || "Upload failed"), {
        status: response.status,
      });
    return data;
  },
  async push() {
    try {
      if (!DesignSync.projectId)
        throw Error("Open or upload a remote project first");
      const project = ProjectState.capture();
      if (!navigator.onLine) {
        await this.queue(project);
        return;
      }
      const job = {
        server: DesignSync.server,
        projectId: DesignSync.projectId,
        project,
        expectedRevision: DesignSync.revision,
        clientId: DesignSync.clientId,
      };
      let result;
      try {
        result = await this.send(job);
      } catch (error) {
        if (
          error instanceof TypeError ||
          error.name === "TimeoutError" ||
          error.name === "AbortError" ||
          error.status >= 500
        ) {
          await this.queue(project);
          return;
        }
        throw error;
      }
      if (result.conflict) {
        DesignSync.conflict = result.conflict;
        DesignSync.conflictDialog();
        return;
      }
      DesignSync.revision = result.revision;
      DesignSync.localBase = JSON.stringify(result.project);
      DesignSync.conflict = null;
      StudioUI.message("Remote revision " + result.revision + " saved.");
      await DesignSync.list();
    } catch (error) {
      StudioUI.message(error.message, "error");
    }
  },
  async flush() {
    if (this.flushing || !DesignSync.server || !DesignSync.token) return;
    this.flushing = true;
    try {
      await this.identify();
      for (const job of await this.jobs()) {
        if (
          job.server !== DesignSync.server ||
          job.account !== this.account.id ||
          job.status !== "pending"
        )
          continue;
        try {
          const result = await this.send(job);
          if (result.conflict) {
            await this.settle(job, result);
            continue;
          }
          await this.settle(job, result);
          if (DesignSync.projectId === job.projectId) {
            DesignSync.revision = result.revision;
            DesignSync.localBase = JSON.stringify(result.project);
          }
        } catch (error) {
          if (
            error instanceof TypeError ||
            error.name === "TimeoutError" ||
            error.status >= 500
          )
            break;
          await this.settle(job, { error: error.message });
        }
      }
      await this.refreshStatus();
    } catch (error) {
      StudioUI.message("Queue paused: " + error.message, "error");
    } finally {
      this.flushing = false;
    }
  },
  async dialog() {
    await DesignSync.dialog();
    const body = document.querySelector("#studio-dialog .studio-dialog-body");
    body.insertAdjacentHTML(
      "beforeend",
      '<hr><div id="wb-queue-status"></div>' +
        WorkbenchUI.b("Retry queued uploads", "WorkbenchSync.flush()") +
        WorkbenchUI.b("Service health", "WorkbenchSync.health()") +
        "<p>Hosting setup: the repository includes a Docker/Caddy deployment, private user provisioning and backup/restore commands. Deploy it to your chosen server, then connect its HTTPS URL above.</p>",
    );
    await this.refreshStatus();
  },
  async refreshStatus() {
    const box = document.getElementById("wb-queue-status"),
      status = document.getElementById("design-sync-status"),
      jobs = (await this.jobs()).filter(
        (j) =>
          j.server === DesignSync.server &&
          this.account &&
          j.account === this.account.id,
      );
    if (status)
      status.textContent =
        (navigator.onLine ? "Online" : "Offline") +
        " · " +
        jobs.length +
        " queued" +
        (DesignSync.projectId ? " · r" + DesignSync.revision : "");
    if (box)
      box.innerHTML = `<p>${jobs.length} queued uploads for this connection.</p>${jobs.map((j) => `<article><strong>${WorkbenchUI.e(j.project.name)}</strong><p>${j.status} · ${WorkbenchUI.e(j.error || "Waiting to upload")}</p>${j.status === "conflict" ? WorkbenchUI.b("Open queued copy and review", `WorkbenchSync.openConflict('${j.id}')`) : ""}${WorkbenchUI.b("Export queued project", `WorkbenchSync.exportJob('${j.id}')`)}${WorkbenchUI.b("Discard queued upload", `WorkbenchSync.discard('${j.id}')`)}</article>`).join("")}`;
  },
  async openConflict(id) {
    await WorkbenchUI.asyncRun(async () => {
      const job = (await this.jobs()).find((j) => j.id === id);
      if (
        !job ||
        job.account !== this.account?.id ||
        job.server !== DesignSync.server
      )
        throw Error("Connect the matching account first");
      await StorageEngine.snapshot("Before opening queued conflict");
      ProjectState.apply(job.project, { rebase: true });
      AppEvents.triggerStateChange();
      DesignSync.projectId = job.projectId;
      DesignSync.revision = job.expectedRevision;
      DesignSync.localBase = job.base;
      DesignSync.conflict = job.remote;
      DesignSync.conflictDialog();
      this.openJob = id;
    });
  },
  async discard(id) {
    const job = (await this.jobs()).find((j) => j.id === id);
    if (
      !job ||
      job.account !== this.account?.id ||
      job.server !== DesignSync.server
    )
      return;
    await this.remove(id);
    await this.refreshStatus();
  },
  async exportJob(id) {
    const job = (await this.jobs()).find((j) => j.id === id);
    if (
      job &&
      job.account === this.account?.id &&
      job.server === DesignSync.server
    )
      NavActionEngine.downloadBlob(
        JSON.stringify(job.project, null, 2),
        "ArchCAD_Queued_Project.json",
        "application/json",
      );
  },
  async health() {
    await WorkbenchUI.asyncRun(async () => {
      if (!DesignSync.server) throw Error("Connect a project service first");
      const response = await fetch(DesignSync.server + "/api/health", {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw Error("Service health check failed");
      StudioUI.message("Project service is reachable.");
    });
  },
  async loadIssues() {
    await WorkbenchUI.asyncRun(async () => {
      if (!DesignSync.projectId) throw Error("Open a remote project first");
      const data = await DesignSync.request(
        "projects/" + DesignSync.projectId + "/issues",
      );
      WorkbenchUI.change("Imported shared review issues", () => {
        for (const raw of data.issues) {
          const issue = { ...raw, remote: true };
          const i = WorkbenchUI.data.issues.findIndex((v) => v.id === issue.id);
          if (i >= 0) WorkbenchUI.data.issues[i] = issue;
          else WorkbenchUI.data.issues.push(issue);
        }
      });
      WorkbenchUI.issueDialog();
    });
  },
};
const wbConnect = DesignSync.connect;
DesignSync.connect = async function () {
  await wbConnect.call(this);
  if (this.server && this.token)
    try {
      await WorkbenchSync.identify();
      await WorkbenchSync.flush();
    } catch (error) {
      StudioUI.message(error.message, "error");
    }
};
DesignSync.push = () => WorkbenchSync.push();
window.addEventListener("online", () => WorkbenchSync.flush());
window.addEventListener("offline", () => WorkbenchSync.refreshStatus());
const wbAcceptRemote = DesignSync.acceptRemote;
DesignSync.acceptRemote = async function () {
  await wbAcceptRemote.call(this);
  if (WorkbenchSync.openJob) {
    await WorkbenchSync.remove(WorkbenchSync.openJob);
    WorkbenchSync.openJob = null;
  }
};
