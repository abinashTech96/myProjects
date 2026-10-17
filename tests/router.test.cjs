const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
let handler;
const load = async () =>
  (handler ??= (
    await import(
      "data:text/javascript;base64," +
        Buffer.from(fs.readFileSync("api/ai-router.js", "utf8")).toString(
          "base64",
        )
    )
  ).default);
const response = () => ({
  code: 0,
  headers: {},
  status(code) {
    this.code = code;
    return this;
  },
  setHeader(k, v) {
    this.headers[k] = v;
  },
  json(data) {
    this.data = data;
    return this;
  },
  end() {
    return this;
  },
});
test(
  "router rejects missing authorization and uses provider-specific auth/status",
  { concurrency: false },
  async () => {
    const route = await load(),
      oldFetch = global.fetch,
      old = { ...process.env };
    try {
      process.env.ARCHCAD_ACCESS_TOKEN = "test-access";
      process.env.OPENAI_SECRET_KEY = "test-provider";
      process.env.OPENAI_MODEL = "test-model";
      let res = response();
      await route({ method: "POST", headers: {}, body: {} }, res);
      assert.equal(res.code, 401);
      let sent;
      global.fetch = async (url, args) => {
        sent = { url, args };
        return {
          status: 429,
          json: async () => ({ error: { message: "Rate limit" } }),
        };
      };
      res = response();
      await route(
        {
          method: "POST",
          headers: { authorization: "Bearer test-access" },
          body: { provider: "openai", promptBody: { prompt: "test" } },
        },
        res,
      );
      assert.equal(res.code, 429);
      assert.equal(sent.args.headers.Authorization, "Bearer test-provider");
      assert.equal(sent.url, "https://api.openai.com/v1/chat/completions");
      assert.ok(!sent.url.includes("key="));
    } finally {
      global.fetch = oldFetch;
      for (const k of Object.keys(process.env))
        if (!(k in old)) delete process.env[k];
      Object.assign(process.env, old);
    }
  },
);
test(
  "router restricts origins and permits configured preflight",
  { concurrency: false },
  async () => {
    const route = await load(),
      old = process.env.ARCHCAD_ALLOWED_ORIGIN;
    try {
      process.env.ARCHCAD_ALLOWED_ORIGIN = "https://example.com";
      let res = response();
      await route(
        { method: "OPTIONS", headers: { origin: "https://bad.example" } },
        res,
      );
      assert.equal(res.code, 403);
      res = response();
      await route(
        { method: "OPTIONS", headers: { origin: "https://example.com" } },
        res,
      );
      assert.equal(res.code, 204);
      assert.equal(
        res.headers["Access-Control-Allow-Origin"],
        "https://example.com",
      );
    } finally {
      if (old === undefined) delete process.env.ARCHCAD_ALLOWED_ORIGIN;
      else process.env.ARCHCAD_ALLOWED_ORIGIN = old;
    }
  },
);
