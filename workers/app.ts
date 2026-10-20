import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context.server";
import { ALL_BOARD_RACES } from "~/data/bigBoard2026";
import { syncBoardFromFeed } from "~/lib/civicFeed.server";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });
    return requestHandler(request, context);
  },
  // Election-night results feed for /election2026 — wrangler.jsonc's
  // `triggers.crons` sets when this runs.
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      syncBoardFromFeed(env.DB, ALL_BOARD_RACES).then(
        (r) => console.log(`civicAPI sync: ${r.updated} races updated, ${r.missing} not in feed`),
        (e) => console.error("civicAPI sync failed:", e)
      )
    );
  },
} satisfies ExportedHandler<Env>;
