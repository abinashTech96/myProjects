/* Operator-controlled backup/restore. Restore requires an explicit destination. */
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
function backup(dataDir, target) {
  const source = path.join(dataDir, "projects.json"),
    data = fs.readFileSync(source, "utf8");
  JSON.parse(data);
  const envelope = {
    format: "archcad-service-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    sha256: crypto.createHash("sha256").update(data).digest("hex"),
    data,
  };
  fs.mkdirSync(path.dirname(path.resolve(target)), {
    recursive: true,
    mode: 0o700,
  });
  fs.writeFileSync(target, JSON.stringify(envelope), { mode: 0o600 });
  return target;
}
function restore(source, dataDir) {
  const b = JSON.parse(fs.readFileSync(source, "utf8"));
  if (
    b.format !== "archcad-service-backup" ||
    b.version !== 1 ||
    crypto.createHash("sha256").update(b.data).digest("hex") !== b.sha256
  )
    throw Error("Invalid or damaged backup");
  const data = JSON.parse(b.data);
  if (!data.projects || !data.shares)
    throw Error("Backup is missing service collections");
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const target = path.join(dataDir, "projects.json");
  if (fs.existsSync(target))
    backup(
      dataDir,
      path.join(dataDir, "before-restore-" + Date.now() + ".json"),
    );
  fs.writeFileSync(target + ".restore", b.data, { mode: 0o600 });
  fs.renameSync(target + ".restore", target);
}
if (require.main === module) {
  try {
    const [mode, source, target] = process.argv.slice(2);
    if (!target || !["backup", "restore"].includes(mode))
      throw Error(
        "Usage: node server/backup.cjs backup DATA_DIR BACKUP_FILE | restore BACKUP_FILE DATA_DIR",
      );
    if (mode === "backup") backup(source, target);
    else restore(source, target);
    console.log(mode + " completed");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { backup, restore };
