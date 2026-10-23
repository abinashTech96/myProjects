const { createService } = require("../server/server.cjs");
const fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
module.exports = async ({ page, context, assert }) => {
  const dataDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "archcad-browser-service-"),
    ),
    token = "browser-test-token-".repeat(3);
  const service = createService({
    dataDir,
    users: { [token]: { id: "owner" } },
    origins: [new URL(page.url()).origin],
  });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  const server = "http://127.0.0.1:" + service.server.address().port;
  let review;
  try {
    await page.evaluate(
      async ({ server, token }) => {
        await DesignSync.dialog();
        document.getElementById("sync-server").value = server;
        document.getElementById("sync-token").value = token;
        await DesignSync.connect();
        await DesignSync.create();
      },
      { server, token },
    );
    assert.equal(await page.evaluate(() => DesignSync.revision), 1);
    await page.evaluate(async () => {
      StudioUI.edit(0, "customName", "Remote regression");
      await DesignSync.push();
    });
    assert.equal(await page.evaluate(() => DesignSync.revision), 2);
    await page.evaluate(async () => {
      DesignSync.shareDialog();
      document.getElementById("share-comments").checked = true;
      await DesignSync.share();
    });
    const url = await page.locator("#review-link").inputValue();
    review = await context.newPage();
    await review.goto(url);
    await review.waitForSelector("#drawing svg");
    assert.ok(
      (await review.locator("#status").innerText()).includes("Read-only"),
    );
    assert.ok(await review.locator("#drawing line").count());
    assert.equal(await review.evaluate(() => typeof StudioUI), "undefined");
    await review.locator("#drawing svg").click({ position: { x: 80, y: 80 } });
    await review
      .getByLabel("Comment", { exact: true })
      .fill("Review anchor regression");
    await review.locator("#post").click();
    await review
      .getByText("reviewer · F0: Review anchor regression", { exact: true })
      .waitFor();
    await review.close();
    review = null;
    await page.evaluate(async () => {
      document.getElementById("studio-dialog").close();
      const remote = await DesignSync.request(
        "projects/" + DesignSync.projectId,
      );
      remote.project.elements[0].customName = "Remote competing edit";
      await DesignSync.request("projects/" + DesignSync.projectId, "PUT", {
        project: remote.project,
        expectedRevision: remote.revision,
        clientId: "other-tab",
      });
      StudioUI.edit(0, "customName", "Local competing edit");
      await DesignSync.push();
    });
    assert.ok(
      (await page.locator("dialog").innerText()).includes(
        "Resolve remote revision conflict",
      ),
    );
    assert.equal(
      await page.evaluate(() => elements[0].customName),
      "Local competing edit",
    );
    await page.evaluate(async () => DesignSync.acceptRemote());
    assert.equal(
      await page.evaluate(() => elements[0].customName),
      "Remote competing edit",
    );
    console.log(
      "Browser sync: authenticated save, read-only review, anchored comments and revision conflict recovery passed",
    );
  } finally {
    if (review) await review.close();
    await page.evaluate(() => {
      clearInterval(DesignSync.timer);
      DesignSync.projectId = "";
      DesignSync.server = "";
      DesignSync.token = "";
      sessionStorage.removeItem("ArchCAD_ProjectToken");
      sessionStorage.removeItem("ArchCAD_ProjectServer");
    });
    // Browser keep-alive sockets must not hold this disposable test service open.
    service.server.closeAllConnections();
    await service.close();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
};
