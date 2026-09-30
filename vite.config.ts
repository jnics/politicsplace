import { reactRouter } from "@react-router/dev/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Open the dev server in Chrome (Vite reads process.env.BROWSER when server.open is set).
process.env.BROWSER ??= "chrome";

export default defineConfig({
  // cloudflare() must come before reactRouter() -- it sets up the Workers
  // runtime (and local D1/binding access) that reactRouter()'s SSR build then
  // targets. `pnpm dev` behaves exactly as before otherwise: same Vite dev
  // server, same HMR, this only adds the binding access on top.
  plugins: [cloudflare({ viteEnvironment: { name: "ssr" } }), tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    open: true,
    // `.rcp-profile/` is the Chromium profile scripts/pull-polls.mjs drives;
    // Vite's file watcher chokes on its locked session files (EBUSY on Windows).
    watch: { ignored: ["**/.rcp-profile/**"] },
  },
});
