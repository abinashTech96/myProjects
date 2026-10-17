/* Cross-workflow regressions: floor/template portability and real CAS/offline/review APIs. */
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { createService } = require("../server/server.cjs");
module.exports = async ({ page, context, assert }) => {
  await page.evaluate(() => {
    document.getElementById("studio-dialog")?.close();
    WorkbenchI18n.apply({ language: "en" });
    Workbench3D.disableEdit();
    WorkbenchUI.extraSelection.clear();
    ProjectState.apply(
      {
        name: "Integration",
        plot: { inW: "600", inH: "600" },
        floorCount: 2,
        elements: [
          {
            id: "room",
            type: "bedroom",
            x: 20,
            y: 20,
            w: 144,
            h: 144,
            floor: 0,
          },
          {
            id: "bed",
            type: "bed",
            isFurniture: true,
            x: 40,
            y: 40,
            w: 36,
            h: 72,
            floor: 0,
          },
        ],
        fixtures: [
          {
            id: "door",
            type: "door",
            roomId: 0,
            edge: "top",
            offset: 50,
            size: 36,
          },
        ],
        design: {
          workbench: {
            levels: [
              { id: "l0", floor: 0, base: -12, height: 132 },
              { id: "l1", floor: 1, base: 120, height: 144 },
            ],
            openingTypes: [
              {
                id: "dt",
                name: "Door",
                kind: "door",
                width: 36,
                height: 80,
                sill: 0,
              },
            ],
            openingLinks: { door: { type: "dt", overrides: [] } },
            interiors: [
              {
                id: "bath",
                room: "room",
                kind: "bathroom",
                items: [
                  {
                    id: "wc",
                    type: "toilet",
                    x: 30,
                    y: 30,
                    w: 24,
                    h: 28,
                    height: 30,
                  },
                ],
              },
            ],
            structure: [
              {
                id: "col",
                name: "Column",
                kind: "column",
                floor: 0,
                x: 20,
                y: 20,
                w: 12,
                h: 12,
                height: 132,
              },
            ],
            fields: [
              {
                id: "supplier",
                key: "supplier",
                label: "Supplier",
                type: "text",
              },
            ],
            values: {
              room: { supplier: "Room supplier" },
              bed: { supplier: "Bed supplier" },
            },
          },
        },
      },
      { rebase: true },
    );
    AppEvents.triggerStateChange();
    StudioUI.select(0);
    PlanningUI.builderDialog();
    document.getElementById("copy-floor").value = "0";
    PlanningUI.copyFloor();
  });
  const copied = await page.evaluate(() => {
    const p = ProjectState.capture(),
      w = p.design.workbench,
      r = elements.find((e) => e.floor === 2 && !e.isFurniture),
      f = fixtures.find((f) => elements[f.roomId].floor === 2);
    return {
      floors: p.floorCount,
      base: WorkbenchModel.floorBase(p, 2),
      interior: w.interiors.some((l) => l.room === r.id),
      props: w.values[r.id],
      link: w.openingLinks[f.id],
      col: w.structure.some((s) => s.floor === 2),
    };
  });
  assert.deepEqual(copied, {
    floors: 3,
    base: 264,
    interior: true,
    props: { supplier: "Room supplier" },
    link: { type: "dt", overrides: [] },
    col: true,
  });
  await page.evaluate(() => {
    ProjectState.undo();
  });
  assert.equal(await page.evaluate(() => ProjectState.capture().floorCount), 2);
  assert.equal(await page.evaluate(() => WorkbenchUI.data.structure.length), 1);
  // Templates carry each member's metadata, including when placed in a fresh project.
  await page.evaluate(async () => {
    document.getElementById("studio-dialog")?.close();
    StudioUI.select(0);
    await PlanningUI.templatesDialog();
    document.getElementById("template-name").value = "Portable room";
    await PlanningUI.saveTemplate();
    await PlanningUI.templatesDialog();
    document.getElementById("template-x").value = "300";
    document.getElementById("template-y").value = "20";
    PlanningUI.placeTemplate(0);
  });
  assert.deepEqual(
    await page.evaluate(() => {
      const r = elements.find((e) => !e.isFurniture && e.x === 300),
        f = elements.find((e) => e.isFurniture && e.x === 320),
        w = WorkbenchUI.data;
      return [
        w.values[r?.id]?.supplier,
        w.values[f?.id]?.supplier,
        w.interiors.find((l) => l.room === r?.id)?.items[0].x,
      ];
    }),
    ["Room supplier", "Bed supplier", 310],
  );
  console.log("Integration: floor/template passed");
  const waitJobs = async (predicate) => {
    for (let i = 0; i < 200; i++) {
      const jobs = await page.evaluate(async () => WorkbenchSync.jobs());
      if (
        predicate(jobs) &&
        (await page.evaluate(() => !WorkbenchSync.flushing))
      )
        return jobs;
      await page.waitForTimeout(100);
    }
    throw Error("Queue did not reach expected state");
  };
  const touchContext = await context
    .browser()
    .newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  try {
    const touch = await touchContext.newPage();
    await touch.addInitScript(() =>
      localStorage.setItem("ArchCAD_TourDone", "true"),
    );
    await touch.goto(new URL(page.url()).origin);
    await touch.bringToFront();
    await touch.waitForFunction(
      () =>
        typeof StudioUI !== "undefined" &&
        StudioUI.ready &&
        !StorageEngine.loading &&
        !!Workbench3D.controls,
    );
    await touch.evaluate(() => WorkbenchUI.menu());
    await touch
      .getByRole("button", { name: "Wall faces & assemblies", exact: true })
      .tap();
    assert.ok(await touch.locator("#wb-wall").isVisible());
    await touch
      .getByRole("button", { name: "Preview wall edit", exact: true })
      .scrollIntoViewIfNeeded();
    assert.equal(
      await touch.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await touch.screenshot({ path: "/tmp/archcad-touch.png" });
  } finally {
    await touchContext.close();
  }
  console.log("Integration: touch workflow and layout passed");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archcad-browser-api-")),
    token = "integration-owner-token-".repeat(3),
    service = createService({
      dataDir: dir,
      users: { [token]: { id: "owner" } },
      origins: [new URL(page.url()).origin],
    });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + service.server.address().port;
  const api = async (route, method = "GET", body, key = token) => {
    const r = await fetch(origin + "/api/" + route, {
      method,
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    assert.ok(r.ok, JSON.stringify(d));
    return d;
  };
  let review;
  try {
    const remote = await api("projects", "POST", {
      project: await page.evaluate(() => ProjectState.capture()),
    });
    await page.evaluate(
      async ({ origin, token, remote }) => {
        DesignSync.server = origin;
        DesignSync.token = token;
        DesignSync.projectId = remote.id;
        DesignSync.revision = remote.revision;
        DesignSync.localBase = JSON.stringify(remote.project);
        clearInterval(DesignSync.timer);
        await WorkbenchSync.identify();
      },
      { origin, token, remote },
    );
    await context.setOffline(true);
    await page.evaluate(async () => {
      await WorkbenchSync.queue({
        ...ProjectState.capture(),
        name: "Queued offline",
      });
    });
    assert.equal(
      await page.evaluate(async () => (await WorkbenchSync.jobs()).length),
      1,
    );
    await context.setOffline(false);
    await waitJobs((j) => j.length === 0);
    const saved = await api("projects/" + remote.id);
    assert.equal(saved.project.name, "Queued offline");
    assert.equal(saved.revision, remote.revision + 1);
    console.log("Integration: offline replay passed");
    await context.setOffline(true);
    await page.evaluate(async () =>
      WorkbenchSync.queue({
        ...ProjectState.capture(),
        name: "Unsent local conflict",
      }),
    );
    const competitor = await api("projects/" + remote.id, "PUT", {
      project: { ...saved.project, name: "Remote competing revision" },
      expectedRevision: saved.revision,
      clientId: "other-client",
    });
    await context.setOffline(false);
    await waitJobs((j) => j.some((j) => j.status === "conflict"));
    assert.equal(
      (await api("projects/" + remote.id)).project.name,
      "Remote competing revision",
    );
    await page.evaluate(async () => {
      const job = (await WorkbenchSync.jobs()).find(
        (j) => j.status === "conflict",
      );
      await WorkbenchSync.openConflict(job.id);
    });
    assert.equal(
      await page.evaluate(() => ProjectState.capture().name),
      "Unsent local conflict",
    );
    await page.evaluate(async () => DesignSync.acceptRemote());
    assert.equal(
      await page.evaluate(() => ProjectState.capture().name),
      "Remote competing revision",
    );
    assert.equal(
      await page.evaluate(async () => (await WorkbenchSync.jobs()).length),
      0,
    );
    console.log("Integration: conflict recovery passed");
    const share = await api("projects/" + remote.id + "/shares", "POST", {
      comments: true,
      days: 1,
    });
    review = await context.newPage();
    const errors = [];
    review.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("Review error", e.message);
    });
    review.on("console", (m) => {
      if (m.type() === "error") console.log("Review console", m.text());
    });
    await review.goto(
      origin +
        "/review.html#" +
        new URLSearchParams({
          server: origin,
          project: remote.id,
          token: share.token,
        }),
    );
    try {
      await review.waitForFunction(
        () =>
          typeof ReviewWorkbench !== "undefined" &&
          ReviewWorkbench.loaded &&
          document.querySelector("#drawing svg"),
        null,
        { timeout: 10000 },
      );
    } catch (e) {
      throw Error(
        (await review.locator("body").innerText()) + "; " + errors.join(";"),
      );
    }
    console.log("Integration: review loaded");
    await review
      .locator("#review-issue-title")
      .fill("<script>review issue</script>");
    await review.locator("#review-issue-assignee").fill("Owner");
    await review.locator("#review-issue-post").click();
    await review.waitForFunction(() => ReviewWorkbench.issues.length === 1);
    assert.equal(await review.locator("#review-issues script").count(), 0);
    await review.locator("#review-markup-start").click();
    const svg = review.locator("#drawing svg");
    await svg.scrollIntoViewIfNeeded();
    const box = await svg.boundingBox();
    await review.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
    await review.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await review.waitForFunction(() => ReviewWorkbench.markups.length === 1);
    assert.equal(
      (await api("projects/" + remote.id + "/markups")).markups.length,
      1,
    );
    assert.equal(errors.length, 0, errors.join("\n"));
    const issue = (await api("projects/" + remote.id + "/issues")).issues[0];
    await api("projects/" + remote.id + "/issues/" + issue.id, "PATCH", {
      status: "resolved",
    });
    assert.equal(
      (await api("projects/" + remote.id + "/issues")).issues[0].status,
      "resolved",
    );
    console.log(
      "Integration: floor-copy undo, portable template metadata, real offline replay, CAS conflicts, scoped review issues/markup passed",
    );
  } finally {
    await context.setOffline(false);
    if (review) await review.close();
    await page.evaluate(() => {
      DesignSync.server = "";
      DesignSync.token = "";
      DesignSync.projectId = "";
      clearInterval(DesignSync.timer);
      WorkbenchSync.account = null;
    });
    await new Promise((r) => service.server.close(r));
    fs.rmSync(dir, { recursive: true, force: true });
  }
};
