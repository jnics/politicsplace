import type { Route } from "./+types/results.version";
import { cloudflareContext } from "~/lib/context.server";
import { readOh7Version } from "~/lib/oh7.server";

/** Change stamp for /results's auto-refresh. Resource route (no UI). */
export async function loader({ context }: Route.LoaderArgs) {
  const version = await readOh7Version(context.get(cloudflareContext).env.DB);
  return Response.json({ version }, { headers: { "Cache-Control": "no-store" } });
}
