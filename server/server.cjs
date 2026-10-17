/* Authenticated single-instance project service. Deploy with persistent storage and HTTPS. */
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
require("../js/project-model.js");
require("../js/planning-model.js");
require("../js/design-model.js");
const P = global.ProjectModel;
function createService(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, "..")),
    dataDir = path.resolve(
      options.dataDir ||
        process.env.ARCHCAD_DATA_DIR ||
        path.join(__dirname, ".data"),
    ),
    users = options.users || JSON.parse(process.env.ARCHCAD_USERS || "{}"),
    origins =
      options.origins ||
      String(process.env.ARCHCAD_ALLOWED_ORIGINS || "")
        .split(",")
        .filter(Boolean),
    now = options.now || Date.now;
  if (!Object.keys(users).length)
    throw Error(
      "Configure ARCHCAD_USERS with independent access tokens and user identities",
    );
  for (const [token, user] of Object.entries(users))
    if (token.length < 24 || !user || !/^[-\w@.]{1,100}$/.test(user.id || ""))
      throw Error(
        "User tokens must be at least 24 characters and identities must be valid",
      );
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const file = path.join(dataDir, "projects.json");
  let store = { projects: {}, shares: {} };
  if (fs.existsSync(file)) store = JSON.parse(fs.readFileSync(file, "utf8"));
  const rates = new Map(),
    sessions = new Map(),
    locks = new Map(),
    hash = (s) => crypto.createHash("sha256").update(s).digest("hex"),
    persist = () => {
      const tmp = file + ".tmp";
      fs.writeFileSync(tmp, JSON.stringify(store), { mode: 0o600 });
      fs.renameSync(tmp, file);
    },
    id = () => crypto.randomUUID(),
    valid = (s) => typeof s === "string" && /^[\w-]{1,100}$/.test(s),
    fail = (status, message) => Object.assign(Error(message), { status });
  const auth = (req) => {
    const token = String(req.headers.authorization || "").replace(
        /^Bearer /,
        "",
      ),
      digest = hash(token);
    for (const [key, value] of Object.entries(users))
      if (crypto.timingSafeEqual(Buffer.from(hash(key)), Buffer.from(digest)))
        return { ...value, token };
    const share = store.shares[digest];
    if (share && share.expires > now()) return { id: "reviewer", share };
    throw fail(401, "Invalid or expired access token");
  };
  const access = (user, p, write = false) => {
    if (p.deleted) throw fail(404, "Project is deleted");
    const role = user.share
      ? user.share.project === p.id
        ? "reviewer"
        : null
      : p.owner === user.id
        ? "owner"
        : p.members[user.id];
    if (!role || (write && !["owner", "editor"].includes(role)))
      throw fail(403, "Project access denied");
    return role;
  };
  const clean = () => {
    for (const [k, v] of sessions) if (v.expires < now()) sessions.delete(k);
    for (const [k, v] of locks) if (v.expires < now()) locks.delete(k);
  };
  const event = (p, user, type) => {
    p.activity.unshift({
      id: id(),
      user: user.id,
      type,
      time: new Date(now()).toISOString(),
    });
    p.activity = p.activity.slice(0, 200);
  };
  const readBody = (req) =>
    new Promise((resolve, reject) => {
      let size = 0,
        chunks = [];
      req.on("data", (c) => {
        size += c.length;
        if (size > 12 * 1024 * 1024) {
          reject(fail(413, "Request exceeds 12 MB"));
          req.destroy();
        } else chunks.push(c);
      });
      req.on("end", () => {
        try {
          resolve(
            chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {},
          );
        } catch {
          reject(fail(400, "Invalid JSON body"));
        }
      });
      req.on("error", reject);
    });
  const snapshot = (p) => ({
    id: p.id,
    revision: p.revision,
    project: p.project,
    comments: p.comments,
    owner: p.owner,
    members: p.members,
    activity: p.activity,
    updatedAt: p.updatedAt,
  });
  const server = http.createServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    const url = new URL(req.url, "http://localhost");
    try {
      const origin = req.headers.origin;
      if (origin) {
        const own = "http://" + req.headers.host,
          https = "https://" + req.headers.host;
        if (!origins.includes(origin) && origin !== own && origin !== https)
          throw fail(403, "Origin is not allowed");
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Authorization,Content-Type",
        );
        res.setHeader(
          "Access-Control-Allow-Methods",
          "GET,POST,PUT,DELETE,OPTIONS",
        );
      }
      const json = (status, data) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      };
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === "/api/health")
        return json(200, {
          service: "archcad-projects",
          configured: true,
          version: 1,
        });
      if (!url.pathname.startsWith("/api/")) {
        if (req.method !== "GET" && req.method !== "HEAD")
          throw fail(405, "Use GET");
        const name = decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname,
          ),
          resolved = path.resolve(root, "." + name);
        if (
          !resolved.startsWith(root + path.sep) ||
          name.split("/").some((s) => s.startsWith(".")) ||
          name.startsWith("/server/") ||
          name.startsWith("/tests/") ||
          name.startsWith("/node_modules/") ||
          name.startsWith("/api/")
        )
          throw fail(404, "Not found");
        const allowed = /\.(html|js|css|json|svg|png|jpg|webp|txt|md)$/i.test(
          resolved,
        );
        if (
          !allowed ||
          !fs.existsSync(resolved) ||
          !fs.statSync(resolved).isFile()
        )
          throw fail(404, "Not found");
        res.setHeader(
          "Content-Type",
          resolved.endsWith(".js")
            ? "text/javascript"
            : resolved.endsWith(".css")
              ? "text/css"
              : resolved.endsWith(".html")
                ? "text/html"
                : resolved.endsWith(".svg")
                  ? "image/svg+xml"
                  : resolved.endsWith(".json")
                    ? "application/json"
                    : "text/plain",
        );
        res.writeHead(200);
        return req.method === "HEAD"
          ? res.end()
          : fs.createReadStream(resolved).pipe(res);
      }
      clean();
      const ip = req.socket.remoteAddress || "unknown",
        bucket = rates.get(ip) || { start: now(), count: 0 };
      if (now() - bucket.start > 60000) {
        bucket.start = now();
        bucket.count = 0;
      }
      bucket.count++;
      rates.set(ip, bucket);
      if (bucket.count > 600) throw fail(429, "Request rate exceeded");
      if (rates.size > 1000)
        for (const [k, v] of rates)
          if (now() - v.start > 60000) rates.delete(k);
      const user = auth(req),
        parts = url.pathname.split("/").filter(Boolean),
        body = ["POST", "PUT"].includes(req.method) ? await readBody(req) : {};
      if (parts[1] === "projects" && parts.length === 2) {
        if (user.share) throw fail(403, "Review tokens cannot list projects");
        if (req.method === "GET")
          return json(200, {
            projects: Object.values(store.projects)
              .filter(
                (p) =>
                  !p.deleted && (p.owner === user.id || p.members[user.id]),
              )
              .map((p) => ({
                id: p.id,
                name: p.project.name,
                revision: p.revision,
                owner: p.owner,
                updatedAt: p.updatedAt,
              })),
          });
        if (req.method === "POST") {
          const project = P.normalize(body.project),
            projectId = id(),
            p = {
              id: projectId,
              project,
              revision: 1,
              owner: user.id,
              members: {},
              comments: [],
              activity: [],
              updatedAt: new Date(now()).toISOString(),
            };
          store.projects[projectId] = p;
          event(p, user, "Created project");
          persist();
          return json(201, snapshot(p));
        }
        throw fail(405, "Unsupported method");
      }
      if (parts[1] === "trash" && req.method === "GET" && !user.share)
        return json(200, {
          projects: Object.values(store.projects)
            .filter((p) => p.deleted && p.owner === user.id)
            .map((p) => ({ id: p.id, name: p.project.name })),
        });
      if (parts[1] !== "projects" || !valid(parts[2]))
        throw fail(404, "Not found");
      const p = store.projects[parts[2]];
      if (!p) throw fail(404, "Project not found");
      if (
        parts[3] === "restore" &&
        req.method === "POST" &&
        p.owner === user.id
      ) {
        p.deleted = false;
        event(p, user, "Restored project");
        persist();
        return json(200, snapshot(p));
      }
      const role = access(
        user,
        p,
        ["PUT", "DELETE"].includes(req.method) ||
          ["members", "shares", "locks"].includes(parts[3]),
      );
      if (parts.length === 3) {
        if (req.method === "GET") return json(200, { ...snapshot(p), role });
        if (req.method === "DELETE") {
          if (role !== "owner")
            throw fail(403, "Only the owner can delete this project");
          p.deleted = true;
          event(p, user, "Deleted project");
          persist();
          return json(200, { deleted: true });
        }
        if (req.method === "PUT") {
          if (body.expectedRevision !== p.revision)
            return json(409, {
              error: "Revision conflict",
              current: snapshot(p),
            });
          const candidate = P.normalize(body.project),
            objectMap = (q) =>
              new Map(
                [
                  ...q.elements,
                  ...q.fixtures,
                  ...q.planning.walls,
                  ...q.planning.services,
                ].map((e) => [e.id, e]),
              ),
            before = objectMap(p.project),
            after = objectMap(candidate);
          for (const [key, lock] of locks)
            if (
              key.startsWith(p.id + ":") &&
              (lock.clientId !== body.clientId || lock.user !== user.id)
            ) {
              const objectId = key.slice(p.id.length + 1);
              if (
                JSON.stringify(before.get(objectId)) !==
                JSON.stringify(after.get(objectId))
              )
                throw fail(423, "Object is owned by another editing session");
            }
          p.history ||= [];
          p.history.unshift({
            revision: p.revision,
            project: p.project,
            time: p.updatedAt,
          });
          p.history = p.history.slice(0, 20);
          p.project = candidate;
          p.revision++;
          p.updatedAt = new Date(now()).toISOString();
          event(p, user, "Saved revision " + p.revision);
          persist();
          return json(200, snapshot(p));
        }
        throw fail(405, "Unsupported method");
      }
      const action = parts[3];
      if (action === "members" && req.method === "POST") {
        if (role !== "owner")
          throw fail(403, "Only owner can change membership");
        if (
          !Object.values(users).some((u) => u.id === body.user) ||
          !["editor", "viewer", "remove"].includes(body.role)
        )
          throw fail(400, "Choose a configured user and role");
        if (body.role === "remove") delete p.members[body.user];
        else p.members[body.user] = body.role;
        event(p, user, "Changed project membership");
        persist();
        return json(200, { members: p.members });
      }
      if (action === "shares" && req.method === "POST") {
        if (role !== "owner") throw fail(403, "Only owner can share");
        const token = crypto.randomBytes(32).toString("base64url"),
          days = Math.max(1, Math.min(90, Number(body.days) || 7));
        store.shares[hash(token)] = {
          project: p.id,
          expires: now() + days * 86400000,
          comments: !!body.comments,
        };
        event(p, user, "Created read-only review link");
        persist();
        return json(201, {
          token,
          project: p.id,
          expires: store.shares[hash(token)].expires,
        });
      }
      if (action === "comments" && req.method === "POST") {
        if (user.share && !user.share.comments)
          throw fail(403, "This review link does not allow comments");
        if (
          typeof body.text !== "string" ||
          !body.text.trim() ||
          body.text.length > 2000
        )
          throw fail(400, "Comment must contain 1–2000 characters");
        const anchor = body.anchor || {};
        if (
          !Number.isInteger(anchor.floor) ||
          anchor.floor < 0 ||
          anchor.floor >= p.project.floorCount ||
          !Number.isFinite(anchor.x) ||
          !Number.isFinite(anchor.y)
        )
          throw fail(400, "Comment requires a valid drawing anchor");
        const c = {
          id: id(),
          user: user.id,
          text: body.text,
          anchor: {
            floor: anchor.floor,
            x: anchor.x,
            y: anchor.y,
            objectId: String(anchor.objectId || "").slice(0, 100),
          },
          time: new Date(now()).toISOString(),
        };
        p.comments.push(c);
        if (p.comments.length > 1000) p.comments.shift();
        event(p, user, "Added anchored comment");
        persist();
        return json(201, c);
      }
      if (action === "presence") {
        if (user.share)
          throw fail(403, "Reviewers cannot join editing presence");
        if (req.method === "POST") {
          if (!valid(body.clientId))
            throw fail(400, "Invalid session identity");
          sessions.set(p.id + ":" + body.clientId, {
            user: user.id,
            clientId: body.clientId,
            state: String(body.state || "Viewing").slice(0, 80),
            expires: now() + 30000,
          });
          return json(200, { ok: true });
        }
        return json(200, {
          presence: [...sessions]
            .filter(([k]) => k.startsWith(p.id + ":"))
            .map(([, v]) => v),
          locks: [...locks]
            .filter(([k]) => k.startsWith(p.id + ":"))
            .map(([k, v]) => ({ objectId: k.slice(p.id.length + 1), ...v })),
          revision: p.revision,
          comments: p.comments.length,
        });
      }
      if (action === "locks" && req.method === "POST") {
        if (
          !valid(body.clientId) ||
          typeof body.objectId !== "string" ||
          body.objectId.length > 100
        )
          throw fail(400, "Invalid ownership request");
        if (
          ![
            ...p.project.elements,
            ...p.project.fixtures,
            ...p.project.planning.walls,
            ...p.project.planning.services,
          ].some((e) => e.id === body.objectId)
        )
          throw fail(404, "Object not found");
        const key = p.id + ":" + body.objectId,
          previous = locks.get(key);
        if (
          previous &&
          (previous.clientId !== body.clientId || previous.user !== user.id)
        )
          throw fail(423, "Object is already owned by another session");
        if (body.release) {
          if (previous?.clientId === body.clientId && previous.user === user.id)
            locks.delete(key);
        } else
          locks.set(key, {
            user: user.id,
            clientId: body.clientId,
            expires: now() + 30000,
          });
        return json(200, { owned: !body.release });
      }
      if (action === "history" && req.method === "GET")
        return json(200, { history: p.history || [] });
      throw fail(404, "Not found");
    } catch (error) {
      if (!res.headersSent) {
        res.writeHead(error.status || 400, {
          "Content-Type": "application/json",
        });
        res.end(
          JSON.stringify({
            error: error.status
              ? error.message
              : "Request could not be validated: " + error.message,
          }),
        );
      } else res.end();
    }
  });
  return {
    server,
    close: () => new Promise((resolve) => server.close(resolve)),
    store,
  };
}
if (require.main === module) {
  const service = createService();
  const port = Number(process.env.PORT || 8080),
    host = process.env.HOST || "127.0.0.1";
  service.server.listen(port, host, () =>
    console.log("ArchCAD project service listening on " + host + ":" + port),
  );
}
module.exports = { createService };
