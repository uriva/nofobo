import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import process from "node:process";

// Get the commit hash
let commitHash = process.env.RENDER_GIT_COMMIT || "";
if (!commitHash) {
  try {
    commitHash = execSync("git rev-parse HEAD").toString().trim();
  } catch {
    commitHash = "unknown";
  }
}
process.env.VITE_COMMIT_HASH = commitHash;

export default defineConfig({
  plugins: [react()],
  root: "./web",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
