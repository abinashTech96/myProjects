/* Read-only viewer: renders geometry with DOM nodes and never imports editable app code. */
(async () => {
  "use strict";
  const params = new URLSearchParams(location.hash.slice(1)),
    server = params.get("server"),
    project = params.get("project"),
    token = params.get("token"),
    status = document.getElementById("status");
  let snapshot,
    anchor = { floor: 0, x: 0, y: 0 };
  try {
    const url = new URL(server);
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname)
      )
    )
      throw Error("Invalid project service URL");
    if (!/^[\w-]{1,100}$/.test(project || "") || !token)
      throw Error("Incomplete review link");
    const request = async (method = "GET", body) => {
      const response = await fetch(
        url.href.replace(/\/$/, "") +
          "/api/projects/" +
          project +
          (method === "POST" ? "/comments" : ""),
        {
          method,
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: body ? JSON.stringify(body) : undefined,
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "Review unavailable");
      return data;
    };
    snapshot = await request();
    document.getElementById("title").textContent = snapshot.project.name;
    status.textContent = "Read-only · revision " + snapshot.revision;
    const floor = document.getElementById("floor");
    for (let i = 0; i < snapshot.project.floorCount; i++) {
      const option = document.createElement("option");
      option.value = i;
      option.textContent = "Floor " + i;
      floor.append(option);
    }
    const draw = () => {
      const p = snapshot.project,
        f = Number(floor.value),
        w = ProjectModel.inches(p.plot.inW, p.unit),
        h = ProjectModel.inches(p.plot.inH, p.unit),
        svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", `-20 -20 ${w + 40} ${h + 40}`);
      svg.onclick = (e) => {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const q = pt.matrixTransform(svg.getScreenCTM().inverse());
        anchor = { floor: f, x: q.x, y: q.y };
        status.textContent = `Comment anchor: floor ${f}, X ${q.x.toFixed(1)}, Y ${q.y.toFixed(1)} in`;
      };
      for (const e of p.elements.filter((e) => e.floor === f)) {
        const poly = document.createElementNS(svg.namespaceURI, "polygon"),
          turned = e.isFurniture && e.rot % 180 === 90,
          ps = e.points || [
            { x: 0, y: 0 },
            { x: turned ? e.h : e.w, y: 0 },
            { x: turned ? e.h : e.w, y: turned ? e.w : e.h },
            { x: 0, y: turned ? e.w : e.h },
          ];
        poly.setAttribute(
          "points",
          ps.map((q) => e.x + q.x + "," + (e.y + q.y)).join(" "),
        );
        poly.setAttribute("fill", e.customColor || "#164e63");
        poly.setAttribute("fill-opacity", ".3");
        poly.setAttribute("stroke", "#7dd3fc");
        svg.append(poly);
        const label = document.createElementNS(svg.namespaceURI, "text");
        label.setAttribute("x", e.x + e.w / 2);
        label.setAttribute("y", e.y + e.h / 2);
        label.setAttribute("font-size", "8");
        label.setAttribute("fill", "#fff");
        label.textContent = e.customName || e.type;
        svg.append(label);
      }
      const line = (a, b, color, width) => {
        const node = document.createElementNS(svg.namespaceURI, "line");
        for (const [k, v] of Object.entries({
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
          stroke: color,
          "stroke-width": width,
        }))
          node.setAttribute(k, v);
        svg.append(node);
      };
      for (const wall of ProjectModel.walls(p).filter((w) => w.floor === f))
        line(wall.a, wall.b, "#94a3b8", wall.thickness);
      for (const opening of p.fixtures.filter(
        (o) => p.elements[o.roomId].floor === f,
      )) {
        const seg = PlanningModel.openingSegment(p, opening);
        line(
          seg.a,
          seg.b,
          opening.type === "window" ? "#38bdf8" : "#101b2c",
          12,
        );
      }
      document.getElementById("drawing").replaceChildren(svg);
    };
    floor.onchange = draw;
    draw();
    const comments = () =>
      document.getElementById("comments").replaceChildren(
        ...snapshot.comments.map((c) => {
          const p = document.createElement("p");
          p.textContent = `${c.user} · F${c.anchor.floor}: ${c.text}`;
          return p;
        }),
      );
    comments();
    document.getElementById("post").onclick = async () => {
      try {
        await request("POST", {
          text: document.getElementById("comment").value,
          anchor,
        });
        snapshot = await request();
        comments();
        document.getElementById("comment").value = "";
      } catch (e) {
        status.textContent = e.message;
      }
    };
  } catch (e) {
    status.textContent = e.message;
  }
})();
