import { createRequestHandler, RouterContextProvider } from "react-router";
import { cloudflareContext } from "~/lib/context.server";
import { ALL_BOARD_RACES } from "~/data/bigBoard2026";
import { syncBoardFromFeed } from "~/lib/civicFeed.server";
import { OHIO_FEED_OPENS_AT, syncOhioFromFeed } from "~/lib/ohioFeed.server";

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
    // Ohio SOS feed for the OH-State tab, from 8:15 PM ET.
    if (Date.now() >= Date.parse(OHIO_FEED_OPENS_AT))
      ctx.waitUntil(
        syncOhioFromFeed(env.DB).then(
          (r) => console.log(`Ohio SOS sync: ${r.contests} contests${r.isTest ? " (test file)" : ""}`),
          (e) => console.error("Ohio SOS sync failed:", e)
        )
      );
  },
} satisfies ExportedHandler<Env>;
