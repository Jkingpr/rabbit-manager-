import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { mochaPlugins } from "@getmocha/vite-plugins";

const workerdPath = path.resolve(
  __dirname,
  "node_modules/@cloudflare/workerd-linux-64/bin/workerd"
);
process.env.MINIFLARE_WORKERD_PATH = workerdPath;

export default defineConfig({
  plugins: [react(), cloudflare(), mochaPlugins({})],
  server: {
    allowedHosts: true,
  },
  build: {
    chunkSizeWarningLimit: 5000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
