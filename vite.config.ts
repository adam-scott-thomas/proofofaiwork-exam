import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_API_BASE_URL || "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      // Proxy /api → backend during local dev so the frontend can call /api/v1/...
      // without CORS hassles. Production runs against the real
      // proofofaiwork.com API and does not use this proxy.
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      target: "es2022",
      sourcemap: true,
      outDir: "dist",
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  };
});
