/* Explicit operator command; creates a private token file and never logs tokens. */
const fs = require("node:fs"),
  crypto = require("node:crypto"),
  path = require("node:path");
function createUser(id, file) {
  if (!/^[-\w@.]{1,100}$/.test(id || ""))
    throw Error("Provide a valid user identity");
  const target = path.resolve(file),
    users = fs.existsSync(target)
      ? JSON.parse(fs.readFileSync(target, "utf8"))
      : {};
  if (Object.values(users).some((u) => u.id === id))
    throw Error("User already exists; rotate its token explicitly");
  users[crypto.randomBytes(32).toString("base64url")] = { id };
  fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
  fs.writeFileSync(target, JSON.stringify(users, null, 2), { mode: 0o600 });
  fs.chmodSync(target, 0o600);
  return target;
}
if (require.main === module) {
  try {
    const [id, file] = process.argv.slice(2);
    if (!file)
      throw Error(
        "Usage: node server/create-user.cjs USER_ID /private/path/users.json",
      );
    console.log("Private account file saved: " + createUser(id, file));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { createUser };
