/* Scoped review-link issue and markup controls. All user text is assigned through DOM APIs. */
const ReviewWorkbench = {
  anchor: { floor: 0, x: 0, y: 0 },
  active: null,
  issues: [],
  markups: [],
  bound: new WeakSet(),
  async request(path = "", method = "GET", body) {
    const p = new URLSearchParams(location.hash.slice(1)),
      server = new URL(p.get("server"));
    if (
      server.protocol !== "https:" &&
      !(
        server.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(server.hostname)
      )
    )
      throw Error("Invalid review service URL");
    const id = p.get("project");
    if (!/^[\w-]{1,100}$/.test(id || "")) throw Error("Invalid review project");
    const r = await fetch(
        server.href.replace(/\/$/, "") + "/api/projects/" + id + "/" + path,
        {
          method,
          headers: {
            Authorization: "Bearer " + p.get("token"),
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: AbortSignal.timeout(15000),
        },
      ),
      data = await r.json();
    if (!r.ok) throw Error(data.error || "Review action failed");
    return data;
  },
  async init() {
    const section = document.createElement("section");
    section.id = "review-workbench";
    section.innerHTML =
      '<h2>Review issues and markup</h2><label>Issue title<input id="review-issue-title"></label><label>Description<input id="review-issue-description"></label><label>Assignee<input id="review-issue-assignee"></label><label>Priority<select id="review-issue-priority"><option>normal</option><option>low</option><option>high</option><option>urgent</option></select></label><label>Due date<input id="review-issue-due" type="date"></label><button id="review-issue-post">Create issue at drawing anchor</button><label>Markup<select id="review-markup-kind"><option>arrow</option><option>pen</option><option>measure</option></select></label><input id="review-markup-color" type="color" value="#f59e0b" aria-label="Markup colour"><input id="review-markup-label" aria-label="Markup label" placeholder="Markup note"><button id="review-markup-start">Draw markup</button><button id="review-markup-cancel">Cancel markup</button><div id="review-issues"></div>';
    document.querySelector("main").append(section);
    document.getElementById("review-issue-post").onclick = () =>
      this.addIssue();
    document.getElementById("review-markup-start").onclick = () => {
      this.active = {
        kind: document.getElementById("review-markup-kind").value,
        color: document.getElementById("review-markup-color").value,
        label: document.getElementById("review-markup-label").value,
        floor: Number(document.getElementById("floor").value),
        points: [],
      };
      this.status("Click two points, or drag for a pen stroke.");
    };
    document.getElementById("review-markup-cancel").onclick = () => {
      this.active = null;
    };
    new MutationObserver(() => this.bind()).observe(
      document.getElementById("drawing"),
      { childList: true },
    );
    document
      .getElementById("floor")
      .addEventListener("change", () => this.render());
    this.bind();
    await this.load();
  },
  status(text) {
    document.getElementById("status").textContent = text;
  },
  point(svg, event) {
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: p.x, y: p.y };
  },
  bind() {
    const svg = document.querySelector("#drawing svg");
    if (!svg || this.bound.has(svg)) return;
    this.bound.add(svg);
    svg.addEventListener(
      "click",
      (event) => {
        const q = this.point(svg, event);
        this.anchor = {
          ...q,
          floor: Number(document.getElementById("floor").value),
        };
        if (this.active?.kind !== "pen" && this.active) {
          this.active.points.push(q);
          if (this.active.points.length === 2) this.saveMarkup();
        }
      },
      true,
    );
    let down = false;
    svg.addEventListener("pointerdown", (event) => {
      if (this.active?.kind !== "pen") return;
      down = true;
      event.preventDefault();
      this.active.points = [this.point(svg, event)];
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", (event) => {
      if (down && this.active && this.active.points.length < 2000)
        this.active.points.push(this.point(svg, event));
    });
    svg.addEventListener("pointerup", () => {
      if (down) {
        down = false;
        this.saveMarkup();
      }
    });
    this.render();
  },
  async load() {
    try {
      const [issues, markups] = await Promise.all([
        this.request("issues"),
        this.request("markups"),
      ]);
      this.issues = issues.issues;
      this.markups = markups.markups;
      this.loaded = true;
      this.render();
    } catch (error) {
      this.status(error.message);
    }
  },
  async addIssue() {
    try {
      const issue = await this.request("issues", "POST", {
        title: document.getElementById("review-issue-title").value,
        description: document.getElementById("review-issue-description").value,
        assignee: document.getElementById("review-issue-assignee").value,
        priority: document.getElementById("review-issue-priority").value,
        due: document.getElementById("review-issue-due").value,
        anchor: this.anchor,
      });
      this.issues.push(issue);
      this.status("Review issue created.");
      this.render();
    } catch (error) {
      this.status(error.message);
    }
  },
  async saveMarkup() {
    const value = this.active;
    this.active = null;
    if (!value || value.points.length < 2) return;
    try {
      const markup = await this.request("markups", "POST", value);
      this.markups.push(markup);
      this.status("Drawing markup saved.");
      this.render();
    } catch (error) {
      this.status(error.message);
    }
  },
  render() {
    const svg = document.querySelector("#drawing svg");
    if (!svg) return;
    svg.querySelector("[data-review-overlay]")?.remove();
    const ns = svg.namespaceURI,
      group = document.createElementNS(ns, "g"),
      floor = Number(document.getElementById("floor").value),
      node = (type, attributes, text) => {
        const n = document.createElementNS(ns, type);
        for (const [k, v] of Object.entries(attributes)) n.setAttribute(k, v);
        if (text !== undefined) n.textContent = text;
        group.append(n);
        return n;
      };
    group.dataset.reviewOverlay = "true";
    const project = window.ArchCADReviewProject;
    if (project) {
      const w = WorkbenchModel.data(project);
      for (const o of WorkbenchModel.objects(project).filter(
        (o) => o.floor === floor && !o.record.hidden,
      )) {
        const r = o.record,
          ps = r.points || PlanningModel.points(r);
        if (!ps.length) continue;
        node("polygon", {
          points: ps.map((q) => q.x + "," + q.y).join(" "),
          fill: o.kind === "interior" ? "#a1620760" : "#38bdf830",
          stroke: "#38bdf8",
          "stroke-width": 1,
        });
      }
      for (const v of [...w.voids, ...w.shafts].filter(
        (v) => floor >= v.from && floor <= v.to,
      )) {
        const ps = v.points || PlanningModel.points(v);
        node("polygon", {
          points: ps.map((q) => q.x + "," + q.y).join(" "),
          fill: "none",
          stroke: "#fb7185",
          "stroke-dasharray": "4 3",
        });
      }
      if (w.site.boundary.length)
        node("polygon", {
          points: w.site.boundary.map((q) => q.x + "," + q.y).join(" "),
          fill: "none",
          stroke: "#22c55e",
          "stroke-dasharray": "8 4",
        });
    }

    for (const m of this.markups.filter((m) => m.floor === floor)) {
      node("polyline", {
        points: m.points.map((p) => p.x + "," + p.y).join(" "),
        fill: "none",
        stroke: m.color,
        "stroke-width": 2,
      });
      const a = m.points[0],
        b = m.points.at(-1);
      let label = m.label;
      if (m.kind === "measure")
        label = Math.hypot(b.x - a.x, b.y - a.y).toFixed(2) + " in";
      if (m.kind === "arrow") {
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        node("polyline", {
          points: [
            {
              x: b.x - 10 * Math.cos(angle - 0.4),
              y: b.y - 10 * Math.sin(angle - 0.4),
            },
            b,
            {
              x: b.x - 10 * Math.cos(angle + 0.4),
              y: b.y - 10 * Math.sin(angle + 0.4),
            },
          ]
            .map((p) => p.x + "," + p.y)
            .join(" "),
          fill: "none",
          stroke: m.color,
          "stroke-width": 2,
        });
      }
      if (label)
        node(
          "text",
          { x: b.x + 4, y: b.y - 4, "font-size": 8, fill: m.color },
          label,
        );
    }
    for (const i of this.issues.filter((i) => i.anchor.floor === floor)) {
      node("circle", {
        cx: i.anchor.x,
        cy: i.anchor.y,
        r: 5,
        fill: i.status === "resolved" ? "#16a34a" : "#f59e0b",
      });
      node(
        "text",
        { x: i.anchor.x + 7, y: i.anchor.y, "font-size": 8, fill: "#fbbf24" },
        i.title,
      );
    }
    svg.append(group);
    const list = document.getElementById("review-issues");
    if (list)
      list.replaceChildren(
        ...this.issues.map((i) => {
          const p = document.createElement("p");
          p.textContent = `${i.title} · ${i.status} · ${i.priority} · ${i.assignee || "Unassigned"} · F${i.anchor.floor}`;
          return p;
        }),
      );
  },
};
document.addEventListener("DOMContentLoaded", () => ReviewWorkbench.init());
