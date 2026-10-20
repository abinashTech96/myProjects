const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path");
const { createService } = require("../server/server.cjs"),
  { createUser } = require("../server/create-user.cjs"),
  { backup, restore } = require("../server/backup.cjs");
test("review issues and markup enforce share scope, comment permission and editor-only status changes", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archcad-wb-server-")),
    token = "owner-token-".repeat(4),
    viewer = "viewer-token-".repeat(4),
    service = createService({
      dataDir: dir,
      users: { [token]: { id: "owner" }, [viewer]: { id: "viewer" } },
    });
  await new Promise((r) => service.server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + service.server.address().port,
    api = async (route, method = "GET", body, key = token) => {
      const response = await fetch(origin + "/api/" + route, {
        method,
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return { status: response.status, data: await response.json() };
    };
  try {
    assert.equal((await fetch(origin + "/deployment/users.json")).status, 404);
    assert.equal((await api("me")).data.id, "owner");
    const p = await api("projects", "POST", {
        project: { name: "Review test", elements: [], fixtures: [] },
      }),
      id = p.data.id;
    await api("projects/" + id + "/members", "POST", {
      user: "viewer",
      role: "viewer",
    });
    const share = await api("projects/" + id + "/shares", "POST", {
        comments: true,
        days: 1,
      }),
      readOnly = await api("projects/" + id + "/shares", "POST", {
        comments: false,
        days: 1,
      }),
      issue = {
        title: "<img src=x onerror=alert(1)>",
        description: "plain text",
        assignee: "owner",
        priority: "high",
        status: "open",
        anchor: { floor: 0, x: 10, y: 20 },
        due: "2026-12-01",
      };
    assert.equal(
      (await api("me", "GET", undefined, share.data.token)).status,
      403,
    );
    assert.equal(
      (
        await api(
          "projects/" + id + "/issues",
          "POST",
          issue,
          readOnly.data.token,
        )
      ).status,
      403,
    );
    const added = await api(
      "projects/" + id + "/issues",
      "POST",
      issue,
      share.data.token,
    );
    assert.equal(added.status, 201);
    assert.equal(
      (
        await api(
          "projects/" + id + "/issues/" + added.data.id,
          "PATCH",
          { status: "resolved" },
          share.data.token,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api(
          "projects/" + id + "/issues/" + added.data.id,
          "PATCH",
          { status: "resolved" },
          viewer,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await api("projects/" + id + "/issues/" + added.data.id, "PATCH", {
          status: "resolved",
        })
      ).data.status,
      "resolved",
    );
    const markup = {
      kind: "arrow",
      color: "#f59e0b",
      floor: 0,
      points: [
        { x: 10, y: 20 },
        { x: 50, y: 60 },
      ],
      label: "Check opening",
    };
    assert.equal(
      (
        await api(
          "projects/" + id + "/markups",
          "POST",
          markup,
          share.data.token,
        )
      ).status,
      201,
    );
    assert.equal(
      (
        await api(
          "projects/" + id + "/markups",
          "POST",
          { ...markup, color: "url(https://evil.example)" },
          share.data.token,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await api(
          "projects/" + id + "/markups",
          "GET",
          undefined,
          share.data.token,
        )
      ).data.markups.length,
      1,
    );
    assert.equal(
      (
        await api(
          "projects/" + id + "/issues",
          "GET",
          undefined,
          share.data.token,
        )
      ).data.issues[0].title,
      issue.title,
    );
    const headers = await fetch(
      origin + "/api/projects/" + id + "/issues/" + added.data.id,
      { method: "OPTIONS", headers: { Origin: origin } },
    );
    assert.ok(
      headers.headers.get("access-control-allow-methods").includes("PATCH"),
    );
    const pdf = await fetch(origin + "/vendor/pdfjs/pdf.min.mjs");
    assert.ok(pdf.headers.get("content-type").includes("javascript"));
  } finally {
    await service.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
test("private user provisioning and integrity-checked backups round trip without logging tokens", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "archcad-wb-ops-"));
  try {
    const userFile = path.join(dir, "users.json");
    assert.equal(createUser("owner", userFile), userFile);
    const users = JSON.parse(fs.readFileSync(userFile));
    assert.equal(Object.values(users)[0].id, "owner");
    assert.ok(Object.keys(users)[0].length >= 32);
    assert.equal(fs.statSync(userFile).mode & 0o777, 0o600);
    assert.throws(() => createUser("owner", userFile));
    const dataDir = path.join(dir, "source"),
      target = path.join(dir, "restored");
    fs.mkdirSync(dataDir);
    fs.writeFileSync(
      path.join(dataDir, "projects.json"),
      JSON.stringify({ projects: { a: { id: "a" } }, shares: {} }),
    );
    const file = path.join(dir, "backup.json");
    backup(dataDir, file);
    restore(file, target);
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(target, "projects.json"))),
      { projects: { a: { id: "a" } }, shares: {} },
    );
    const bad = JSON.parse(fs.readFileSync(file));
    bad.data += " ";
    fs.writeFileSync(file, JSON.stringify(bad));
    assert.throws(() => restore(file, target));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
