import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  publicDir: process.env.VITE_MEDIA_BASE_URL ? false : "public",
  plugins: [react()],
  server: {
    allowedHosts: true,
    proxy: {
      "/api": "http://localhost:4174",
    },
  },
});
