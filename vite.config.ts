import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { threeThingsApi } from "./server/api";
import { fileStorage } from "./server/relay";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const effort = env.DISTILL_EFFORT;

  return {
    plugins: [
      react(),
      threeThingsApi({
        apiKey: env.ANTHROPIC_API_KEY || undefined,
        effort: effort === "low" || effort === "medium" ? effort : "high",
        // Questions sent to people, until their answers are collected. Never committed.
        relayStorage: fileStorage(".data/relay.json"),
      }),
    ],
    server: { host: true },
    preview: { host: true },
  };
});
