/* Local, review-before-apply document ingestion. No source documents are uploaded. */
const WorkbenchFiles = {
  async pdfLibrary() {
    if (!this.pdfjs) {
      this.pdfjs = await import("../vendor/pdfjs/pdf.min.mjs");
      this.pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "vendor/pdfjs/pdf.worker.min.mjs",
        location.href,
      ).href;
    }
    return this.pdfjs;
  },
  async openPDF(file) {
    if (!file) return;
    await WorkbenchUI.asyncRun(async () => {
      if (file.size > 20 * 1024 * 1024) throw Error("PDF must be below 20 MB");
      if (this.document) await this.document.destroy();
      const lib = await this.pdfLibrary();
      this.document = await lib.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        isEvalSupported: false,
        disableFontFace: true,
        useSystemFonts: true,
        stopAtErrors: true,
      }).promise;
      document.getElementById("wb-pdf-page").max = this.document.numPages;
      document.getElementById("wb-pdf-page").value = "1";
      document.getElementById("wb-import-status").textContent =
        this.document.numPages + " PDF pages; choose a page and render it.";
      await this.renderPDF();
    });
  },
  async renderPDF() {
    await WorkbenchUI.asyncRun(async () => {
      if (!this.document) throw Error("Choose a PDF first");
      const number = WorkbenchUI.num("wb-pdf-page"),
        page = await this.document.getPage(number),
        view = page.getViewport({ scale: 1 }),
        scale = Math.min(2, 1800 / view.width, 1800 / view.height),
        canvas = document.createElement("canvas"),
        renderView = page.getViewport({ scale });
      canvas.width = Math.ceil(renderView.width);
      canvas.height = Math.ceil(renderView.height);
      await page.render({
        canvasContext: canvas.getContext("2d"),
        viewport: renderView,
      }).promise;
      const op = await page.getOperatorList(),
        text = await page.getTextContent(),
        segments = this.pdfSegments(op, this.pdfjs.OPS, view.transform),
        texts = text.items
          .filter((t) => t.str)
          .map((t) => {
            const q = this.pdfjs.Util.transform(view.transform, t.transform);
            return { text: t.str, x: q[4], y: q[5], confidence: 100 };
          });
      this.trace = {
        width: view.width,
        height: view.height,
        segments,
        texts,
        canvas,
        pixelScale: scale,
        source: "PDF page " + number,
        calibration: [],
        selected: new Set(segments.map((s, i) => i)),
      };
      this.previewTrace();
      page.cleanup();
    });
  },
  pdfSegments(list, OPS, viewport) {
    const multiply = (a, b) => [
        a[0] * b[0] + a[2] * b[1],
        a[1] * b[0] + a[3] * b[1],
        a[0] * b[2] + a[2] * b[3],
        a[1] * b[2] + a[3] * b[3],
        a[0] * b[4] + a[2] * b[5] + a[4],
        a[1] * b[4] + a[3] * b[5] + a[5],
      ],
      apply = (m, x, y) => ({
        x: m[0] * x + m[2] * y + m[4],
        y: m[1] * x + m[3] * y + m[5],
      }),
      out = [],
      stack = [];
    let ctm = [1, 0, 0, 1, 0, 0];
    for (let i = 0; i < list.fnArray.length; i++) {
      const fn = list.fnArray[i],
        args = list.argsArray[i];
      if (fn === OPS.save) stack.push([...ctm]);
      else if (fn === OPS.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
      else if (fn === OPS.transform) ctm = multiply(ctm, args);
      else if (fn === OPS.constructPath) {
        const buffer = args[1]?.[0];
        if (!buffer || typeof buffer.length !== "number") continue;
        const m = multiply(viewport, ctm);
        let cursor = null,
          start = null;
        const add = (q) => {
          if (cursor && Math.hypot(q.x - cursor.x, q.y - cursor.y) > 0.5)
            out.push({ a: cursor, b: q, kind: "vector" });
          cursor = q;
        };
        for (let k = 0; k < buffer.length; ) {
          const code = buffer[k++];
          if (code === 0) {
            cursor = apply(m, buffer[k++], buffer[k++]);
            start = cursor;
          } else if (code === 1) add(apply(m, buffer[k++], buffer[k++]));
          else if (code === 2) {
            const c1 = apply(m, buffer[k++], buffer[k++]),
              c2 = apply(m, buffer[k++], buffer[k++]),
              end = apply(m, buffer[k++], buffer[k++]),
              from = cursor;
            for (let n = 1; n <= 12; n++) {
              const t = n / 12,
                s = 1 - t;
              add({
                x:
                  s * s * s * from.x +
                  3 * s * s * t * c1.x +
                  3 * s * t * t * c2.x +
                  t * t * t * end.x,
                y:
                  s * s * s * from.y +
                  3 * s * s * t * c1.y +
                  3 * s * t * t * c2.y +
                  t * t * t * end.y,
              });
            }
          } else if (code === 3) {
            const control = apply(m, buffer[k++], buffer[k++]),
              end = apply(m, buffer[k++], buffer[k++]),
              from = cursor;
            for (let n = 1; n <= 8; n++) {
              const t = n / 8;
              add({
                x:
                  (1 - t) ** 2 * from.x +
                  2 * (1 - t) * t * control.x +
                  t * t * end.x,
                y:
                  (1 - t) ** 2 * from.y +
                  2 * (1 - t) * t * control.y +
                  t * t * end.y,
              });
            }
          } else if (code === 4 && start) add(start);
          else break;
        }
        if (out.length > 20000)
          throw Error(
            "This PDF page has too much vector detail; use a cropped page",
          );
      }
    }
    return this.mergeLines(out, 0.25);
  },
  mergeLines(lines, tolerance = 2) {
    const out = [];
    for (const line of lines) {
      if (Math.hypot(line.a.x - line.b.x, line.a.y - line.b.y) < 2) continue;
      const horizontal = Math.abs(line.a.y - line.b.y) < tolerance,
        vertical = Math.abs(line.a.x - line.b.x) < tolerance;
      if (!horizontal && !vertical) {
        out.push(line);
        continue;
      }
      const axis = horizontal ? "x" : "y",
        cross = horizontal ? "y" : "x",
        low = Math.min(line.a[axis], line.b[axis]),
        high = Math.max(line.a[axis], line.b[axis]),
        fixed = (line.a[cross] + line.b[cross]) / 2,
        existing = out.find(
          (l) =>
            l.axis === axis &&
            Math.abs(l.fixed - fixed) <= tolerance &&
            low <= l.high + tolerance &&
            high >= l.low - tolerance,
        );
      if (existing) {
        existing.low = Math.min(low, existing.low);
        existing.high = Math.max(high, existing.high);
        existing.a = { [axis]: existing.low, [cross]: existing.fixed };
        existing.b = { [axis]: existing.high, [cross]: existing.fixed };
      } else
        out.push({
          ...line,
          axis,
          low,
          high,
          fixed,
          a: { [axis]: low, [cross]: fixed },
          b: { [axis]: high, [cross]: fixed },
        });
    }
    return out;
  },
  async openRaster(file) {
    if (!file) return;
    await WorkbenchUI.asyncRun(async () => {
      if (
        !/^image\/(png|jpeg|webp)$/.test(file.type) ||
        file.size > 6 * 1024 * 1024
      )
        throw Error("Choose a PNG/JPEG/WebP below 6 MB");
      const url = URL.createObjectURL(file),
        image = new Image();
      try {
        image.src = url;
        await image.decode();
        const scale = Math.min(
            1,
            1800 / image.naturalWidth,
            1800 / image.naturalHeight,
          ),
          canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas
          .getContext("2d")
          .drawImage(image, 0, 0, canvas.width, canvas.height);
        this.trace = {
          width: canvas.width,
          height: canvas.height,
          canvas,
          pixelScale: 1,
          segments: [],
          texts: [],
          source: file.name,
          calibration: [],
          selected: new Set(),
        };
        this.detectRaster();
      } finally {
        URL.revokeObjectURL(url);
      }
    });
  },
  detectRaster() {
    WorkbenchUI.run(() => {
      const t = this.trace;
      if (!t) throw Error("Load a document first");
      const image = t.canvas
          .getContext("2d")
          .getImageData(0, 0, t.canvas.width, t.canvas.height),
        segments = this.rasterLines(
          image,
          WorkbenchUI.num("wb-trace-threshold"),
          WorkbenchUI.num("wb-trace-min"),
        );
      t.segments = segments.map((s) => ({
        a: { x: s.a.x / t.pixelScale, y: s.a.y / t.pixelScale },
        b: { x: s.b.x / t.pixelScale, y: s.b.y / t.pixelScale },
        kind: "raster",
      }));
      t.selected = new Set(t.segments.map((s, i) => i));
      this.previewTrace();
    });
  },
  rasterLines(image, threshold = 100, minLength = 40) {
    const { width: w, height: h, data } = image,
      dark = (x, y) => {
        const i = (y * w + x) * 4;
        return (
          data[i + 3] > 100 &&
          data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114 <
            threshold
        );
      },
      lines = [];
    if (w * h > 4e6)
      throw Error("Reduce image resolution below 4 million pixels");
    for (let y = 0; y < h; y++) {
      let start = -1;
      for (let x = 0; x <= w; x++) {
        if (x < w && dark(x, y)) {
          if (start < 0) start = x;
        } else if (start >= 0) {
          if (x - start >= minLength)
            lines.push({ a: { x: start, y }, b: { x: x - 1, y } });
          start = -1;
        }
      }
    }
    for (let x = 0; x < w; x++) {
      let start = -1;
      for (let y = 0; y <= h; y++) {
        if (y < h && dark(x, y)) {
          if (start < 0) start = y;
        } else if (start >= 0) {
          if (y - start >= minLength)
            lines.push({ a: { x, y: start }, b: { x, y: y - 1 } });
          start = -1;
        }
      }
    }
    return this.mergeLines(lines, 3);
  },
  async ocr() {
    await WorkbenchUI.asyncRun(async () => {
      const t = this.trace;
      if (!t) throw Error("Load an image or PDF page");
      if (!window.Tesseract)
        await new Promise((resolve, reject) => {
          const s = document.createElement("script");
          s.src = "vendor/ocr/tesseract.min.js";
          s.onload = resolve;
          s.onerror = () => reject(Error("OCR assets could not load"));
          document.head.append(s);
        });
      const worker = await Tesseract.createWorker("eng", 1, {
        workerPath: new URL("vendor/ocr/worker.min.js", location.href).href,
        corePath: new URL(
          "vendor/ocr/tesseract-core-lstm.wasm.js",
          location.href,
        ).href,
        langPath: new URL("vendor/ocr/", location.href).href,
        workerBlobURL: false,
        cacheMethod: "none",
        logger: (m) => {
          const status = document.getElementById("wb-import-status");
          if (status)
            status.textContent =
              m.status + " " + Math.round((m.progress || 0) * 100) + "%";
        },
      });
      try {
        await worker.setParameters({ preserve_interword_spaces: "1" });
        const result = await worker.recognize(
          t.canvas,
          {},
          { blocks: true, text: true },
        );
        const words = (result.data.blocks || [])
          .flatMap((b) => b.paragraphs || [])
          .flatMap((p) => p.lines || [])
          .flatMap((l) => l.words || []);
        t.texts = words.map((w) => ({
          text: w.text,
          x: w.bbox.x0 / t.pixelScale,
          y: w.bbox.y1 / t.pixelScale,
          confidence: w.confidence,
        }));
        if (!t.texts.length && result.data.text)
          t.texts = [
            {
              text: result.data.text,
              x: 0,
              y: 10,
              confidence: result.data.confidence,
            },
          ];
        this.previewTrace();
      } finally {
        await worker.terminate();
      }
    });
  },
  findOpenings(segments, scale = 1) {
    const candidates = [];
    for (const axis of ["x", "y"]) {
      const other = axis === "x" ? "y" : "x",
        lines = segments
          .filter((s) => Math.abs(s.a[other] - s.b[other]) < 2)
          .map((s) => ({
            fixed: (s.a[other] + s.b[other]) / 2,
            lo: Math.min(s.a[axis], s.b[axis]),
            hi: Math.max(s.a[axis], s.b[axis]),
          }))
          .sort((a, b) => a.fixed - b.fixed || a.lo - b.lo);
      for (let i = 0; i < lines.length; i++)
        for (const b of lines.slice(i + 1)) {
          const a = lines[i];
          if (b.fixed - a.fixed > 3) break;
          const lo = a.hi,
            hi = b.lo,
            gap = (hi - lo) * scale;
          if (gap < 18 || gap > 72 || Math.abs(a.fixed - b.fixed) > 3) continue;
          const fixed = (a.fixed + b.fixed) / 2;
          if (
            !candidates.some(
              (c) => Math.hypot(c.a[axis] - lo, c.a[other] - fixed) < 4,
            )
          )
            candidates.push({
              a: { [axis]: lo, [other]: fixed },
              b: { [axis]: hi, [other]: fixed },
              kind: "ignore",
            });
        }
    }
    return candidates.slice(0, 200);
  },
  previewTrace() {
    const t = this.trace;
    if (!t) return;
    if (!t.openings)
      t.openings = this.findOpenings(
        t.segments,
        Number(document.getElementById("wb-import-scale")?.value) || 1,
      );
    const e = ProjectModel.escapeHTML;
    document.getElementById("wb-import-status").textContent =
      `${t.source}: ${t.segments.length} line candidates, ${t.texts.length} text candidates. Click two points for calibration; click a line to toggle it.`;
    document.getElementById("wb-trace-preview").innerHTML =
      `<svg id="wb-source-svg" viewBox="0 0 ${t.width} ${t.height}" tabindex="0" aria-label="Import preview"><image href="${t.canvas.toDataURL("image/jpeg", 0.8)}" width="${t.width}" height="${t.height}" opacity=".6"/>${t.segments.map((s, i) => `<line data-trace="${i}" x1="${s.a.x}" y1="${s.a.y}" x2="${s.b.x}" y2="${s.b.y}" stroke="${t.selected.has(i) ? "#22d3ee" : "#fb7185"}" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}${t.openings.map((c) => `<line x1="${c.a.x}" y1="${c.a.y}" x2="${c.b.x}" y2="${c.b.y}" stroke="#fbbf24" stroke-width="3" stroke-dasharray="4 3"/>`).join("")}${t.calibration.map((q) => `<circle cx="${q.x}" cy="${q.y}" r="4" fill="#fbbf24"/>`).join("")}</svg><details><summary>Possible openings — review each gap</summary>${t.openings.map((c, i) => `<label>Gap ${i + 1}<select class="wb-opening-candidate" data-index="${i}"><option value="ignore">Ignore</option><option value="door">Door</option><option value="window">Window</option></select></label>`).join("")}</details><details><summary>Recognized text / dimensions</summary>${t.texts
        .slice(0, 500)
        .map(
          (s, i) =>
            `<label><input class="wb-text-check" value="${i}" type="checkbox" checked><input class="wb-text-edit" data-index="${i}" value="${e(s.text)}">${s.confidence.toFixed(0)}%</label>`,
        )
        .join("")}</details>`;
    document.getElementById("wb-source-svg").onclick = (ev) => {
      const line = ev.target.closest("[data-trace]");
      if (line && !ev.shiftKey) {
        const i = Number(line.dataset.trace);
        t.selected.has(i) ? t.selected.delete(i) : t.selected.add(i);
        line.setAttribute("stroke", t.selected.has(i) ? "#22d3ee" : "#fb7185");
        return;
      }
      const svg = ev.currentTarget,
        q = svg.createSVGPoint();
      q.x = ev.clientX;
      q.y = ev.clientY;
      const v = q.matrixTransform(svg.getScreenCTM().inverse());
      if (t.calibration.length === 2) t.calibration = [];
      t.calibration.push({ x: v.x, y: v.y });
      this.previewTrace();
    };
  },
  calibrate() {
    WorkbenchUI.run(() => {
      const t = this.trace;
      if (!t || t.calibration.length !== 2)
        throw Error("Click two reference points on the preview");
      const length = WorkbenchUI.length("wb-known-length"),
        distance = PlanningModel.distance(...t.calibration);
      if (distance < 1) throw Error("Choose two different reference points");
      document.getElementById("wb-import-scale").value = (
        length / distance
      ).toFixed(8);
      t.openings = null;
      this.previewTrace();
    });
  },
  applyTrace() {
    WorkbenchUI.run(() => {
      const t = this.trace;
      if (!t || !t.selected.size) throw Error("Select at least one line");
      const scale = WorkbenchUI.num("wb-import-scale"),
        x = WorkbenchUI.length("wb-import-x"),
        y = WorkbenchUI.length("wb-import-y"),
        thickness = WorkbenchUI.length("wb-import-thickness"),
        asGuides = document.getElementById("wb-trace-guides").checked,
        keepImage = document.getElementById("wb-trace-underlay").checked;
      ProjectModel.finite(scale, "Import scale", 0.000001, 10000);
      const next = ProjectState.capture(),
        at = (q) => ({ x: x + q.x * scale, y: y + q.y * scale }),
        floor = currentFloor;
      for (const i of t.selected) {
        const segment = t.segments[i],
          a = at(segment.a),
          b = at(segment.b);
        if (PlanningModel.distance(a, b) < 1) continue;
        if (asGuides)
          next.design.guides.push({ id: ProjectModel.uid(), floor, a, b });
        else
          next.planning.walls.push({
            id: ProjectModel.uid(),
            floor,
            a,
            b,
            thickness,
            label: t.source,
          });
      }
      const selectedOpenings = [
        ...document.querySelectorAll(".wb-opening-candidate"),
      ]
        .filter((node) => node.value !== "ignore")
        .map((node) => ({
          ...t.openings[Number(node.dataset.index)],
          kind: node.value,
        }));
      if (document.getElementById("wb-trace-rooms")?.checked) {
        for (const opening of selectedOpenings)
          next.planning.walls.push({
            id: ProjectModel.uid(),
            floor,
            a: at(opening.a),
            b: at(opening.b),
            thickness,
            label: "Reviewed opening bridge",
          });
        const recognized = DesignModel.recognize(
          ProjectModel.normalize(next),
          floor,
        );
        Object.assign(next, recognized);
      }
      for (const opening of selectedOpenings) {
        const a = at(opening.a),
          b = at(opening.b),
          size = PlanningModel.distance(a, b),
          mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        let best;
        for (let r = 0; r < next.elements.length; r++) {
          const room = next.elements[r];
          if (room.isFurniture || room.floor !== floor) continue;
          const points = PlanningModel.points(room);
          for (let edge = 0; edge < points.length; edge++) {
            const start = points[edge],
              end = points[(edge + 1) % points.length],
              length = PlanningModel.distance(start, end);
            if (!DesignModel.onSegment(mid, start, end, 3) || size > length)
              continue;
            const offset =
                ((a.x - start.x) * (end.x - start.x) +
                  (a.y - start.y) * (end.y - start.y)) /
                length,
              offsetB =
                ((b.x - start.x) * (end.x - start.x) +
                  (b.y - start.y) * (end.y - start.y)) /
                length,
              lo = Math.min(offset, offsetB);
            if (lo < -0.01 || lo + size > length + 0.01) continue;
            best = { r, room, edge, offset: Math.max(0, lo) };
            break;
          }
          if (best) break;
        }
        if (best) {
          let edge = best.room.points
              ? "segment:" + best.edge
              : ["top", "right", "bottom", "left"][best.edge],
            offset = best.offset;
          if (!best.room.points && best.edge >= 2)
            offset =
              (best.edge === 2 ? best.room.w : best.room.h) -
              best.offset -
              size;
          next.fixtures.push({
            id: ProjectModel.uid(),
            roomId: best.r,
            roomUid: best.room.id,
            type: opening.kind,
            edge,
            offset,
            size,
            height: opening.kind === "door" ? 80 : 40,
            sill: opening.kind === "door" ? 0 : 40,
          });
        } else
          next.planning.annotations.push({
            id: ProjectModel.uid(),
            floor,
            kind: "note",
            ...mid,
            text:
              "Reviewed " +
              opening.kind +
              " gap — recognize/bind its room edge",
          });
      }
      for (const input of document.querySelectorAll(".wb-text-check:checked")) {
        const i = Number(input.value),
          s = t.texts[i],
          content = document.querySelector(
            `.wb-text-edit[data-index="${i}"]`,
          ).value;
        next.planning.annotations.push({
          id: ProjectModel.uid(),
          floor,
          kind: "note",
          ...at(s),
          text: content,
        });
      }
      if (keepImage) {
        const data = t.canvas.toDataURL("image/jpeg", 0.7);
        if (data.length > 4 * 1024 * 1024)
          throw Error("Source underlay exceeds the embedded image budget");
        next.planning.underlays.push({
          id: ProjectModel.uid(),
          floor,
          x,
          y,
          w: t.width * scale,
          h: t.height * scale,
          data,
          opacity: 0.4,
          locked: true,
        });
      }
      WorkbenchUI.apply(next, "Imported reviewed document geometry");
    });
  },
  validateGLB(buffer) { return GLBModel.validate(buffer); },
  async importAsset(file) {
    if (!file) return;
    await WorkbenchUI.asyncRun(async () => {
      const bytes = await file.arrayBuffer();
      this.validateGLB(bytes);
      const loader = new THREE.GLTFLoader(),
        gltf = await new Promise((resolve, reject) =>
          loader.parse(bytes, "", resolve, reject),
        ),
        bounds = new THREE.Box3().setFromObject(gltf.scene),
        size = new THREE.Vector3();
      bounds.getSize(size);
      gltf.scene.traverse((c) => {
        c.geometry?.dispose();
        for (const m of c.material
          ? Array.isArray(c.material)
            ? c.material
            : [c.material]
          : []) {
          for (const value of Object.values(m))
            if (value?.isTexture) value.dispose();
          m.dispose();
        }
      });
      if (!size.x || !size.y || !size.z)
        throw Error("GLB contains no measurable model");
      const data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(
            "data:model/gltf-binary;base64," + reader.result.split(",")[1],
          );
        reader.onerror = reject;
        reader.readAsDataURL(new Blob([bytes]));
      });
      WorkbenchUI.change("Added custom GLB asset", () =>
        WorkbenchUI.data.assets.push({
          id: ProjectModel.uid(),
          name: file.name,
          data,
          w: size.x * 39.37007874,
          h: size.y * 39.37007874,
          depth: size.z * 39.37007874,
        }),
      );
      WorkbenchUI.assetDialog();
    });
  },
  async assetScene(asset) {
    const prepared=window.FourDJobs && (window.FourDWorkspace?.starting||window.FourDWorkspace?.running)
      ? await FourDJobs.run({kind:'glb',data:asset.data}) : GLBModel.decode(asset.data),bytes=prepared.buffer;
    await new Promise(resolve=>setTimeout(resolve,0));
    const gltf = await new Promise((resolve, reject) =>
      new THREE.GLTFLoader().parse(bytes, "", resolve, reject),
    );
    return gltf.scene;
  },
  async svgPNG(svg, width = 1600) {
    const image = new Image(),
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      image.src = url;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = Math.round(
        (width * image.naturalHeight) / image.naturalWidth,
      );
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas;
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};
