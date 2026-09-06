import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// Open the dev server in Chrome (Vite reads process.env.BROWSER when server.open is set).
process.env.BROWSER ??= "chrome";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    open: true,
  },
});
