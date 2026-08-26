import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");

export default defineConfig({
  // Surfaced on the title screen so it is always possible to tell which build
  // a browser is actually running.
  define: { __BUILD_STAMP__: JSON.stringify(stamp) },
  base: "/venture-forge/",
  plugins: [react()],
  test: { environment: "node", include: ["src/test/**/*.test.ts"] },
});
