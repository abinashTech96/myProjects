/* Public connection settings only. Provider secrets belong on the server. */
const CONFIG = {
  ACTIVE_LLM: "server",
  DEFAULT_MODEL: "server",
  MODELS: {
    server: {
      label: "Configured AI service",
      group: "AI connection",
      protocol: "router",
      endpoint: "/api/ai-router",
    },
  },
  MANIFEST: [
    { name: "addRoom" },
    { name: "moveElement" },
    { name: "deleteElementAI" },
  ],
};
