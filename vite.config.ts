import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { threeThingsApi } from "./server/api";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const effort = env.DISTILL_EFFORT;

  return {
    plugins: [
      react(),
      threeThingsApi({
        apiKey: env.ANTHROPIC_API_KEY || undefined,
        effort: effort === "low" || effort === "high" ? effort : "medium",
      }),
    ],
    server: { host: true },
    preview: { host: true },
  };
});
