const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { createService } = require("../server/server.cjs");
test("authenticated sync enforces ownership, leases, revisions, review comments and persistence", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archcad-server-")),
    alice = "a".repeat(32),
    bob = "b".repeat(32),
    service = createService({
      dataDir: dir,
      users: { [alice]: { id: "alice" }, [bob]: { id: "bob" } },
    });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + service.server.address().port;
  const api = async (route, token = alice, method = "GET", body) => {
    const r = await fetch(origin + "/api/" + route, {
      method,
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    assert.equal((await api("projects", "invalid")).status, 401);
    const created = await api("projects", alice, "POST", {
      project: {
        name: "Shared",
        elements: [
          {
            id: "room",
            type: "bedroom",
            x: 20,
            y: 20,
            w: 120,
            h: 120,
            floor: 0,
          },
        ],
        fixtures: [],
      },
    });
    assert.equal(created.status, 201);
    const id = created.data.id;
    assert.equal((await api("projects/" + id, bob)).status, 403);
    assert.equal(
      (
        await api("projects/" + id + "/members", alice, "POST", {
          user: "bob",
          role: "editor",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api("projects/" + id + "/locks", alice, "POST", {
          objectId: "room",
          clientId: "alice-tab",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api("projects/" + id + "/locks", bob, "POST", {
          objectId: "room",
          clientId: "alice-tab",
          release: true,
        })
      ).status,
      423,
    );
    const changed = structuredClone(created.data.project);
    changed.elements[0].x = 30;
    assert.equal(
      (
        await api("projects/" + id, bob, "PUT", {
          project: changed,
          expectedRevision: 1,
          clientId: "bob-tab",
        })
      ).status,
      423,
    );
    assert.equal(
      (
        await api("projects/" + id, bob, "PUT", {
          project: changed,
          expectedRevision: 1,
          clientId: "alice-tab",
        })
      ).status,
      423,
    );
    assert.equal(
      (
        await api("projects/" + id, alice, "PUT", {
          project: changed,
          expectedRevision: 1,
          clientId: "alice-tab",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api("projects/" + id, bob, "PUT", {
          project: changed,
          expectedRevision: 1,
          clientId: "bob-tab",
        })
      ).status,
      409,
    );
    const share = await api("projects/" + id + "/shares", alice, "POST", {
      days: 1,
      comments: true,
    });
    assert.equal(share.status, 201);
    assert.equal((await api("projects/" + id, share.data.token)).status, 200);
    assert.equal(
      (
        await api("projects/" + id, share.data.token, "PUT", {
          project: changed,
          expectedRevision: 2,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await api("projects/" + id + "/comments", share.data.token, "POST", {
          text: "<script>plain text</script>",
          anchor: { floor: 0, x: 30, y: 30 },
        })
      ).status,
      201,
    );
    assert.equal((await api("projects", share.data.token)).status, 403);
    const other = await api("projects", alice, "POST", {
      project: { name: "Private", elements: [], fixtures: [] },
    });
    assert.equal(
      (await api("projects/" + other.data.id, share.data.token)).status,
      403,
    );

    assert.equal(
      (await fetch(origin + "/server/.data/projects.json")).status,
      404,
    );
    const response = await fetch(origin + "/api/projects", {
      headers: {
        Origin: "https://evil.example",
        Authorization: "Bearer " + alice,
      },
    });
    assert.equal(response.status, 403);
    assert.ok(
      JSON.parse(fs.readFileSync(path.join(dir, "projects.json"))).projects[id],
    );
    assert.equal((await api("projects/" + id, alice, "DELETE")).status, 200);
    assert.equal((await api("trash")).data.projects.length, 1);
    assert.equal(
      (await api("projects/" + id + "/restore", alice, "POST")).status,
      200,
    );
  } finally {
    await service.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
