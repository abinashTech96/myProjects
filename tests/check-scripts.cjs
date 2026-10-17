const fs = require("node:fs"),
  cp = require("node:child_process"),
  path = require("node:path");
let failed = false;
for (const dir of ["js", "ProNavBar", "api"])
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".js"))) {
    const name = path.join(dir, file),
      result = cp.spawnSync(
        process.execPath,
        [
          dir === "api" ? "--input-type=module" : "--input-type=commonjs",
          "--check",
        ],
        { input: fs.readFileSync(name), encoding: "utf8" },
      );
    if (result.status) {
      failed = true;
      console.error(name, result.stderr);
    }
  }
const html = fs.readFileSync("index.html", "utf8");
for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
  if (!/^https?:/.test(match[1]) && !fs.existsSync(match[1])) {
    failed = true;
    console.error("Missing local asset:", match[1]);
  }
}
if (failed) process.exitCode = 1;
else
  console.log("All JavaScript syntax and local entry-point references passed.");
