import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// The dev server proxies /api (and the SEO endpoints) to the Express backend,
// so the browser talks to one origin and session cookies just work.
const API = process.env.API_URL || "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: API, changeOrigin: true },
      "/sitemap.xml": { target: API, changeOrigin: true },
      "/sitemap-uk.xml": { target: API, changeOrigin: true },
      "/sitemap-us.xml": { target: API, changeOrigin: true },
      "/robots.txt": { target: API, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
