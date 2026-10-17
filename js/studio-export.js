/* Standalone model-based drawing sheets: no editor CSS, pan, selection or zoom state. */
const DrawingExport = {
  options: {
    scope: "current",
    dimensions: true,
    columns: false,
    labels: true,
    openings: true,
    units: "in",
    denominator: 50,
    paper: "A3",
  },
  floors(options = this.options) {
    return options.scope === "all"
      ? Array.from(
          { length: Number(document.getElementById("b-floors").value) || 1 },
          (_, i) => i,
        )
      : [currentFloor];
  },
  schedule(floor) {
    return elements
      .filter((e) => e.floor === floor && !e.isFurniture)
      .map((e) => {
        const clear = WallEngine.clearDimensions(e);
        return {
          name: e.customName || e.type,
          w: e.w,
          h: e.h,
          area: (e.w * e.h) / 144,
          clearArea: (clear.w * clear.h) / 144,
        };
      });
  },
  svg(floor, options = this.options) {
    const p = ProjectState.capture(),
      unit = p.unit,
      w = toInches(p.plot.inW, unit),
      h = toInches(p.plot.inH, unit),
      offset = (k) => toInches(p.plot[k], unit),
      margin = 36;
    const points = [
        [-offset("aL"), -offset("aU")],
        [w + offset("bR"), -offset("bU")],
        [w + offset("cR"), h + offset("cD")],
        [-offset("dL"), h + offset("dD")],
      ],
      minX = Math.min(...points.map((p) => p[0])) - margin,
      minY = Math.min(...points.map((p) => p[1])) - margin,
      maxX = Math.max(...points.map((p) => p[0])) + margin,
      maxY = Math.max(...points.map((p) => p[1])) + margin;
    const text = (x, y, value, size = 7) =>
      `<text x="${x}" y="${y}" font-size="${size}" text-anchor="middle" fill="#172033" font-family="Arial,sans-serif">${ProjectModel.escapeHTML(value)}</text>`;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" width="${((maxX - minX) * 25.4) / options.denominator}mm" height="${((maxY - minY) * 25.4) / options.denominator}mm"><rect x="${minX}" y="${minY}" width="${maxX - minX}" height="${maxY - minY}" fill="white"/><polygon points="${points.map((p) => p.join(",")).join(" ")}" fill="#f8fafc" stroke="#64748b" stroke-width="1"/><rect width="${w}" height="${h}" fill="none" stroke="#94a3b8" stroke-width="1"/>`;
    for (const el of elements.filter((e) => e.floor === floor)) {
      const b = Selection.bounds(el);
      svg += `<rect x="${el.x}" y="${el.y}" width="${b.w}" height="${b.h}" fill="${el.isFurniture ? "#e2e8f0" : "#f1f5f9"}" stroke="#94a3b8" stroke-width=".7" ${el.isFurniture ? 'stroke-dasharray="3 2"' : ""}/>`;
      if (options.labels && !el.isFurniture)
        svg +=
          text(el.x + el.w / 2, el.y + el.h / 2 - 4, el.customName || el.type) +
          text(
            el.x + el.w / 2,
            el.y + el.h / 2 + 5,
            `${((el.w * el.h) / 144).toFixed(1)} sq ft`,
            6,
          );
      if (options.dimensions && !el.isFurniture) {
        const format = (n) =>
          options.units === "cm"
            ? `${(n * 2.54).toFixed(1)} cm`
            : ProjectModel.display(n, "ftin");
        svg +=
          text(el.x + el.w / 2, el.y - 7, format(el.w), 6) +
          text(el.x - 14, el.y + el.h / 2, format(el.h), 6);
      }
      if (options.columns && !el.isFurniture)
        for (const [x, y] of [
          [el.x, el.y],
          [el.x + el.w, el.y],
          [el.x, el.y + el.h],
          [el.x + el.w, el.y + el.h],
        ])
          svg += `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" fill="#475569"/>`;
    }
    for (const wall of WallEngine.getWalls().filter((w) => w.floor === floor)) {
      const length = wall.end - wall.start,
        points = [
          ...new Set([
            0,
            length,
            ...(options.openings
              ? wall.openings.flatMap((o) => [o.start, o.end])
              : []),
          ]),
        ].sort((a, b) => a - b);
      for (let i = 0; i < points.length - 1; i++) {
        const a = points[i],
          b = points[i + 1];
        if (
          options.openings &&
          wall.openings.some(
            (o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end,
          )
        )
          continue;
        svg += `<line x1="${wall.horizontal ? wall.start + a : wall.fixed}" y1="${wall.horizontal ? wall.fixed : wall.start + a}" x2="${wall.horizontal ? wall.start + b : wall.fixed}" y2="${wall.horizontal ? wall.fixed : wall.start + b}" stroke="#334155" stroke-width="${wall.thickness}"/>`;
      }
    }
    if (options.openings)
      for (const fix of fixtures) {
        const el = elements[fix.roomId];
        if (!el || el.floor !== floor) continue;
        const horizontal = ["top", "bottom"].includes(fix.edge),
          x =
            el.x + (horizontal ? fix.offset : fix.edge === "right" ? el.w : 0),
          y =
            el.y +
            (horizontal ? (fix.edge === "bottom" ? el.h : 0) : fix.offset);
        svg += `<line x1="${x}" y1="${y}" x2="${x + (horizontal ? fix.size : 0)}" y2="${y + (horizontal ? 0 : fix.size)}" stroke="${fix.type === "door" ? "#b45309" : "#0284c7"}" stroke-width="1.5"/>`;
      }
    svg += text(
      w / 2,
      minY + 15,
      `${p.compass} ↑ · Floor ${floor === 0 ? "G" : floor} · 1:${options.denominator}`,
      8,
    );
    return svg + "</svg>";
  },
  print() {
    const options = { ...this.options },
      floors = this.floors(options),
      popup = window.open("", "_blank");
    if (!popup)
      return StudioUI.message("Allow pop-ups to open drawing sheets.", "error");
    const p = ProjectState.capture(),
      paper = options.paper === "A4" ? "A4" : "A3";
    popup.document.write(
      `<!doctype html><html><head><title>${ProjectModel.escapeHTML(p.name)}</title><style>@page{size:${paper} landscape;margin:12mm}body{margin:0;font:11px Arial;color:#172033}.sheet{break-after:page;page-break-after:always}.sheet:last-child{break-after:auto}header{display:flex;justify-content:space-between;border-bottom:2px solid #334155;padding-bottom:6mm}.drawing{padding:8mm 0;overflow:visible}svg{display:block;max-width:none}table{border-collapse:collapse;width:100%;font-size:10px}td,th{border:1px solid #94a3b8;padding:4px;text-align:left}.note{color:#475569;font-size:10px}button{margin:10px;padding:10px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save PDF</button>${floors
        .map((f) => {
          const schedule = this.schedule(f);
          return `<section class="sheet"><header><div><h2>${ProjectModel.escapeHTML(p.name)}</h2>Floor ${f === 0 ? "G" : f} · ${ProjectModel.escapeHTML(p.author || "Drawn with ArchCAD")}</div><div>${new Date().toLocaleDateString()}<br>Drawing scale 1:${options.denominator}<br>Print at 100% actual size</div></header><div class="drawing">${this.svg(f, options)}</div><table><thead><tr><th>Space</th><th>Bounds (inches)</th><th>Area (sq ft)</th><th>Clear area (sq ft)</th></tr></thead><tbody>${schedule.map((r) => `<tr><td>${ProjectModel.escapeHTML(r.name)}</td><td>${r.w} × ${r.h}</td><td>${r.area.toFixed(2)}</td><td>${r.clearArea.toFixed(2)}</td></tr>`).join("")}</tbody></table><p class="note">Sum of space bounds: ${schedule.reduce((sum, r) => sum + r.area, 0).toFixed(2)} sq ft. Overlapping rooms are counted individually. Wall dimensions follow centerlines.${options.columns ? " Column symbols are schematic markers." : ""} Choose a larger paper or denominator if the drawing exceeds the sheet.</p></section>`;
        })
        .join("")}</body></html>`,
    );
    popup.document.close();
  },
  async png() {
    const floors = this.floors();
    for (const floor of floors) {
      const svg = this.svg(floor),
        blob = new Blob([svg], { type: "image/svg+xml" }),
        url = URL.createObjectURL(blob);
      try {
        const img = await new Promise((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = reject;
          image.src = url;
        });
        const canvas = document.createElement("canvas");
        const ratio = Math.min(
          2400 / img.naturalWidth,
          6000 / img.naturalHeight,
        );
        canvas.width = Math.round(img.naturalWidth * ratio);
        canvas.height = Math.round(img.naturalHeight * ratio);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const file = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png"),
        );
        NavActionEngine.downloadBlob(
          file,
          `ArchCAD_Floor_${floor}.png`,
          "image/png",
        );
      } finally {
        URL.revokeObjectURL(url);
      }
    }
  },
  dxf() {
    const factor = this.options.units === "cm" ? 2.54 : 1,
      code = this.options.units === "cm" ? 5 : 1;
    let data = `0\nSECTION\n2\nHEADER\n9\n$INSUNITS\n70\n${code}\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n`;
    const line = (x1, y1, x2, y2, layer) => {
      data += `0\nLINE\n8\n${layer}\n10\n${x1 * factor}\n20\n${-y1 * factor}\n30\n0\n11\n${x2 * factor}\n21\n${-y2 * factor}\n31\n0\n`;
    };
    const text = (x, y, label, layer) => {
      data += `0\nTEXT\n8\n${layer}\n10\n${x * factor}\n20\n${-y * factor}\n30\n0\n40\n${6 * factor}\n1\n${String(
        label,
      )
        .replace(/[\r\n]/g, " ")
        .replace(/[^\x20-\x7e]/g, "?")}\n`;
    };
    for (const f of this.floors()) {
      for (const w of WallEngine.getWalls().filter((w) => w.floor === f)) {
        const breaks = [
          ...new Set([
            0,
            w.end - w.start,
            ...(this.options.openings
              ? w.openings.flatMap((o) => [o.start, o.end])
              : []),
          ]),
        ].sort((a, b) => a - b);
        for (let i = 0; i < breaks.length - 1; i++) {
          const a = breaks[i],
            b = breaks[i + 1];
          if (
            this.options.openings &&
            w.openings.some((o) => (a + b) / 2 > o.start && (a + b) / 2 < o.end)
          )
            continue;
          line(
            w.horizontal ? w.start + a : w.fixed,
            w.horizontal ? w.fixed : w.start + a,
            w.horizontal ? w.start + b : w.fixed,
            w.horizontal ? w.fixed : w.start + b,
            `F${f}_WALLS`,
          );
        }
      }
      for (const el of elements.filter(
        (e) => e.floor === f && !e.isFurniture,
      )) {
        if (this.options.labels)
          text(
            el.x + el.w / 2,
            el.y + el.h / 2,
            el.customName || el.type,
            `F${f}_LABELS`,
          );
        if (this.options.dimensions)
          text(
            el.x,
            el.y - 8,
            `${ProjectModel.display(el.w, "ftin")} x ${ProjectModel.display(el.h, "ftin")}`,
            `F${f}_DIMENSIONS`,
          );
      }
      if (this.options.openings)
        for (const opening of fixtures) {
          const el = elements[opening.roomId];
          if (!el || el.floor !== f) continue;
          const horizontal = ["top", "bottom"].includes(opening.edge),
            x =
              el.x +
              (horizontal
                ? opening.offset
                : opening.edge === "right"
                  ? el.w
                  : 0),
            y =
              el.y +
              (horizontal
                ? opening.edge === "bottom"
                  ? el.h
                  : 0
                : opening.offset);
          line(
            x,
            y,
            x + (horizontal ? opening.size : 0),
            y + (horizontal ? 0 : opening.size),
            `F${f}_${opening.type.toUpperCase()}S`,
          );
        }
    }
    const p = ProjectState.capture(),
      w = toInches(p.plot.inW, p.unit),
      h = toInches(p.plot.inH, p.unit),
      v = (k) => toInches(p.plot[k], p.unit),
      points = [
        [-v("aL"), -v("aU")],
        [w + v("bR"), -v("bU")],
        [w + v("cR"), h + v("cD")],
        [-v("dL"), h + v("dD")],
      ];
    points.forEach((p, i) => {
      const n = points[(i + 1) % 4];
      line(p[0], p[1], n[0], n[1], "PLOT");
    });
    data += "0\nENDSEC\n0\nEOF\n";
    NavActionEngine.downloadBlob(
      data,
      "ArchCAD_Drawing.dxf",
      "application/dxf",
    );
  },
  async glb() {
    if (!Engine3D.scene) throw new Error("Open the 3D view first.");
    Engine3D.modelSignature = null;
    generate3DModel();
    if (!THREE.GLTFExporter)
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "vendor/three/GLTFExporter.js";
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("Could not load the 3D exporter."));
        document.head.appendChild(script);
      });
    const group = new THREE.Group(),
      floors = this.floors();
    for (const child of Engine3D.buildingGroup.children) {
      if (this.options.scope === "all" || floors.includes(child.userData.floor))
        group.add(child.clone(true));
    }
    const exporter = new THREE.GLTFExporter();
    await new Promise((resolve, reject) => {
      try {
        exporter.parse(
          group,
          (result) => {
            NavActionEngine.downloadBlob(
              result,
              "ArchCAD_Model.glb",
              "application/octet-stream",
            );
            resolve();
          },
          { binary: true },
        );
      } catch (e) {
        reject(e);
      }
    });
  },
};
NavActionEngine.exportProjectJSON = function () {
  NavActionEngine.downloadBlob(
    JSON.stringify(ProjectModel.normalize(ProjectState.capture()), null, 2),
    "ArchCAD_Project.json",
    "application/json",
  );
};
NavActionEngine.importProjectJSON = function (event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    StudioUI.message("Project files must be smaller than 10 MB.", "error");
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const project = ProjectModel.normalize(JSON.parse(reader.result));
      if (StorageEngine.loading)
        throw new Error("Wait for project recovery to finish.");
      await StorageEngine.snapshot("Before file import");
      ProjectState.apply(project, { rebase: true });
      StorageEngine.markDirty();
      AppEvents.triggerStateChange();
      StudioUI.message("Project loaded.");
    } catch (e) {
      StudioUI.message("Import failed: " + e.message, "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.onerror = () =>
    StudioUI.message("The file could not be read.", "error");
  reader.readAsText(file);
};
NavActionEngine.exportPDF = () => DrawingExport.print();
NavActionEngine.exportPNG = () =>
  DrawingExport.png().catch((e) => StudioUI.message(e.message, "error"));
NavActionEngine.exportDXF = () => DrawingExport.dxf();
NavActionEngine.exportGLB = () =>
  DrawingExport.glb().catch((e) => StudioUI.message(e.message, "error"));
// Bind after StudioUI is initialized; HTML actions look up the public method at click time.
document.addEventListener("DOMContentLoaded", () => {
  StudioUI.exportDialog = function () {
    this.dialog(
      "Export drawing",
      `<div class="studio-field-grid"><label>Floors<select onchange="DrawingExport.options.scope=this.value"><option value="current" ${DrawingExport.options.scope === "current" ? "selected" : ""}>Current floor</option><option value="all" ${DrawingExport.options.scope === "all" ? "selected" : ""}>All floors</option></select></label><label>DXF / dimension units<select onchange="DrawingExport.options.units=this.value"><option value="in">Inches / feet-inches</option><option value="cm" ${DrawingExport.options.units === "cm" ? "selected" : ""}>Centimeters</option></select></label><label>Paper<select onchange="DrawingExport.options.paper=this.value"><option ${DrawingExport.options.paper === "A3" ? "selected" : ""}>A3</option><option ${DrawingExport.options.paper === "A4" ? "selected" : ""}>A4</option></select></label><label>Drawing scale<select onchange="DrawingExport.options.denominator=Number(this.value)">${[20, 25, 50, 75, 100, 150, 200].map((n) => `<option value="${n}" ${DrawingExport.options.denominator === n ? "selected" : ""}>1:${n}</option>`).join("")}</select></label></div>${["dimensions", "labels", "openings", "columns"].map((k) => `<label><input type="checkbox" ${DrawingExport.options[k] ? "checked" : ""} onchange="DrawingExport.options.${k}=this.checked"> ${k === "columns" ? "Schematic column markers" : k}</label>`).join("")}<div class="studio-action-grid">${this.button("Drawing sheets / PDF", "exportPDF()", "primary")}${this.button("PNG image", "exportPNG()")}${this.button("DXF drawing", "exportDXF()")}${this.button("GLB model", "exportGLB()")}</div><p class="studio-hint">Sheets include a room schedule and selected-floor totals. Print at actual size for the chosen scale. DXF keeps floors on separate named layers.</p>`,
    );
  };
});
