/* Read a mounted secret, then run the service as the unprivileged image user. */
const fs = require("node:fs");
const users = JSON.parse(
  process.env.ARCHCAD_USERS_FILE
    ? fs.readFileSync(process.env.ARCHCAD_USERS_FILE, "utf8")
    : process.env.ARCHCAD_USERS || "{}",
);
const dataDir = process.env.ARCHCAD_DATA_DIR || "/data";
fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
if (process.getuid?.() === 0) {
  fs.chownSync(dataDir, 1000, 1000);
  process.setgroups([]);
  process.setgid(1000);
  process.setuid(1000);
}
const { createService } = require("./server.cjs");
const service = createService({ users, dataDir });
service.server.listen(
  Number(process.env.PORT || 8080),
  process.env.HOST || "0.0.0.0",
  () => console.log("ArchCAD project service ready"),
);
